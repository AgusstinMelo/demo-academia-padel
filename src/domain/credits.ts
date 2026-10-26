// Créditos y vencimientos de packs.
import { packs, rules, type PackId } from "../config";
import { calendarDaysBetween, endOfDayTz, addDaysTz } from "./time";
import type { UserPack, UserPackStatus } from "./types";

export const packDef = (id: PackId) => packs.find((p) => p.id === id)!;

export function packStatus(p: UserPack, now: Date): UserPackStatus {
  if (p.voided) return "voided";
  if (!p.activatedAt || !p.expiresAt) return "pending";
  if (now.getTime() >= new Date(p.expiresAt).getTime()) return p.remaining > 0 ? "expired" : "depleted";
  return p.remaining > 0 ? "active" : "depleted";
}

/** Vencimiento: N días después de activarse, al final de ese día (hora de Bogotá) */
export const expiryFrom = (activatedAt: Date | string) => endOfDayTz(addDaysTz(activatedAt, rules.packValidityDays));

/** Activa un pack al confirmar el pago */
export function activatePack(p: UserPack, at: Date): UserPack {
  if (p.voided) throw new Error("No se puede activar un pack anulado");
  if (p.activatedAt) return p;
  return { ...p, activatedAt: at.toISOString(), expiresAt: expiryFrom(at).toISOString() };
}

/** Packs con los que se puede reservar ahora, del que vence antes al que vence después */
export const usablePacks = (list: UserPack[], now: Date) =>
  list
    .filter((p) => packStatus(p, now) === "active")
    .sort((a, b) => new Date(a.expiresAt!).getTime() - new Date(b.expiresAt!).getTime());

export const availableCredits = (list: UserPack[], now: Date) => usablePacks(list, now).reduce((s, p) => s + p.remaining, 0);

/** Pack del que se descuenta el próximo crédito (el que vence primero: así no se pierden créditos) */
export const packToConsume = (list: UserPack[], now: Date) => usablePacks(list, now)[0] ?? null;

/** Días de calendario hasta el vencimiento (0 = vence hoy) */
export const daysToExpiry = (p: UserPack, now: Date) => (p.expiresAt ? calendarDaysBetween(now, p.expiresAt) : null);

export const isExpiringSoon = (p: UserPack, now: Date) => {
  const d = daysToExpiry(p, now);
  return packStatus(p, now) === "active" && d !== null && d <= rules.expiryWarningDays;
};

/** Precio por clase y ahorro frente a la clase suelta */
export function packPricing(id: PackId) {
  const p = packDef(id);
  const single = packDef("single").price;
  const perClass = Math.round(p.price / p.classes);
  const savings = single * p.classes - p.price;
  return { perClass, savings, savingsPct: savings / (single * p.classes) };
}
