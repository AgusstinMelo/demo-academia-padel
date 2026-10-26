import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { confirmedIn } from "../../domain/booking";
import { addDaysTz, fmt, fmtTime, isoDay, startOfWeekTz } from "../../domain/time";
import { Avatar, Modal, PageHeader, Skeleton } from "../../components/ui";
import type { ClassSlot } from "../../data";
import { useAdminData, userName } from "./shared";

export default function BookingsCalendar() {
  const { slots, bookings, users, courts, now, loading } = useAdminData();
  const [week, setWeek] = useState(0);
  const [open, setOpen] = useState<ClassSlot | null>(null);
  const weekStart = useMemo(() => addDaysTz(startOfWeekTz(now), week * 7), [now, week]);
  const days = Array.from({ length: 7 }, (_, i) => addDaysTz(weekStart, i));
  const weekSlots = slots.filter((s) => days.some((d) => isoDay(d) === isoDay(s.startsAt)));
  const hours = [...new Set(weekSlots.map((s) => fmtTime(s.startsAt)))].sort();

  return (
    <>
      <PageHeader title="Reservas" subtitle="Todas las clases de la semana con su ocupación. Toca una clase para ver los inscritos." />
      <div className="mb-5 flex items-center gap-2">
        <button type="button" className="grid size-10 place-items-center rounded-full border border-line" onClick={() => setWeek((w) => w - 1)} aria-label="Semana anterior">
          <ChevronLeft size={18} />
        </button>
        <p className="min-w-44 text-center font-bold">
          {fmt(days[0], "d MMM")} – {fmt(days[6], "d MMM yyyy")}
        </p>
        <button type="button" className="grid size-10 place-items-center rounded-full border border-line" onClick={() => setWeek((w) => w + 1)} aria-label="Semana siguiente">
          <ChevronRight size={18} />
        </button>
      </div>

      {loading ? (
        <Skeleton className="h-96" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[860px] table-fixed text-xs">
            <thead>
              <tr className="border-b border-line">
                <th className="w-16 p-2 text-left text-muted">Hora</th>
                {days.map((d) => (
                  <th key={isoDay(d)} className={`p-2 text-left font-bold first-letter:uppercase ${isoDay(d) === isoDay(now) ? "text-ball-text" : ""}`}>
                    {fmt(d, "EEE d")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hours.map((h) => (
                <tr key={h} className="border-b border-line last:border-0">
                  <td className="p-2 font-bold text-muted tabular-nums">{h}</td>
                  {days.map((d) => {
                    const cell = weekSlots.filter((s) => isoDay(s.startsAt) === isoDay(d) && fmtTime(s.startsAt) === h);
                    return (
                      <td key={isoDay(d)} className="p-1 align-top">
                        {cell.map((s) => {
                          const n = confirmedIn(s.id, bookings).length;
                          const pct = n / s.capacity;
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => setOpen(s)}
                              className={`mb-1 w-full rounded-lg p-2 text-left transition hover:ring-2 hover:ring-court ${pct >= 1 ? "bg-ball text-ball-ink" : pct >= 0.5 ? "bg-court/25" : "bg-surface-2"}`}
                            >
                              <span className="block truncate font-bold">{s.level}</span>
                              <span className="block opacity-80">
                                {n}/{s.capacity} · {userName(users, s.coachId).split(" ")[0]}
                              </span>
                            </button>
                          );
                        })}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-surface-2" /> Menos de la mitad</span>
        <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-court/25" /> Media o más</span>
        <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-ball" /> Llena</span>
      </p>

      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? `${open.level} · ${fmt(open.startsAt, "EEEE d 'de' MMMM, HH:mm")}` : ""}>
        {open && (
          <>
            <p className="mb-4 text-sm text-muted">
              {userName(users, open.coachId)} · {courts.find((c) => c.id === open.courtId)?.name}
            </p>
            <ul className="space-y-2">
              {confirmedIn(open.id, bookings).map((b) => (
                <li key={b.id} className="flex items-center gap-3 rounded-xl bg-surface-2/60 p-2.5">
                  <Avatar name={userName(users, b.userId)} size={32} />
                  <span className="flex-1 font-bold">{userName(users, b.userId)}</span>
                  {b.attendance && <span className={`text-xs font-bold ${b.attendance === "present" ? "text-ok" : "text-bad"}`}>{b.attendance === "present" ? "Asistió" : "Ausente"}</span>}
                </li>
              ))}
              {Array.from({ length: open.capacity - confirmedIn(open.id, bookings).length }, (_, i) => (
                <li key={i} className="rounded-xl border border-dashed border-line p-2.5 text-center text-sm text-muted">
                  Cupo libre
                </li>
              ))}
            </ul>
          </>
        )}
      </Modal>
    </>
  );
}
