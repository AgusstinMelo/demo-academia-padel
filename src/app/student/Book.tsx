import { CheckCircle2, ChevronLeft, ChevronRight, MapPin, Users, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { levels, rules, type Level } from "../../config";
import { useApp, useUser } from "../../context/AppContext";
import { data, DomainError, type ClassSlot } from "../../data";
import { spotsLeft } from "../../domain/booking";
import { availableCredits, packToConsume } from "../../domain/credits";
import { addDaysTz, DAY, fmt, fmtDayLong, fmtTime, isoDay, startOfWeekTz } from "../../domain/time";
import { useQuery } from "../../lib/ui-state";
import { Avatar, Badge, Modal, PageHeader, Segmented, Skeleton } from "../../components/ui";

type Outcome = { ok: true } | { ok: false; code: string; message: string };

export function Book() {
  const user = useUser();
  const { now } = useApp();
  const [week, setWeek] = useState(0); // 0 = esta semana, 1 = la próxima
  const [level, setLevel] = useState<Level | "all">(user.level);
  const weekStart = useMemo(() => addDaysTz(startOfWeekTz(now), week * 7), [now, week]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDaysTz(weekStart, i)), [weekStart]);
  const [day, setDay] = useState(() => isoDay(now));
  const [selected, setSelected] = useState<ClassSlot | null>(null);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const from = weekStart;
  const to = new Date(weekStart.getTime() + 7 * DAY);
  // Polling cada 15 s: los cupos se actualizan solos (en producción: canal en tiempo real de Supabase)
  const slots = useQuery(`slots:${isoDay(from)}`, () => data.getSlots({ from, to }), { pollMs: 15000 });
  const ids = slots.data?.map((s) => s.id) ?? [];
  const bookings = useQuery(`bookings:${ids.length}:${isoDay(from)}`, () => data.getBookings({ slotIds: ids }), { pollMs: 15000 });
  const packs = useQuery(`packs:${user.id}`, () => data.getUserPacks(user.id));
  const coaches = useQuery("coaches", () => data.getUsers({ role: "coach" }));
  const courts = useQuery("courts", () => data.getCourts());

  const credits = availableCredits(packs.data ?? [], now);
  const visible = (slots.data ?? []).filter((s) => level === "all" || s.level === level);
  const coachName = (id: string) => coaches.data?.find((c) => c.id === id);
  const courtName = (id: string) => courts.data?.find((c) => c.id === id)?.name ?? "";
  const mine = (s: ClassSlot) => bookings.data?.some((b) => b.slotId === s.id && b.userId === user.id && b.status === "confirmed");

  // Al cambiar de semana, en el celular se muestra el primer día de esa semana (o hoy)
  const changeWeek = (delta: number) => {
    const next = week + delta;
    setWeek(next);
    setDay(next === 0 ? isoDay(now) : isoDay(addDaysTz(startOfWeekTz(now), next * 7)));
  };

  const book = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await data.createBooking(selected.id);
      setOutcome({ ok: true });
    } catch (e) {
      const err = e as DomainError;
      setOutcome({ ok: false, code: err.code, message: err.message });
    } finally {
      setBusy(false);
    }
  };
  const close = () => {
    setSelected(null);
    setOutcome(null);
  };

  const slotCard = (s: ClassSlot) => {
    const left = bookings.data ? spotsLeft(s, bookings.data) : null;
    const past = new Date(s.startsAt) <= now;
    const isMine = mine(s);
    const full = left === 0;
    const coach = coachName(s.coachId);
    const disabled = past || full || isMine || left === null;
    return (
      <button
        key={s.id}
        type="button"
        onClick={() => setSelected(s)}
        disabled={disabled}
        className={`card w-full p-4 text-left transition ${isMine ? "border-ball/60 bg-ball/10" : disabled ? "opacity-55" : "hover:-translate-y-0.5 hover:border-court/60"}`}
        aria-label={`${fmtTime(s.startsAt)}, ${s.level}, ${left ?? "?"} cupos${isMine ? ", ya reservada" : ""}`}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="display text-3xl">{fmtTime(s.startsAt)}</span>
          {isMine ? <Badge tone="ball">Reservada</Badge> : past ? <Badge>Pasada</Badge> : full ? <Badge tone="bad">Llena</Badge> : <Badge tone={left === 1 ? "warn" : "ok"}>{left === 1 ? "Último cupo" : `${left} cupos`}</Badge>}
        </div>
        <p className="mt-1 text-sm font-bold">{s.level}</p>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted">
          {coach && <Avatar name={coach.name} photo={coach.coach?.photo} size={22} />}
          <span className="truncate">{coach?.name.split(" ")[0]}</span>
          <span aria-hidden>·</span>
          <span className="truncate">{courtName(s.courtId)}</span>
        </div>
        {left !== null && (
          <div className="mt-3 flex gap-1" aria-hidden>
            {Array.from({ length: s.capacity }, (_, i) => (
              <span key={i} className={`h-1.5 flex-1 rounded-full ${i < s.capacity - left ? "bg-court" : "bg-line"}`} />
            ))}
          </div>
        )}
      </button>
    );
  };

  const consume = packToConsume(packs.data ?? [], now);
  const coach = selected && coachName(selected.coachId);

  return (
    <>
      <PageHeader
        title="Reservar"
        subtitle={
          <>
            Tienes <strong className="text-text">{credits} {credits === 1 ? "crédito" : "créditos"}</strong>. Los cupos se actualizan en tiempo real.
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" className="grid size-10 place-items-center rounded-full border border-line disabled:opacity-40" onClick={() => changeWeek(-1)} disabled={week === 0} aria-label="Semana anterior">
            <ChevronLeft size={18} />
          </button>
          <p className="min-w-40 text-center font-bold first-letter:uppercase">
            {fmt(days[0], "d MMM")} – {fmt(days[6], "d MMM")}
          </p>
          <button type="button" className="grid size-10 place-items-center rounded-full border border-line disabled:opacity-40" onClick={() => changeWeek(1)} disabled={(week + 1) * 7 > rules.bookingWindowDays} aria-label="Semana siguiente">
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <Segmented label="Nivel" size="sm" value={level} onChange={setLevel} options={[{ value: "all" as const, label: "Todos" }, ...levels.map((l) => ({ value: l, label: l }))]} />
        </div>
      </div>

      {/* Celular: un día a la vez */}
      <div className="lg:hidden">
        <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4" role="tablist" aria-label="Día">
          {days.map((d) => {
            const key = isoDay(d);
            const count = visible.filter((s) => isoDay(s.startsAt) === key).length;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={day === key}
                onClick={() => setDay(key)}
                className={`flex w-14 shrink-0 flex-col items-center rounded-2xl border py-2 transition ${day === key ? "border-ball bg-ball text-ball-ink" : "border-line"}`}
              >
                <span className="text-[11px] font-bold uppercase">{fmt(d, "EEE")}</span>
                <span className="display text-2xl">{fmt(d, "d")}</span>
                <span className={`text-[10px] ${day === key ? "" : "text-muted"}`}>{count} clases</span>
              </button>
            );
          })}
        </div>
        <div className="grid gap-3">
          {slots.loading
            ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-32" />)
            : visible.filter((s) => isoDay(s.startsAt) === day).map(slotCard)}
          {!slots.loading && !visible.some((s) => isoDay(s.startsAt) === day) && <p className="card p-6 text-center text-sm text-muted">No hay clases de este nivel este día.</p>}
        </div>
      </div>

      {/* Desktop: semana completa */}
      <div className="hidden grid-cols-7 gap-3 lg:grid">
        {days.map((d) => {
          const key = isoDay(d);
          const daySlots = visible.filter((s) => isoDay(s.startsAt) === key);
          return (
            <div key={key} className="min-w-0">
              <p className={`mb-3 rounded-2xl py-2 text-center ${key === isoDay(now) ? "bg-ball text-ball-ink" : "bg-surface-2"}`}>
                <span className="block text-xs font-bold uppercase">{fmt(d, "EEEE")}</span>
                <span className="display text-2xl">{fmt(d, "d MMM")}</span>
              </p>
              <div className="grid gap-2.5">
                {slots.loading ? Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-32" />) : daySlots.map(slotCard)}
                {!slots.loading && !daySlots.length && <p className="py-6 text-center text-xs text-muted">Sin clases</p>}
              </div>
            </div>
          );
        })}
      </div>

      <Modal
        open={!!selected}
        onClose={close}
        title={outcome ? (outcome.ok ? "¡Reserva confirmada!" : "Reserva no disponible") : "Confirmar reserva"}
        footer={
          outcome ? (
            outcome.ok ? (
              <>
                <button type="button" className="btn-ghost" onClick={close}>
                  Seguir reservando
                </button>
                <Link to="/app/alumno/reservas" className="btn-ball">
                  Ver mis reservas
                </Link>
              </>
            ) : ["NO_CREDITS", "PACK_EXPIRED"].includes(outcome.code) ? (
              <Link to="/app/alumno/packs" className="btn-ball">
                Elige tu pack
              </Link>
            ) : (
              <button type="button" className="btn-ghost" onClick={close}>
                Elegir otro horario
              </button>
            )
          ) : (
            <>
              <button type="button" className="btn-ghost" onClick={close}>
                Cancelar
              </button>
              <button type="button" className="btn-ball" onClick={book} disabled={busy}>
                {busy ? "Reservando…" : "Confirmar reserva"}
              </button>
            </>
          )
        }
      >
        {selected && !outcome && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-surface-2 p-4">
              <p className="display text-4xl">{fmtTime(selected.startsAt)}</p>
              <p className="font-bold first-letter:uppercase">{fmtDayLong(selected.startsAt)}</p>
              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                <span className="flex items-center gap-1"><MapPin size={14} aria-hidden /> {courtName(selected.courtId)}</span>
                <span className="flex items-center gap-1"><Users size={14} aria-hidden /> {selected.level}</span>
              </p>
              {coach && (
                <p className="mt-3 flex items-center gap-2 text-sm">
                  <Avatar name={coach.name} photo={coach.coach?.photo} size={28} /> {coach.name}
                </p>
              )}
            </div>
            {consume ? (
              <p className="text-sm">
                Se descuenta <strong>1 crédito</strong> de tu pack. Te quedarán <strong>{credits - 1}</strong>.
              </p>
            ) : (
              <p className="text-sm text-warn">No tienes créditos activos: el sistema bloqueará la reserva.</p>
            )}
            <p className="text-xs text-muted">Puedes cancelar sin perder el crédito hasta {rules.cancellationHours} horas antes de la clase.</p>
          </div>
        )}
        {outcome && (
          <div className="py-4 text-center">
            {outcome.ok ? <CheckCircle2 size={52} className="mx-auto text-ok" aria-hidden /> : <XCircle size={52} className="mx-auto text-bad" aria-hidden />}
            <p className="mt-3 text-lg font-extrabold">{outcome.ok ? "Te esperamos en la cancha" : "No se pudo reservar"}</p>
            <p className="mt-1 text-sm text-muted">{outcome.ok ? "Te enviaremos un recordatorio 24 h y 2 h antes." : outcome.message}</p>
          </div>
        )}
      </Modal>
    </>
  );
}
