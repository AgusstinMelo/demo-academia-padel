// Datos iniciales de la demo, generados con una semilla fija (siempre los mismos).
// Las fechas se anclan a la semana actual para que la agenda siempre tenga clases próximas.
import { business, levels, packs, rules, site, weeklyTemplate, type Level, type PackId, type PaymentMethod } from "../../config";
import { activatePack, packDef } from "../../domain/credits";
import { addDaysTz, atTime, DAY, HOUR, startOfWeekTz } from "../../domain/time";
import type { AppNotification, Booking, ClassSlot, Club, Court, NotificationPrefs, Payment, User, UserPack } from "../../domain/types";
import type { Announcement } from "../types";
import { receiptImage } from "./receipt";

export interface MockDb {
  version: 1;
  clubs: Club[];
  courts: Court[];
  users: User[];
  slots: ClassSlot[];
  bookings: Booking[];
  userPacks: UserPack[];
  payments: Payment[];
  notifications: AppNotification[];
  prefs: Record<string, NotificationPrefs>;
  announcements: Announcement[];
  meta: {
    createdAt: string;
    clockOffsetMs: number;
    sentKeys: string[];
    /** Mientras no sea null, el primer intento de tomar un «último cupo» lo gana otro alumno (demo del conflicto). Garantiza al menos una clase así. */
    contestedSlotId: string | null;
    seq: number;
  };
}

export const DEMO_USERS = { student: "u-student", coach: "u-coach-0", admin: "u-admin" } as const;
export const CLUB_ID = "club-poblado";

const STUDENT_NAMES = [
  "Valentina Ríos", "Sebastián Londoño", "Isabella Cardona", "Juan José Henao", "Mariana Zapata", "Alejandro Vélez", "Sara Gómez",
  "Tomás Restrepo", "Manuela Ochoa", "Samuel Arango", "Antonia Mejía", "Nicolás Uribe", "Luciana Correa", "Martín Echeverri",
  "Gabriela Montoya", "Emilio Posada", "Salomé Duque", "Jerónimo Toro", "Valeria Escobar", "Felipe Agudelo", "Daniela Pérez",
  "Santiago Muñoz", "Camila Jaramillo", "Andrés Betancur", "Laura Franco", "David Osorio", "María José Ruiz", "Esteban Giraldo",
];

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const DEFAULT_PREFS: NotificationPrefs = { reminders: true, bookings: true, payments: true, expiry: true, promos: true };

export function createSeed(realNow: Date): MockDb {
  const r = mulberry32(2026);
  const pick = <T,>(a: readonly T[]) => a[Math.floor(r() * a.length)];
  const now = realNow;
  const iso = (d: Date | number) => new Date(d).toISOString();
  let seq = 0;
  const id = (p: string) => `${p}-${(++seq).toString(36)}`;

  const clubs: Club[] = [
    { id: CLUB_ID, name: "Sede El Poblado", city: business.address.city, active: true },
    { id: "club-envigado", name: "Sede Envigado (próximamente)", city: "Envigado", active: false },
  ];
  const courts: Court[] = [0, 1, 2, 3].map((i) => ({ id: `court-${i}`, clubId: CLUB_ID, name: `Cancha ${i + 1}` }));

  // ── Usuarios
  const created = iso(now.getTime() - 400 * DAY);
  const coaches: User[] = site.coaches.map((c, i) => ({
    id: `u-coach-${i}`,
    clubId: CLUB_ID,
    role: "coach",
    name: c.name,
    email: `${c.name.split(" ")[0].toLowerCase()}@elitepadel-ejemplo.co`,
    phone: `+57 300 000 01${i}0`,
    level: "Competición",
    createdAt: created,
    coach: { specialty: c.specialty, certification: c.level, photo: c.photo },
  }));
  const admin: User = { id: DEMO_USERS.admin, clubId: CLUB_ID, role: "admin", name: "Carolina Mejía", email: "admin@elitepadel-ejemplo.co", phone: "+57 300 000 0001", level: "Avanzado", createdAt: created };
  const students: User[] = STUDENT_NAMES.map((name, i) => ({
    id: i === 0 ? DEMO_USERS.student : `u-st-${i}`,
    clubId: CLUB_ID,
    role: "student",
    name,
    email: `${name.split(" ")[0].toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")}.${i}@correo-ejemplo.co`,
    phone: `+57 3${String(10 + i).padStart(2, "0")} 000 ${String(1000 + i * 37).slice(-4)}`,
    level: i === 0 ? "Intermedio" : (pick(levels) as Level),
    createdAt: iso(now.getTime() - (30 + r() * 500) * DAY),
  }));

  // ── Agenda: de 4 semanas atrás a 4 semanas adelante
  const week0 = startOfWeekTz(now);
  const slots: ClassSlot[] = [];
  for (let w = -4; w <= 4; w++) {
    for (const t of weeklyTemplate) {
      const day = addDaysTz(week0, w * 7 + t.day);
      slots.push({
        id: id("slot"),
        clubId: CLUB_ID,
        courtId: courts[t.court].id,
        coachId: coaches[t.coach].id,
        startsAt: iso(atTime(day, t.time)),
        durationMin: rules.classDurationMin,
        capacity: rules.defaultCapacity,
        level: t.level,
      });
    }
  }

  // ── Packs y pagos
  const userPacks: UserPack[] = [];
  const payments: Payment[] = [];
  const methods: PaymentMethod[] = ["transfer", "nequi", "gateway", "gateway"];
  const addPurchase = (userId: string, packId: PackId, when: number, opts: { status?: Payment["status"]; method?: PaymentMethod; used?: number } = {}) => {
    const def = packDef(packId);
    const method = opts.method ?? pick(methods);
    const status = opts.status ?? "approved";
    const payment: Payment = {
      id: id("pay"),
      clubId: CLUB_ID,
      userId,
      packId,
      amount: def.price,
      method,
      status,
      receipt: method === "gateway" ? null : receiptImage({ amount: def.price, reference: `TRX${Math.floor(r() * 9e8 + 1e8)}`, date: new Date(when), method }),
      reference: method === "gateway" ? `PAY-${Math.floor(r() * 9e6 + 1e6)}` : `TRX${Math.floor(r() * 9e8 + 1e8)}`,
      createdAt: iso(when),
      reviewedAt: status === "pending" ? null : iso(when + (method === "gateway" ? 0 : 3 * HOUR)),
      rejectReason: null,
    };
    payments.push(payment);
    let up: UserPack = {
      id: id("up"),
      clubId: CLUB_ID,
      userId,
      packId,
      credits: def.classes,
      remaining: Math.max(0, def.classes - (opts.used ?? 0)),
      paymentId: payment.id,
      createdAt: iso(when),
      activatedAt: null,
      expiresAt: null,
      voided: false,
    };
    if (status === "approved") up = activatePack(up, new Date(payment.reviewedAt!));
    userPacks.push(up);
    return up;
  };

  // Historial de ventas de 6 meses (para el dashboard): crece mes a mes
  for (let m = 6; m >= 1; m--) {
    const count = 22 + (6 - m) * 4 + Math.floor(r() * 6);
    for (let k = 0; k < count; k++) {
      const when = now.getTime() - (m * 30 - r() * 30) * DAY;
      const old = addPurchase(pick(students.slice(1)).id, r() < 0.45 ? "pack8" : r() < 0.75 ? "pack4" : "single", when);
      old.remaining = 0; // los packs viejos ya se usaron completos
    }
  }

  // Alumna de la demo: pack 8 activado hace 51 días (vence en ~9 días); 5 clases tomadas + 1 reservada = 2 disponibles
  const demoPack = addPurchase(DEMO_USERS.student, "pack8", now.getTime() - 51 * DAY, { method: "nequi", used: 5 });
  // Resto de alumnos: un pack activo reciente (algunos por vencer)
  students.slice(1).forEach((s, i) => {
    const daysAgo = i % 5 === 0 ? 55 : 5 + r() * 40;
    addPurchase(s.id, r() < 0.55 ? "pack8" : "pack4", now.getTime() - daysAgo * DAY, { used: Math.floor(r() * 3) });
  });
  // Pagos pendientes de confirmación (comprobantes para aprobar en el admin)
  [3, 7, 12].forEach((i, k) => addPurchase(students[i].id, k === 1 ? "pack4" : "pack8", now.getTime() - (k + 1) * 5 * HOUR, { status: "pending", method: k === 2 ? "nequi" : "transfer" }));

  // ── Reservas: ~70 % de ocupación; las clases pasadas con asistencia
  const bookings: Booking[] = [];
  const activePackOf = new Map(userPacks.filter((p) => p.activatedAt && p.remaining > 0).map((p) => [p.userId, p.id]));
  for (const slot of slots) {
    const start = new Date(slot.startsAt).getTime();
    const past = start < now.getTime();
    const target = Math.round(slot.capacity * (past ? 0.55 + r() * 0.45 : 0.15 + r() * 0.75));
    const pool = students.slice(1).filter(() => r() < 0.5);
    for (const s of pool.slice(0, target)) {
      bookings.push({
        id: id("bk"),
        clubId: CLUB_ID,
        slotId: slot.id,
        userId: s.id,
        userPackId: activePackOf.get(s.id) ?? "historico",
        status: "confirmed",
        createdAt: iso(start - (1 + r() * 6) * DAY),
        cancelledAt: null,
        refunded: false,
        attendance: past ? (r() < 0.88 ? "present" : "absent") : null,
      });
    }
  }

  // Historial de la alumna demo: 5 clases ya tomadas con el pack actual + una próxima reservada
  const demoLevelSlots = (cond: (t: number) => boolean) =>
    slots.filter((s) => s.level === "Intermedio" && cond(new Date(s.startsAt).getTime()) && !bookings.some((b) => b.slotId === s.id && b.userId === DEMO_USERS.student));
  const free = (s: ClassSlot) => bookings.filter((b) => b.slotId === s.id && b.status === "confirmed").length < s.capacity;
  const pastSlots = demoLevelSlots((t) => t < now.getTime() && t > now.getTime() - 45 * DAY).filter(free);
  pastSlots.slice(-5).forEach((s) =>
    bookings.push({ id: id("bk"), clubId: CLUB_ID, slotId: s.id, userId: DEMO_USERS.student, userPackId: demoPack.id, status: "confirmed", createdAt: iso(new Date(s.startsAt).getTime() - 2 * DAY), cancelledAt: null, refunded: false, attendance: "present" }),
  );
  const nextSlot = demoLevelSlots((t) => t > now.getTime() + 20 * HOUR).filter(free)[0];
  if (nextSlot) {
    bookings.push({ id: id("bk"), clubId: CLUB_ID, slotId: nextSlot.id, userId: DEMO_USERS.student, userPackId: demoPack.id, status: "confirmed", createdAt: iso(now.getTime() - DAY), cancelledAt: null, refunded: false, attendance: null });
    demoPack.remaining -= 1;
  }

  // Clase «disputada»: dentro de 2–3 días, con un solo cupo libre
  const contested = slots.find((s) => {
    const t = new Date(s.startsAt).getTime();
    return t > now.getTime() + 2 * DAY && t < now.getTime() + 4 * DAY && s.level === "Intermedio" && s !== nextSlot;
  });
  if (contested) {
    // Deja exactamente capacidad − 1 reservas en esa clase
    const others = bookings.filter((b) => b.slotId !== contested.id);
    const inSlot = bookings.filter((b) => b.slotId === contested.id).slice(0, contested.capacity - 1);
    for (const s of students.slice(5)) {
      if (inSlot.length >= contested.capacity - 1) break;
      if (inSlot.some((b) => b.userId === s.id)) continue;
      inSlot.push({ id: id("bk"), clubId: CLUB_ID, slotId: contested.id, userId: s.id, userPackId: activePackOf.get(s.id) ?? "historico", status: "confirmed", createdAt: iso(now), cancelledAt: null, refunded: false, attendance: null });
    }
    bookings.splice(0, bookings.length, ...others, ...inSlot);
  }

  // ── Notificaciones de ejemplo de la alumna demo
  const notifications: AppNotification[] = [
    { id: id("n"), userId: DEMO_USERS.student, type: "promo", title: "Clínica de bandeja este sábado", body: "Cupos limitados. Reserva desde la sección Reservar.", createdAt: iso(now.getTime() - 3 * DAY), read: true },
    { id: id("n"), userId: DEMO_USERS.student, type: "booking_confirmed", title: "Reserva confirmada", body: "Tu próxima clase de nivel Intermedio quedó reservada.", createdAt: iso(now.getTime() - DAY), read: false },
  ];

  const prefs: Record<string, NotificationPrefs> = {};
  return {
    version: 1,
    clubs,
    courts,
    users: [admin, ...coaches, ...students],
    slots,
    bookings,
    userPacks,
    payments,
    notifications,
    prefs,
    announcements: [
      { id: id("ann"), title: "Clínica de bandeja este sábado", body: "Cupos limitados. Reserva desde la sección Reservar.", segment: "all", recipients: students.length, createdAt: iso(now.getTime() - 3 * DAY) },
    ],
    meta: { createdAt: iso(now), clockOffsetMs: 0, sentKeys: [], contestedSlotId: contested?.id ?? null, seq },
  };
}

export const packIds = packs.map((p) => p.id);
