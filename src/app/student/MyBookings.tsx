import { CalendarX2, MapPin } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { rules } from "../../config";
import { useApp, useUser } from "../../context/AppContext";
import { data, DomainError, type Booking, type ClassSlot } from "../../data";
import { cancellationOutcome } from "../../domain/booking";
import { DAY, fmtDayLong, fmtTime } from "../../domain/time";
import { toast, useQuery } from "../../lib/ui-state";
import { Badge, Empty, Modal, PageHeader, Segmented, Skeleton } from "../../components/ui";
import { bookingStatus } from "../status";

export function MyBookings() {
  const user = useUser();
  const { now } = useApp();
  const [tab, setTab] = useState<"next" | "history">("next");
  const [cancelling, setCancelling] = useState<{ b: Booking; s: ClassSlot } | null>(null);
  const [busy, setBusy] = useState(false);
  const bookings = useQuery(`bk:${user.id}`, () => data.getBookings({ userId: user.id }));
  const slots = useQuery("slots:all-mine", () => data.getSlots({ from: new Date(now.getTime() - 120 * DAY), to: new Date(now.getTime() + 60 * DAY) }));
  const packs = useQuery(`packs:${user.id}`, () => data.getUserPacks(user.id));
  const courts = useQuery("courts", () => data.getCourts());
  const coaches = useQuery("coaches", () => data.getUsers({ role: "coach" }));

  const bySlot = new Map(slots.data?.map((s) => [s.id, s]));
  const rows = (bookings.data ?? []).map((b) => ({ b, s: bySlot.get(b.slotId)! })).filter((x) => x.s);
  const upcoming = rows.filter((x) => x.b.status === "confirmed" && new Date(x.s.startsAt) > now).sort((a, b) => a.s.startsAt.localeCompare(b.s.startsAt));
  const history = rows.filter((x) => !upcoming.includes(x)).sort((a, b) => b.s.startsAt.localeCompare(a.s.startsAt));
  const list = tab === "next" ? upcoming : history;

  const outcome = cancelling && cancellationOutcome(cancelling.s, packs.data?.find((p) => p.id === cancelling.b.userPackId), now);

  const confirmCancel = async () => {
    if (!cancelling) return;
    setBusy(true);
    try {
      await data.cancelBooking(cancelling.b.id);
      setCancelling(null);
    } catch (e) {
      toast("No se pudo cancelar", { body: (e as DomainError).message, tone: "err" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Mis reservas" subtitle={`Cancela con ${rules.cancellationHours} h o más de anticipación y recuperas el crédito.`} />
      <div className="mb-5">
        <Segmented
          label="Reservas"
          value={tab}
          onChange={setTab}
          options={[
            { value: "next", label: `Próximas (${upcoming.length})` },
            { value: "history", label: "Historial" },
          ]}
        />
      </div>

      {bookings.loading || slots.loading ? (
        <div className="grid gap-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : !list.length ? (
        <Empty icon={<CalendarX2 size={36} />} title={tab === "next" ? "No tienes clases reservadas" : "Todavía no tienes historial"}>
          <Link to="/app/alumno/reservar" className="btn-ball mt-3">
            Reserva tu clase
          </Link>
        </Empty>
      ) : (
        <ul className="grid gap-3">
          {list.map(({ b, s }) => {
            const st = bookingStatus(b, s.startsAt, now);
            return (
              <li key={b.id} className="card flex flex-wrap items-center gap-4 p-4 sm:p-5">
                <div className="w-16 shrink-0 text-center">
                  <p className="display text-3xl">{fmtTime(s.startsAt)}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold first-letter:uppercase">{fmtDayLong(s.startsAt)}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-muted">
                    <span>{s.level}</span>·<span>{coaches.data?.find((c) => c.id === s.coachId)?.name}</span>·
                    <span className="flex items-center gap-1"><MapPin size={13} aria-hidden />{courts.data?.find((c) => c.id === s.courtId)?.name}</span>
                  </p>
                </div>
                <Badge tone={st.tone}>{st.label}</Badge>
                {tab === "next" && (
                  <button type="button" className="btn-danger px-4 py-2" onClick={() => setCancelling({ b, s })}>
                    Cancelar
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={!!cancelling}
        onClose={() => setCancelling(null)}
        title="Cancelar reserva"
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setCancelling(null)}>
              Mantener reserva
            </button>
            <button type="button" className="btn-danger" onClick={confirmCancel} disabled={busy || !outcome?.allowed}>
              {busy ? "Cancelando…" : "Sí, cancelar"}
            </button>
          </>
        }
      >
        {cancelling && outcome && (
          <div className="space-y-4">
            <p>
              Clase del <strong>{fmtDayLong(cancelling.s.startsAt)}</strong> a las <strong>{fmtTime(cancelling.s.startsAt)}</strong>.
            </p>
            <div className={`rounded-2xl p-4 text-sm ${outcome.refund ? "bg-ok/10 text-ok" : "bg-warn/10 text-warn"}`}>
              {outcome.refund
                ? `Faltan ${Math.floor(outcome.hoursLeft)} h: te devolvemos el crédito a tu pack.`
                : `Faltan menos de ${rules.cancellationHours} h para la clase (o tu pack ya venció): si cancelas, el crédito no se devuelve.`}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
