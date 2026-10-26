// Reglas de reserva y cancelación. Funciones puras: la fuente de datos las llama
// antes de escribir, y en producción se replican en la base (ver supabase/schema.sql).
import { rules } from "../config";
import { packStatus, packToConsume } from "./credits";
import { DAY, HOUR } from "./time";
import type { Booking, ClassSlot, UserPack } from "./types";

export type BookingError =
  | "SLOT_STARTED"
  | "OUT_OF_WINDOW"
  | "ALREADY_BOOKED"
  | "TIME_CONFLICT"
  | "SLOT_FULL"
  | "PACK_EXPIRED"
  | "PACK_PENDING"
  | "NO_CREDITS";

export const BOOKING_ERRORS: Record<BookingError, string> = {
  SLOT_STARTED: "Esta clase ya empezó.",
  OUT_OF_WINDOW: `Solo puedes reservar con hasta ${rules.bookingWindowDays} días de anticipación.`,
  ALREADY_BOOKED: "Ya tienes una reserva en esta clase.",
  TIME_CONFLICT: "Ya tienes otra clase reservada en ese horario.",
  SLOT_FULL: "No quedan cupos en esta clase.",
  PACK_EXPIRED: "Tu pack venció. Compra uno nuevo para seguir reservando.",
  PACK_PENDING: "Tu pack está pendiente de confirmación del pago.",
  NO_CREDITS: "No tienes créditos disponibles. Elige un pack para reservar.",
};

export const slotEnd = (s: ClassSlot) => new Date(s.startsAt).getTime() + s.durationMin * 60000;
export const confirmedIn = (slotId: string, bookings: Booking[]) => bookings.filter((b) => b.slotId === slotId && b.status === "confirmed");
export const spotsLeft = (s: ClassSlot, bookings: Booking[]) => Math.max(0, s.capacity - confirmedIn(s.id, bookings).length);

const overlaps = (a: ClassSlot, b: ClassSlot) => new Date(a.startsAt).getTime() < slotEnd(b) && new Date(b.startsAt).getTime() < slotEnd(a);

interface BookingInput {
  slot: ClassSlot;
  userId: string;
  slots: ClassSlot[];
  bookings: Booking[];
  userPacks: UserPack[];
  now: Date;
}

/** Valida una reserva. Devuelve el pack a descontar o el motivo del rechazo. */
export function validateBooking({ slot, userId, slots, bookings, userPacks, now }: BookingInput):
  | { ok: true; userPack: UserPack }
  | { ok: false; error: BookingError } {
  const start = new Date(slot.startsAt).getTime();
  if (start <= now.getTime()) return { ok: false, error: "SLOT_STARTED" };
  if (start - now.getTime() > rules.bookingWindowDays * DAY) return { ok: false, error: "OUT_OF_WINDOW" };

  const mine = bookings.filter((b) => b.userId === userId && b.status === "confirmed");
  if (mine.some((b) => b.slotId === slot.id)) return { ok: false, error: "ALREADY_BOOKED" };
  const bySlot = new Map(slots.map((s) => [s.id, s]));
  if (mine.some((b) => {
    const other = bySlot.get(b.slotId);
    return other && overlaps(other, slot);
  })) return { ok: false, error: "TIME_CONFLICT" };

  if (spotsLeft(slot, bookings) <= 0) return { ok: false, error: "SLOT_FULL" };

  const own = userPacks.filter((p) => p.userId === userId);
  const pack = packToConsume(own, now);
  if (!pack) {
    if (own.some((p) => packStatus(p, now) === "pending")) return { ok: false, error: "PACK_PENDING" };
    if (own.some((p) => packStatus(p, now) === "expired")) return { ok: false, error: "PACK_EXPIRED" };
    return { ok: false, error: "NO_CREDITS" };
  }
  return { ok: true, userPack: pack };
}

/** Política de cancelación: devuelve el crédito si se cancela con anticipación suficiente y el pack sigue vigente */
export function cancellationOutcome(slot: ClassSlot, pack: UserPack | undefined, now: Date) {
  const hoursLeft = (new Date(slot.startsAt).getTime() - now.getTime()) / HOUR;
  if (hoursLeft <= 0) return { allowed: false, refund: false, hoursLeft };
  const packAlive = !!pack && packStatus({ ...pack, remaining: 1 }, now) === "active";
  return { allowed: true, refund: hoursLeft >= rules.cancellationHours && packAlive, hoursLeft };
}

// ── Agenda: conflictos al crear/editar clases ─────────────────

export interface SlotConflict {
  kind: "court" | "coach";
  slot: ClassSlot;
}

/** Clases que se pisan con `candidate` en la misma cancha o con el mismo profesor */
export function scheduleConflicts(candidate: ClassSlot, slots: ClassSlot[]): SlotConflict[] {
  return slots
    .filter((s) => s.id !== candidate.id && s.clubId === candidate.clubId && overlaps(s, candidate))
    .flatMap((s) => [
      ...(s.courtId === candidate.courtId ? [{ kind: "court" as const, slot: s }] : []),
      ...(s.coachId === candidate.coachId ? [{ kind: "coach" as const, slot: s }] : []),
    ]);
}
