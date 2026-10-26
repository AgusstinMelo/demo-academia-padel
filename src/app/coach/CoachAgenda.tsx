import { Check, ChevronLeft, ChevronRight, MapPin, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useApp, useUser } from "../../context/AppContext";
import { data, type Attendance, type Booking, type User } from "../../data";
import { confirmedIn } from "../../domain/booking";
import { availableCredits } from "../../domain/credits";
import { addDaysTz, DAY, fmt, fmtTime, isoDay, startOfDayTz, startOfWeekTz } from "../../domain/time";
import { useQuery } from "../../lib/ui-state";
import { Avatar, Badge, Empty, Modal, PageHeader, Segmented, Skeleton } from "../../components/ui";

export default function CoachAgenda() {
  const me = useUser();
  const { now } = useApp();
  const [view, setView] = useState<"day" | "week">("day");
  const [offset, setOffset] = useState(0);
  const [profile, setProfile] = useState<User | null>(null);

  const start = useMemo(() => (view === "day" ? addDaysTz(startOfDayTz(now), offset) : addDaysTz(startOfWeekTz(now), offset * 7)), [view, offset, now]);
  const end = new Date(start.getTime() + (view === "day" ? 1 : 7) * DAY);
  const slots = useQuery(`coach:${isoDay(start)}:${view}`, () => data.getSlots({ from: start, to: end }));
  const mine = (slots.data ?? []).filter((s) => s.coachId === me.id);
  const bookings = useQuery(`coach-bk:${mine.map((s) => s.id).join()}`, () => data.getBookings({ slotIds: mine.map((s) => s.id) }));
  const users = useQuery("users", () => data.getUsers());
  const courts = useQuery("courts", () => data.getCourts());
  // Para el perfil: historial y créditos del alumno
  const profileBookings = useQuery(`profile-bk:${profile?.id}`, () => (profile ? data.getBookings({ userId: profile.id }) : Promise.resolve([])));
  const profilePacks = useQuery(`profile-packs:${profile?.id}`, () => (profile ? data.getUserPacks(profile.id) : Promise.resolve([])));

  const mark = (b: Booking, a: Attendance) => data.setAttendance(b.id, b.attendance === a ? null : a);
  const user = (id: string) => users.data?.find((u) => u.id === id);
  const total = mine.reduce((s, x) => s + confirmedIn(x.id, bookings.data ?? []).length, 0);

  const attended = (profileBookings.data ?? []).filter((b) => b.attendance);
  const rate = attended.length ? attended.filter((b) => b.attendance === "present").length / attended.length : 0;

  return (
    <>
      <PageHeader title="Mi agenda" subtitle={`${mine.length} ${mine.length === 1 ? "clase" : "clases"} · ${total} alumnos inscritos`} />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Segmented
          label="Vista"
          value={view}
          onChange={(v) => (setView(v), setOffset(0))}
          options={[
            { value: "day", label: "Día" },
            { value: "week", label: "Semana" },
          ]}
        />
        <div className="flex items-center gap-2">
          <button type="button" className="grid size-10 place-items-center rounded-full border border-line" onClick={() => setOffset((o) => o - 1)} aria-label="Anterior">
            <ChevronLeft size={18} />
          </button>
          <p className="min-w-44 text-center font-bold first-letter:uppercase">
            {view === "day" ? fmt(start, "EEEE d 'de' MMMM") : `${fmt(start, "d MMM")} – ${fmt(new Date(end.getTime() - 1), "d MMM")}`}
          </p>
          <button type="button" className="grid size-10 place-items-center rounded-full border border-line" onClick={() => setOffset((o) => o + 1)} aria-label="Siguiente">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {slots.loading || bookings.loading ? (
        <div className="grid gap-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-40" />)}</div>
      ) : !mine.length ? (
        <Empty title="No tienes clases en este período" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {mine.map((s) => {
            const enrolled = confirmedIn(s.id, bookings.data ?? []);
            const started = new Date(s.startsAt) <= now;
            return (
              <section key={s.id} className="card p-5">
                <header className="flex items-start justify-between gap-3">
                  <div>
                    <p className="display text-4xl">{fmtTime(s.startsAt)}</p>
                    <p className="font-bold first-letter:uppercase">
                      {view === "week" && `${fmt(s.startsAt, "EEEE d")} · `}
                      {s.level}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-sm text-muted">
                      <MapPin size={13} aria-hidden /> {courts.data?.find((c) => c.id === s.courtId)?.name}
                    </p>
                  </div>
                  <Badge tone={enrolled.length >= s.capacity ? "ball" : "neutral"}>
                    {enrolled.length}/{s.capacity} alumnos
                  </Badge>
                </header>
                <ul className="mt-4 space-y-2">
                  {enrolled.map((b) => {
                    const u = user(b.userId);
                    return (
                      <li key={b.id} className="flex items-center gap-3 rounded-2xl bg-surface-2/60 p-2.5">
                        <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => u && setProfile(u)}>
                          <Avatar name={u?.name ?? "?"} size={34} />
                          <span className="min-w-0">
                            <span className="block truncate font-bold underline-offset-4 hover:underline">{u?.name}</span>
                            <span className="text-xs text-muted">Nivel {u?.level}</span>
                          </span>
                        </button>
                        {started ? (
                          <span className="flex gap-1.5" role="group" aria-label={`Asistencia de ${u?.name}`}>
                            <button
                              type="button"
                              aria-pressed={b.attendance === "present"}
                              onClick={() => mark(b, "present")}
                              className={`grid size-9 place-items-center rounded-full border transition ${b.attendance === "present" ? "border-ok bg-ok text-white" : "border-line text-muted hover:text-ok"}`}
                              aria-label="Presente"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              type="button"
                              aria-pressed={b.attendance === "absent"}
                              onClick={() => mark(b, "absent")}
                              className={`grid size-9 place-items-center rounded-full border transition ${b.attendance === "absent" ? "border-bad bg-bad text-white" : "border-line text-muted hover:text-bad"}`}
                              aria-label="Ausente"
                            >
                              <X size={16} />
                            </button>
                          </span>
                        ) : (
                          <span className="text-xs text-muted">Asistencia al empezar</span>
                        )}
                      </li>
                    );
                  })}
                  {!enrolled.length && <li className="rounded-2xl border border-dashed border-line p-3 text-center text-sm text-muted">Sin inscritos todavía</li>}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <Modal open={!!profile} onClose={() => setProfile(null)} title="Perfil del alumno">
        {profile && (
          <div>
            <div className="flex items-center gap-4">
              <Avatar name={profile.name} size={60} />
              <div>
                <p className="text-xl font-extrabold">{profile.name}</p>
                <p className="text-sm text-muted">{profile.phone}</p>
              </div>
            </div>
            <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl bg-surface-2 p-3">
                <dt className="text-xs text-muted">Nivel</dt>
                <dd className="mt-1 font-extrabold">{profile.level}</dd>
              </div>
              <div className="rounded-2xl bg-surface-2 p-3">
                <dt className="text-xs text-muted">Asistencia</dt>
                <dd className="display mt-1 text-2xl">{attended.length ? `${Math.round(rate * 100)}%` : "—"}</dd>
              </div>
              <div className="rounded-2xl bg-surface-2 p-3">
                <dt className="text-xs text-muted">Créditos</dt>
                <dd className="display mt-1 text-2xl">{availableCredits(profilePacks.data ?? [], now)}</dd>
              </div>
            </dl>
            <p className="mt-4 text-sm text-muted">{attended.length} clases registradas con asistencia.</p>
          </div>
        )}
      </Modal>
    </>
  );
}
