// Eventos programados: recordatorios de clase y avisos de vencimiento.
// En producción los genera un cron (pg_cron / Edge Function); en la demo, el panel «Simular paso del tiempo».
import { rules } from "../config";
import { daysToExpiry, packDef, packStatus } from "./credits";
import { fmtDayLong, fmtTime, HOUR } from "./time";
import type { AppNotification, Booking, ClassSlot, UserPack } from "./types";

type Draft = Omit<AppNotification, "id" | "createdAt" | "read">;

/** Notificaciones que corresponden a `now` y todavía no se enviaron (según dedupeKey) */
export function dueNotifications(input: {
  now: Date;
  bookings: Booking[];
  slots: ClassSlot[];
  userPacks: UserPack[];
  sentKeys: Set<string>;
}): Draft[] {
  const { now, bookings, slots, userPacks, sentKeys } = input;
  const out: Draft[] = [];
  const push = (d: Draft) => {
    if (d.dedupeKey && !sentKeys.has(d.dedupeKey)) {
      sentKeys.add(d.dedupeKey);
      out.push(d);
    }
  };
  const bySlot = new Map(slots.map((s) => [s.id, s]));

  // Recordatorios de clase: 24 h y 2 h antes
  for (const b of bookings) {
    if (b.status !== "confirmed") continue;
    const slot = bySlot.get(b.slotId);
    if (!slot) continue;
    const hoursLeft = (new Date(slot.startsAt).getTime() - now.getTime()) / HOUR;
    if (hoursLeft <= 0) continue;
    // El umbral más cercano que ya se cumplió (2 h antes que 24 h)
    const h = [...rules.classReminderHours].sort((a, b) => a - b).find((t) => hoursLeft <= t);
    if (h === undefined) continue;
    push({
      userId: b.userId,
      type: "class_reminder",
      title: h >= 24 ? "Tu clase es mañana" : `Tu clase empieza en ${Math.max(1, Math.round(hoursLeft))} h`,
      body: `${slot.level} · ${fmtDayLong(slot.startsAt)} a las ${fmtTime(slot.startsAt)}.`,
      dedupeKey: `reminder:${h}:${b.id}`,
    });
  }

  // Packs por vencer (7 y 1 día) y vencidos
  for (const p of userPacks) {
    const status = packStatus(p, now);
    const days = daysToExpiry(p, now);
    const name = packDef(p.packId).name;
    if (status === "active" && days !== null && days >= 0) {
      const d = [1, rules.expiryWarningDays].find((t) => days <= t);
      if (d !== undefined) {
        push({
          userId: p.userId,
          type: "pack_expiring",
          title: days === 0 ? "Tu pack vence hoy" : days === 1 ? "Tu pack vence mañana" : `Tu pack vence en ${days} días`,
          body: `Te quedan ${p.remaining} ${p.remaining === 1 ? "clase" : "clases"} del ${name}. ¡Resérvalas antes de que venzan!`,
          dedupeKey: `expiring:${d}:${p.id}`,
        });
      }
    }
    if (status === "expired") {
      push({
        userId: p.userId,
        type: "pack_expired",
        title: "Tu pack venció",
        body: `Quedaron ${p.remaining} ${p.remaining === 1 ? "clase" : "clases"} sin usar del ${name}. Elige un nuevo pack para seguir jugando.`,
        dedupeKey: `expired:${p.id}`,
      });
    }
  }
  return out;
}
