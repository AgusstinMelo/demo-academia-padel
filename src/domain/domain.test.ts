import { describe, expect, it } from "vitest";
import { rules } from "../config";
import { cancellationOutcome, scheduleConflicts, spotsLeft, validateBooking } from "./booking";
import { activatePack, availableCredits, daysToExpiry, expiryFrom, isExpiringSoon, packPricing, packStatus, packToConsume } from "./credits";
import { dueNotifications } from "./notifications";
import { atTime, DAY, HOUR, inTz, isoDay } from "./time";
import type { Booking, ClassSlot, UserPack } from "./types";

// Lunes 3 de noviembre de 2025, 10:00 en Bogotá (15:00 UTC)
const NOW = new Date("2025-11-03T15:00:00Z");
const at = (ms: number) => new Date(NOW.getTime() + ms);

const pack = (o: Partial<UserPack> = {}): UserPack => ({
  id: "up1", clubId: "c1", userId: "u1", packId: "pack4", credits: 4, remaining: 4, paymentId: "p1",
  createdAt: at(-2 * DAY).toISOString(), activatedAt: at(-2 * DAY).toISOString(), expiresAt: at(30 * DAY).toISOString(), voided: false,
  ...o,
});
const slot = (o: Partial<ClassSlot> = {}): ClassSlot => ({
  id: "s1", clubId: "c1", courtId: "k1", coachId: "t1", startsAt: at(DAY).toISOString(), durationMin: 60, capacity: 4, level: "Iniciación",
  ...o,
});
const booking = (o: Partial<Booking> = {}): Booking => ({
  id: "b" + Math.random(), clubId: "c1", slotId: "s1", userId: "u2", userPackId: "upX", status: "confirmed",
  createdAt: NOW.toISOString(), cancelledAt: null, refunded: false, attendance: null,
  ...o,
});

describe("packs y vencimientos", () => {
  it("vence 60 días después de activarse, al final del día en Bogotá", () => {
    const exp = inTz(expiryFrom(NOW));
    expect(exp.getDate()).toBe(2); // 3 nov + 60 días = 2 ene
    expect(exp.getMonth()).toBe(0);
    expect(exp.getHours()).toBe(23);
    expect(rules.packValidityDays).toBe(60);
  });

  it("un pack pendiente no se puede usar hasta confirmar el pago", () => {
    const p = pack({ activatedAt: null, expiresAt: null });
    expect(packStatus(p, NOW)).toBe("pending");
    expect(availableCredits([p], NOW)).toBe(0);
    const active = activatePack(p, NOW);
    expect(packStatus(active, NOW)).toBe("active");
    expect(availableCredits([active], NOW)).toBe(4);
  });

  it("estados: vencido con créditos, agotado y anulado", () => {
    expect(packStatus(pack({ expiresAt: at(-HOUR).toISOString() }), NOW)).toBe("expired");
    expect(packStatus(pack({ remaining: 0 }), NOW)).toBe("depleted");
    expect(packStatus(pack({ voided: true }), NOW)).toBe("voided");
  });

  it("descuenta primero del pack que vence antes", () => {
    const soon = pack({ id: "soon", expiresAt: at(5 * DAY).toISOString() });
    const late = pack({ id: "late", expiresAt: at(50 * DAY).toISOString() });
    expect(packToConsume([late, soon], NOW)?.id).toBe("soon");
    expect(availableCredits([late, soon], NOW)).toBe(8);
  });

  it("alerta de vencimiento con 7 días o menos", () => {
    expect(isExpiringSoon(pack({ expiresAt: at(6 * DAY).toISOString() }), NOW)).toBe(true);
    expect(isExpiringSoon(pack({ expiresAt: at(20 * DAY).toISOString() }), NOW)).toBe(false);
    expect(daysToExpiry(pack({ expiresAt: at(DAY).toISOString() }), NOW)).toBe(1);
  });

  it("precio por clase y ahorro frente a la clase suelta", () => {
    const p8 = packPricing("pack8");
    expect(p8.perClass).toBe(55000);
    expect(p8.savings).toBe(8 * 70000 - 440000);
  });
});

describe("reservas", () => {
  const base = { userId: "u1", slots: [slot()], bookings: [] as Booking[], userPacks: [pack()], now: NOW };

  it("reserva válida descuenta del pack disponible", () => {
    const r = validateBooking({ ...base, slot: slot() });
    expect(r.ok && r.userPack.id).toBe("up1");
  });

  it("impide reservar dos veces la misma clase", () => {
    const r = validateBooking({ ...base, slot: slot(), bookings: [booking({ userId: "u1" })] });
    expect(r).toEqual({ ok: false, error: "ALREADY_BOOKED" });
  });

  it("impide dos clases que se pisan en el horario", () => {
    const other = slot({ id: "s2", startsAt: at(DAY + 30 * 60000).toISOString(), courtId: "k2" });
    const r = validateBooking({ ...base, slot: other, slots: [slot(), other], bookings: [booking({ userId: "u1" })] });
    expect(r).toEqual({ ok: false, error: "TIME_CONFLICT" });
  });

  it("impide reservar una clase llena", () => {
    const full = [1, 2, 3, 4].map((i) => booking({ userId: "x" + i }));
    expect(spotsLeft(slot(), full)).toBe(0);
    expect(validateBooking({ ...base, slot: slot(), bookings: full })).toEqual({ ok: false, error: "SLOT_FULL" });
  });

  it("las reservas canceladas liberan el cupo", () => {
    const list = [1, 2, 3, 4].map((i) => booking({ userId: "x" + i, status: i === 1 ? "cancelled" : "confirmed" }));
    expect(spotsLeft(slot(), list)).toBe(1);
  });

  it("sin créditos, pack vencido o pendiente: motivo claro", () => {
    expect(validateBooking({ ...base, slot: slot(), userPacks: [] })).toEqual({ ok: false, error: "NO_CREDITS" });
    expect(validateBooking({ ...base, slot: slot(), userPacks: [pack({ remaining: 0 })] })).toEqual({ ok: false, error: "NO_CREDITS" });
    expect(validateBooking({ ...base, slot: slot(), userPacks: [pack({ expiresAt: at(-DAY).toISOString() })] })).toEqual({ ok: false, error: "PACK_EXPIRED" });
    expect(validateBooking({ ...base, slot: slot(), userPacks: [pack({ activatedAt: null, expiresAt: null })] })).toEqual({ ok: false, error: "PACK_PENDING" });
  });

  it("no se reservan clases pasadas ni fuera de la ventana", () => {
    expect(validateBooking({ ...base, slot: slot({ startsAt: at(-HOUR).toISOString() }) })).toEqual({ ok: false, error: "SLOT_STARTED" });
    expect(validateBooking({ ...base, slot: slot({ startsAt: at((rules.bookingWindowDays + 1) * DAY).toISOString() }) })).toEqual({ ok: false, error: "OUT_OF_WINDOW" });
  });
});

describe("cancelación", () => {
  it(`devuelve el crédito con ${rules.cancellationHours} h o más de anticipación`, () => {
    expect(cancellationOutcome(slot({ startsAt: at(13 * HOUR).toISOString() }), pack(), NOW)).toMatchObject({ allowed: true, refund: true });
    expect(cancellationOutcome(slot({ startsAt: at(5 * HOUR).toISOString() }), pack(), NOW)).toMatchObject({ allowed: true, refund: false });
    expect(cancellationOutcome(slot({ startsAt: at(-HOUR).toISOString() }), pack(), NOW)).toMatchObject({ allowed: false });
  });

  it("no devuelve el crédito si el pack ya venció", () => {
    const expired = pack({ expiresAt: at(-HOUR).toISOString() });
    expect(cancellationOutcome(slot({ startsAt: at(3 * DAY).toISOString() }), expired, NOW).refund).toBe(false);
  });
});

describe("fechas en Bogotá", () => {
  it("un día de formulario (yyyy-MM-dd) no se corre al día anterior", () => {
    const d = atTime("2025-11-03", "07:00");
    expect(d.toISOString()).toBe("2025-11-03T12:00:00.000Z"); // 07:00 en Bogotá = 12:00 UTC
    expect(isoDay(d)).toBe("2025-11-03");
  });
});

describe("agenda", () => {
  it("detecta conflictos de cancha y de profesor", () => {
    const existing = slot();
    const sameCourt = slot({ id: "n1", coachId: "t2" });
    const sameCoach = slot({ id: "n2", courtId: "k9" });
    const free = slot({ id: "n3", courtId: "k9", coachId: "t9" });
    const later = slot({ id: "n4", startsAt: at(DAY + HOUR).toISOString() });
    expect(scheduleConflicts(sameCourt, [existing]).map((c) => c.kind)).toEqual(["court"]);
    expect(scheduleConflicts(sameCoach, [existing]).map((c) => c.kind)).toEqual(["coach"]);
    expect(scheduleConflicts(free, [existing])).toEqual([]);
    expect(scheduleConflicts(later, [existing])).toEqual([]); // empieza justo al terminar la otra
  });
});

describe("notificaciones programadas", () => {
  it("recordatorio 24 h y 2 h antes, sin duplicados", () => {
    const s = slot({ startsAt: at(20 * HOUR).toISOString() });
    const b = booking({ userId: "u1" });
    const sent = new Set<string>();
    const first = dueNotifications({ now: NOW, bookings: [b], slots: [s], userPacks: [], sentKeys: sent });
    expect(first.map((n) => n.dedupeKey)).toEqual([`reminder:24:${b.id}`]);
    expect(dueNotifications({ now: NOW, bookings: [b], slots: [s], userPacks: [], sentKeys: sent })).toEqual([]);
    const later = dueNotifications({ now: at(19 * HOUR), bookings: [b], slots: [s], userPacks: [], sentKeys: sent });
    expect(later.map((n) => n.dedupeKey)).toEqual([`reminder:2:${b.id}`]);
  });

  it("avisa a 7 días, a 1 día y al vencer", () => {
    const p = pack({ expiresAt: expiryFrom(at(-55 * DAY)).toISOString() }); // vence en 5 días
    const sent = new Set<string>();
    const run = (d: number) => dueNotifications({ now: at(d * DAY), bookings: [], slots: [], userPacks: [p], sentKeys: sent }).map((n) => n.dedupeKey);
    expect(run(0)).toEqual(["expiring:7:up1"]);
    expect(run(1)).toEqual([]);
    expect(run(4)).toEqual(["expiring:1:up1"]);
    expect(run(6)).toEqual(["expired:up1"]);
  });
});
