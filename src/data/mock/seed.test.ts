import { describe, expect, it } from "vitest";
import { spotsLeft } from "../../domain/booking";
import { availableCredits, daysToExpiry, packToConsume } from "../../domain/credits";
import { createSeed, DEMO_USERS } from "./seed";

describe("semilla de la demo", () => {
  const now = new Date("2025-11-05T15:00:00Z");
  const db = createSeed(now);
  const mine = db.userPacks.filter((p) => p.userId === DEMO_USERS.student);

  it("es reproducible", () => {
    expect(JSON.stringify(createSeed(now))).toBe(JSON.stringify(db));
  });

  it("la alumna demo tiene créditos y un pack que vence pronto", () => {
    expect(availableCredits(mine, now)).toBe(2);
    expect(daysToExpiry(packToConsume(mine, now)!, now)).toBeGreaterThan(7);
    expect(daysToExpiry(packToConsume(mine, now)!, now)).toBeLessThanOrEqual(10);
  });

  it("tiene una clase próxima reservada e historial", () => {
    const bySlot = new Map(db.slots.map((s) => [s.id, s]));
    const own = db.bookings.filter((b) => b.userId === DEMO_USERS.student);
    expect(own.filter((b) => new Date(bySlot.get(b.slotId)!.startsAt) > now)).toHaveLength(1);
    expect(own.filter((b) => b.attendance === "present")).toHaveLength(5);
  });

  it("ninguna clase supera su cupo y no hay reservas duplicadas", () => {
    for (const s of db.slots) expect(spotsLeft(s, db.bookings)).toBeGreaterThanOrEqual(0);
    for (const s of db.slots) expect(db.bookings.filter((b) => b.slotId === s.id && b.status === "confirmed").length).toBeLessThanOrEqual(s.capacity);
    const keys = db.bookings.map((b) => b.slotId + b.userId);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("hay una clase con un solo cupo para la demo del conflicto y pagos pendientes", () => {
    const contested = db.slots.find((s) => s.id === db.meta.contestedSlotId)!;
    expect(spotsLeft(contested, db.bookings)).toBe(1);
    expect(db.payments.filter((p) => p.status === "pending")).toHaveLength(3);
  });
});
