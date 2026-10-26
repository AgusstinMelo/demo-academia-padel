// Fuente de datos de la demo: todo vive en localStorage (se mantiene durante la presentación)
// con latencia simulada de 300–500 ms. Las reglas de negocio vienen de src/domain.
import { paymentMethods, rules } from "../config";
import { BOOKING_ERRORS, cancellationOutcome, scheduleConflicts, spotsLeft, validateBooking } from "../domain/booking";
import { activatePack, isExpiringSoon, packDef, packToConsume, usablePacks } from "../domain/credits";
import { dueNotifications } from "../domain/notifications";
import { DAY, fmtDayLong, fmtTime } from "../domain/time";
import type { AppNotification, NotificationType, Payment, Role, UserPack } from "../domain/types";
import { CLUB_ID, createSeed, DEFAULT_PREFS, DEMO_USERS, type MockDb } from "./mock/seed";
import { DomainError, type DataSource, type Session } from "./types";

const KEY = "elite-padel:db:v1";
const SESSION_KEY = "elite-padel:session";

let db: MockDb | null = null;

function load(): MockDb {
  if (db) return db;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) db = JSON.parse(raw) as MockDb;
  } catch {
    /* datos corruptos: se regeneran */
  }
  if (!db || db.version !== 1) {
    db = createSeed(new Date());
    save();
  }
  return db;
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    /* sin espacio o modo privado: la demo sigue en memoria */
  }
}

// Otra pestaña cambió los datos (p. ej. alguien reservó): se recargan. Simula el «tiempo real».
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) db = null;
  });
}

const now = () => new Date(Date.now() + load().meta.clockOffsetMs);
const newId = (p: string) => `${p}-${(++load().meta.seq).toString(36)}`;
const latency = <T,>(v: T): Promise<T> => new Promise((r) => setTimeout(() => r(v), 300 + Math.random() * 200));
const copy = <T,>(v: T): T => structuredClone(v);

/** Qué preferencia controla cada tipo de notificación */
const PREF_OF: Record<NotificationType, keyof typeof DEFAULT_PREFS> = {
  booking_confirmed: "bookings",
  booking_cancelled: "bookings",
  booking_changed: "bookings",
  class_reminder: "reminders",
  payment_pending: "payments",
  payment_approved: "payments",
  payment_rejected: "payments",
  pack_expiring: "expiry",
  pack_expired: "expiry",
  promo: "promos",
};

function notify(n: Omit<AppNotification, "id" | "createdAt" | "read">) {
  const d = load();
  const prefs = d.prefs[n.userId] ?? DEFAULT_PREFS;
  if (!prefs[PREF_OF[n.type]]) return;
  d.notifications.push({ ...n, id: newId("n"), createdAt: now().toISOString(), read: false });
}

/** Ejecuta los recordatorios y vencimientos que corresponden a la hora actual (en producción: cron) */
function runScheduler() {
  const d = load();
  const sent = new Set(d.meta.sentKeys);
  const due = dueNotifications({ now: now(), bookings: d.bookings, slots: d.slots, userPacks: d.userPacks, sentKeys: sent });
  due.forEach(notify);
  d.meta.sentKeys = [...sent];
  if (due.length) save();
}

function session(): Session | null {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null") as { userId: string; clubId: string } | null;
    const user = s && load().users.find((u) => u.id === s.userId);
    return user ? { user: copy(user), clubId: s!.clubId } : null;
  } catch {
    return null;
  }
}
const requireSession = (...roles: Role[]) => {
  const s = session();
  if (!s) throw new DomainError("FORBIDDEN", "Inicia sesión para continuar.");
  if (roles.length && !roles.includes(s.user.role)) throw new DomainError("FORBIDDEN", "No tienes permiso para esta acción.");
  return s;
};

export const mockDataSource: DataSource = {
  kind: "mock",

  async getSession() {
    runScheduler();
    return latency(session());
  },
  async signInAs(role) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: DEMO_USERS[role], clubId: CLUB_ID }));
    return latency(session()!);
  },
  async signOut() {
    localStorage.removeItem(SESSION_KEY);
  },
  async setClub(clubId) {
    const s = requireSession();
    localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: s.user.id, clubId }));
  },

  getClubs: async () => latency(copy(load().clubs)),
  getCourts: async () => latency(copy(load().courts)),
  getUsers: async (filter = {}) => latency(copy(load().users.filter((u) => !filter.role || u.role === filter.role))),

  async saveUser(input) {
    requireSession("admin");
    const d = load();
    if (input.id) {
      const i = d.users.findIndex((u) => u.id === input.id);
      if (i < 0) throw new DomainError("NOT_FOUND", "Usuario no encontrado.");
      d.users[i] = { ...d.users[i], ...input, id: input.id };
      save();
      return latency(copy(d.users[i]));
    }
    const user = { ...input, id: newId("u"), clubId: CLUB_ID, createdAt: now().toISOString() };
    d.users.push(user);
    save();
    return latency(copy(user));
  },

  async getSlots({ from, to }) {
    const s = session();
    const club = s?.clubId ?? CLUB_ID;
    return latency(
      copy(load().slots.filter((x) => x.clubId === club && new Date(x.startsAt) >= from && new Date(x.startsAt) < to)).sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    );
  },

  async saveSlot(input) {
    requireSession("admin");
    const d = load();
    const candidate = { ...input, id: input.id ?? newId("slot"), clubId: CLUB_ID };
    // API REAL: además de este chequeo, la base lo garantiza con restricciones de exclusión (schema.sql)
    const conflicts = scheduleConflicts(candidate, d.slots);
    if (conflicts.length) throw new DomainError("SLOT_CONFLICT", "La clase se pisa con otra en la misma cancha o con el mismo profesor.", conflicts);
    const i = d.slots.findIndex((x) => x.id === candidate.id);
    if (i >= 0) {
      const before = d.slots[i];
      d.slots[i] = candidate;
      if (before.startsAt !== candidate.startsAt || before.courtId !== candidate.courtId) {
        d.bookings
          .filter((b) => b.slotId === candidate.id && b.status === "confirmed")
          .forEach((b) =>
            notify({ userId: b.userId, type: "booking_changed", title: "Cambio en tu clase", body: `Tu clase ahora es el ${fmtDayLong(candidate.startsAt)} a las ${fmtTime(candidate.startsAt)}.` }),
          );
      }
    } else d.slots.push(candidate);
    save();
    return latency(copy(candidate));
  },

  async deleteSlot(id) {
    requireSession("admin");
    const d = load();
    const slot = d.slots.find((s) => s.id === id);
    if (!slot) throw new DomainError("NOT_FOUND", "Clase no encontrada.");
    // Se cancelan las reservas y se devuelve el crédito
    for (const b of d.bookings.filter((x) => x.slotId === id && x.status === "confirmed")) {
      b.status = "cancelled";
      b.cancelledAt = now().toISOString();
      b.refunded = true;
      const p = d.userPacks.find((u) => u.id === b.userPackId);
      if (p) p.remaining += 1;
      notify({ userId: b.userId, type: "booking_cancelled", title: "Clase cancelada por la academia", body: `La clase del ${fmtDayLong(slot.startsAt)} a las ${fmtTime(slot.startsAt)} se canceló. Te devolvimos el crédito.` });
    }
    d.slots = d.slots.filter((s) => s.id !== id);
    save();
    return latency(undefined);
  },

  async getBookings(filter = {}) {
    const ids = filter.slotIds && new Set(filter.slotIds);
    return latency(copy(load().bookings.filter((b) => (!filter.userId || b.userId === filter.userId) && (!ids || ids.has(b.slotId)))));
  },

  async createBooking(slotId) {
    const s = requireSession("student");
    await latency(null);
    const d = load();
    const slot = d.slots.find((x) => x.id === slotId);
    if (!slot) throw new DomainError("NOT_FOUND", "Clase no encontrada.");

    // Demo del conflicto en tiempo real: la primera vez que alguien intenta tomar un «último cupo»,
    // otro alumno se le adelanta. Así se ve cómo responde el sistema ante dos reservas simultáneas.
    if (d.meta.contestedSlotId && spotsLeft(slot, d.bookings) === 1) {
      d.meta.contestedSlotId = null;
      const rival = d.users.find((u) => u.role === "student" && u.id !== s.user.id && !d.bookings.some((b) => b.slotId === slotId && b.userId === u.id));
      if (rival) {
        d.bookings.push({ id: newId("bk"), clubId: slot.clubId, slotId, userId: rival.id, userPackId: "rival", status: "confirmed", createdAt: now().toISOString(), cancelledAt: null, refunded: false, attendance: null });
        save();
        throw new DomainError("SLOT_FULL", "Otro alumno reservó el último cupo hace un instante. Elige otro horario: no se descontó ningún crédito.");
      }
    }

    // Validación + escritura en un solo paso (en Supabase: función RPC con bloqueo de fila)
    const result = validateBooking({ slot, userId: s.user.id, slots: d.slots, bookings: d.bookings, userPacks: d.userPacks, now: now() });
    if (!result.ok) throw new DomainError(result.error, BOOKING_ERRORS[result.error]);
    const pack = d.userPacks.find((p) => p.id === result.userPack.id)!;
    pack.remaining -= 1;
    const booking = { id: newId("bk"), clubId: slot.clubId, slotId, userId: s.user.id, userPackId: pack.id, status: "confirmed" as const, createdAt: now().toISOString(), cancelledAt: null, refunded: false, attendance: null };
    d.bookings.push(booking);
    notify({ userId: s.user.id, type: "booking_confirmed", title: "Reserva confirmada", body: `${slot.level} · ${fmtDayLong(slot.startsAt)} a las ${fmtTime(slot.startsAt)}. ${pack.remaining === 1 ? "Te queda 1 crédito" : `Te quedan ${pack.remaining} créditos`} en este pack.` });
    save();
    runScheduler();
    return copy(booking);
  },

  async cancelBooking(bookingId) {
    const s = requireSession("student", "admin");
    await latency(null);
    const d = load();
    const b = d.bookings.find((x) => x.id === bookingId);
    if (!b || (s.user.role === "student" && b.userId !== s.user.id)) throw new DomainError("NOT_FOUND", "Reserva no encontrada.");
    if (b.status === "cancelled") return { refund: b.refunded };
    const slot = d.slots.find((x) => x.id === b.slotId)!;
    const pack = d.userPacks.find((p) => p.id === b.userPackId);
    const outcome = cancellationOutcome(slot, pack, now());
    if (!outcome.allowed) throw new DomainError("SLOT_STARTED", "La clase ya empezó: no se puede cancelar.");
    b.status = "cancelled";
    b.cancelledAt = now().toISOString();
    b.refunded = outcome.refund;
    if (outcome.refund && pack) pack.remaining += 1;
    notify({
      userId: b.userId,
      type: "booking_cancelled",
      title: "Reserva cancelada",
      body: outcome.refund ? "Te devolvimos el crédito a tu pack." : `Cancelaste con menos de ${rules.cancellationHours} h de anticipación: el crédito no se devuelve.`,
    });
    save();
    return { refund: outcome.refund };
  },

  async setAttendance(bookingId, attendance) {
    requireSession("coach", "admin");
    const b = load().bookings.find((x) => x.id === bookingId);
    if (!b) throw new DomainError("NOT_FOUND", "Reserva no encontrada.");
    b.attendance = attendance;
    save();
    return latency(undefined);
  },

  async getUserPacks(userId) {
    return latency(copy(load().userPacks.filter((p) => !userId || p.userId === userId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  },

  async buyPack({ packId, method, receipt }) {
    const s = requireSession("student");
    await latency(null);
    const d = load();
    const def = packDef(packId);
    const t = now();
    const gateway = method === "gateway";
    const payment: Payment = {
      id: newId("pay"),
      clubId: s.clubId,
      userId: s.user.id,
      packId,
      amount: def.price,
      method,
      status: gateway ? "approved" : "pending",
      receipt: receipt ?? null,
      reference: gateway ? `PAY-${Date.now().toString().slice(-7)}` : `TRX${Date.now().toString().slice(-9)}`,
      createdAt: t.toISOString(),
      reviewedAt: gateway ? t.toISOString() : null,
      rejectReason: null,
    };
    let up: UserPack = { id: newId("up"), clubId: s.clubId, userId: s.user.id, packId, credits: def.classes, remaining: def.classes, paymentId: payment.id, createdAt: t.toISOString(), activatedAt: null, expiresAt: null, voided: false };
    if (gateway) up = activatePack(up, t);
    d.payments.push(payment);
    d.userPacks.push(up);
    notify(
      gateway
        ? { userId: s.user.id, type: "payment_approved", title: "¡Pago aprobado!", body: `Tu ${def.name} ya está activo: ${def.classes} ${def.classes === 1 ? "clase" : "clases"} por ${rules.packValidityDays} días.` }
        : { userId: s.user.id, type: "payment_pending", title: "Comprobante recibido", body: `Estamos verificando tu pago por ${paymentMethods[method].label}. Te avisamos cuando se active tu ${def.name}.` },
    );
    save();
    return { payment: copy(payment), userPack: copy(up) };
  },

  async getPayments(filter = {}) {
    return latency(
      copy(load().payments.filter((p) => (!filter.userId || p.userId === filter.userId) && (!filter.status || p.status === filter.status))).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
  },

  async confirmPayment(paymentId) {
    requireSession("admin");
    await latency(null);
    const d = load();
    const p = d.payments.find((x) => x.id === paymentId);
    if (!p || p.status !== "pending") throw new DomainError("INVALID", "El pago ya fue revisado.");
    p.status = "approved";
    p.reviewedAt = now().toISOString();
    const i = d.userPacks.findIndex((u) => u.paymentId === p.id);
    if (i >= 0) d.userPacks[i] = activatePack(d.userPacks[i], now());
    const def = packDef(p.packId);
    notify({ userId: p.userId, type: "payment_approved", title: "¡Pago confirmado!", body: `Tu ${def.name} ya está activo. Tienes ${def.classes} ${def.classes === 1 ? "clase" : "clases"} para usar en ${rules.packValidityDays} días.` });
    save();
  },

  async rejectPayment(paymentId, reason) {
    requireSession("admin");
    await latency(null);
    const d = load();
    const p = d.payments.find((x) => x.id === paymentId);
    if (!p || p.status !== "pending") throw new DomainError("INVALID", "El pago ya fue revisado.");
    p.status = "rejected";
    p.reviewedAt = now().toISOString();
    p.rejectReason = reason;
    const up = d.userPacks.find((u) => u.paymentId === p.id);
    if (up) up.voided = true;
    notify({ userId: p.userId, type: "payment_rejected", title: "No pudimos confirmar tu pago", body: `Motivo: ${reason}. Escríbenos o sube un nuevo comprobante.` });
    save();
  },

  async adjustCredits(userId, delta, reason) {
    requireSession("admin");
    await latency(null);
    const d = load();
    const own = d.userPacks.filter((p) => p.userId === userId);
    const target = packToConsume(own, now());
    if (target) {
      target.remaining = Math.max(0, target.remaining + delta);
    } else if (delta > 0) {
      // Sin pack activo: se crea un pack de cortesía
      const t = now();
      d.userPacks.push(activatePack({ id: newId("up"), clubId: CLUB_ID, userId, packId: "single", credits: delta, remaining: delta, paymentId: null, createdAt: t.toISOString(), activatedAt: null, expiresAt: null, voided: false }, t));
    } else throw new DomainError("INVALID", "El usuario no tiene créditos para descontar.");
    notify({ userId, type: "promo", title: delta > 0 ? `Te sumamos ${delta} ${delta === 1 ? "crédito" : "créditos"}` : `Ajuste de ${delta} ${delta === -1 ? "crédito" : "créditos"}`, body: reason });
    save();
  },

  async getNotifications(userId) {
    runScheduler();
    return latency(copy(load().notifications.filter((n) => n.userId === userId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  },
  async markNotificationsRead(userId) {
    load().notifications.forEach((n) => n.userId === userId && (n.read = true));
    save();
  },
  getPrefs: async (userId) => latency({ ...DEFAULT_PREFS, ...load().prefs[userId] }),
  async setPrefs(userId, prefs) {
    load().prefs[userId] = prefs;
    save();
  },

  async sendAnnouncement({ title, body, segment }) {
    requireSession("admin");
    await latency(null);
    const d = load();
    const t = now();
    const students = d.users.filter((u) => u.role === "student");
    const own = (id: string) => d.userPacks.filter((p) => p.userId === id);
    const targets = students.filter((u) => {
      if (segment === "all") return true;
      if (segment === "expiring") return own(u.id).some((p) => isExpiringSoon(p, t));
      if (segment === "no_pack") return usablePacks(own(u.id), t).length === 0;
      return u.level === segment;
    });
    targets.forEach((u) => notify({ userId: u.id, type: "promo", title, body }));
    d.announcements.unshift({ id: newId("ann"), title, body, segment, recipients: targets.length, createdAt: t.toISOString() });
    save();
    return targets.length;
  },
  getAnnouncements: async () => latency(copy(load().announcements)),

  async getNow() {
    return now();
  },
  async advanceTime(days) {
    load().meta.clockOffsetMs += days * DAY;
    save();
    runScheduler();
  },
  async resetDemo() {
    localStorage.removeItem(KEY);
    db = null;
    load();
  },
};

