import { AlertTriangle, ArrowRight, Bell, CalendarPlus, Clock, MapPin, Ticket } from "lucide-react";
import { Link } from "react-router";
import { rules } from "../../config";
import { useApp, useUser } from "../../context/AppContext";
import { data } from "../../data";
import { availableCredits, daysToExpiry, isExpiringSoon, packDef, packStatus, packToConsume } from "../../domain/credits";
import { fmtDayLong, fmtTime, HOUR } from "../../domain/time";
import { useQuery } from "../../lib/ui-state";
import { Avatar, Skeleton } from "../../components/ui";

/** Anillo de créditos: lleno = créditos disponibles del pack actual */
function CreditRing({ value, total }: { value: number; total: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const pct = total ? value / total : 0;
  return (
    <svg viewBox="0 0 120 120" className="size-32 shrink-0 -rotate-90" role="img" aria-label={`${value} de ${total} créditos disponibles`}>
      <circle cx="60" cy="60" r={r} fill="none" stroke="var(--c-line)" strokeWidth="10" />
      <circle cx="60" cy="60" r={r} fill="none" stroke="var(--c-ball)" strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} style={{ transition: "stroke-dashoffset .8s var(--ease-out)" }} />
    </svg>
  );
}

function countdown(to: string, now: Date) {
  const ms = Math.max(0, new Date(to).getTime() - now.getTime());
  const d = Math.floor(ms / (24 * HOUR));
  const h = Math.floor((ms % (24 * HOUR)) / HOUR);
  return { d, h };
}

export function StudentHome() {
  const user = useUser();
  const { now } = useApp();
  const packs = useQuery(`packs:${user.id}`, () => data.getUserPacks(user.id));
  const bookings = useQuery(`bk:${user.id}`, () => data.getBookings({ userId: user.id }));
  const slots = useQuery("slots:next", () => data.getSlots({ from: new Date(now.getTime() - 60 * 24 * HOUR), to: new Date(now.getTime() + 30 * 24 * HOUR) }));
  const coaches = useQuery("coaches", () => data.getUsers({ role: "coach" }));
  const courts = useQuery("courts", () => data.getCourts());

  const list = packs.data ?? [];
  const credits = availableCredits(list, now);
  const current = packToConsume(list, now);
  const pending = list.find((p) => packStatus(p, now) === "pending");
  const expiring = current && isExpiringSoon(current, now);
  const left = current?.expiresAt ? countdown(current.expiresAt, now) : null;

  const bySlot = new Map(slots.data?.map((s) => [s.id, s]));
  const next = (bookings.data ?? [])
    .filter((b) => b.status === "confirmed")
    .map((b) => ({ b, s: bySlot.get(b.slotId) }))
    .filter((x) => x.s && new Date(x.s.startsAt) > now)
    .sort((a, b) => a.s!.startsAt.localeCompare(b.s!.startsAt))[0];
  const coach = next && coaches.data?.find((c) => c.id === next.s!.coachId);
  const court = next && courts.data?.find((c) => c.id === next.s!.courtId);
  const loading = packs.loading || bookings.loading || slots.loading;

  return (
    <>
      <p className="label-caps text-muted">Hola, {user.name.split(" ")[0]}</p>
      <h1 className="display mt-1 text-5xl sm:text-6xl">Tu pádel</h1>

      {expiring && current && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-warn/40 bg-warn/10 p-4" role="alert">
          <AlertTriangle className="mt-0.5 shrink-0 text-warn" size={20} aria-hidden />
          <p className="text-sm">
            <strong>Tu pack vence {daysToExpiry(current, now) === 0 ? "hoy" : daysToExpiry(current, now) === 1 ? "mañana" : `en ${daysToExpiry(current, now)} días`}.</strong> Te{" "}
            {current.remaining === 1 ? "queda 1 clase" : `quedan ${current.remaining} clases`}: resérvalas antes de que venzan.
          </p>
        </div>
      )}
      {pending && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-info/40 bg-info/10 p-4" role="status">
          <Clock className="mt-0.5 shrink-0 text-info" size={20} aria-hidden />
          <p className="text-sm">
            <strong>Tu {packDef(pending.packId).name} está pendiente de confirmación.</strong> Se activa en cuanto validemos tu comprobante.
          </p>
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        {/* Créditos */}
        <section className="card relative overflow-hidden p-5 sm:p-6" aria-labelledby="credits-title">
          <div className="glow -top-24 -right-24 size-72" aria-hidden />
          <h2 id="credits-title" className="label-caps text-muted">
            Créditos disponibles
          </h2>
          {loading ? (
            <Skeleton className="mt-4 h-32" />
          ) : (
            <div className="relative mt-4 flex items-center gap-6">
              <div className="relative">
                <CreditRing value={current?.remaining ?? 0} total={current?.credits ?? 1} />
                <span className="display absolute inset-0 grid place-items-center text-5xl">{credits}</span>
              </div>
              <div className="min-w-0">
                {current ? (
                  <>
                    <p className="text-lg font-extrabold">{packDef(current.packId).name}</p>
                    <p className="text-sm text-muted">
                      {current.remaining} de {current.credits} clases disponibles
                    </p>
                    {left && (
                      <div className="mt-3">
                        <p className="text-xs text-muted">Vence en</p>
                        <p className={`display text-3xl tabular-nums ${expiring ? "text-warn" : ""}`}>
                          {left.d} d {left.h} h
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-lg font-extrabold">Sin créditos activos</p>
                    <p className="text-sm text-muted">Elige un pack para empezar a reservar. Es válido por {rules.packValidityDays} días.</p>
                    <Link to="/app/alumno/packs" className="btn-ball mt-3">
                      Elige tu pack <ArrowRight size={16} aria-hidden />
                    </Link>
                  </>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Próxima clase */}
        <section className="card p-5 sm:p-6" aria-labelledby="next-title">
          <h2 id="next-title" className="label-caps text-muted">
            Próxima clase
          </h2>
          {loading ? (
            <Skeleton className="mt-4 h-32" />
          ) : next ? (
            <div className="mt-4">
              <p className="display text-4xl">{fmtTime(next.s!.startsAt)}</p>
              <p className="font-bold first-letter:uppercase">{fmtDayLong(next.s!.startsAt)}</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                <MapPin size={14} aria-hidden /> {court?.name} · {next.s!.level}
              </p>
              {coach && (
                <p className="mt-4 flex items-center gap-3 text-sm">
                  <Avatar name={coach.name} photo={coach.coach?.photo} size={36} /> Con {coach.name}
                </p>
              )}
            </div>
          ) : (
            <div className="mt-4">
              <p className="font-bold">No tienes clases reservadas</p>
              <p className="text-sm text-muted">Mira los horarios disponibles de esta semana.</p>
            </div>
          )}
          <Link to="/app/alumno/reservas" className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-ball-text">
            Ver mis reservas <ArrowRight size={14} aria-hidden />
          </Link>
        </section>
      </div>

      {/* Accesos rápidos */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        {[
          { to: "/app/alumno/reservar", label: "Reservar clase", icon: CalendarPlus, primary: true },
          { to: "/app/alumno/packs", label: "Comprar pack", icon: Ticket },
          { to: "/app/notificaciones", label: "Avisos", icon: Bell },
        ].map(({ to, label, icon: Icon, primary }) => (
          <Link key={to} to={to} className={`flex flex-col items-start gap-3 rounded-card p-4 font-bold transition sm:p-5 ${primary ? "bg-ball text-ball-ink hover:brightness-105" : "card hover:bg-surface-2"}`}>
            <Icon size={22} aria-hidden />
            <span className="text-sm sm:text-base">{label}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
