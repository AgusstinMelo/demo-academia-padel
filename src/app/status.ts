// Etiquetas y colores de estado compartidos por todas las pantallas.
import type { Tone } from "../components/ui";
import type { Booking, PaymentStatus, UserPackStatus } from "../data";

export const PACK_STATUS: Record<UserPackStatus, { label: string; tone: Tone }> = {
  active: { label: "Activo", tone: "ok" },
  pending: { label: "Pendiente de pago", tone: "warn" },
  depleted: { label: "Agotado", tone: "neutral" },
  expired: { label: "Vencido", tone: "bad" },
  voided: { label: "Anulado", tone: "bad" },
};

export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; tone: Tone }> = {
  pending: { label: "Pendiente de confirmación", tone: "warn" },
  approved: { label: "Aprobado", tone: "ok" },
  rejected: { label: "Rechazado", tone: "bad" },
};

export function bookingStatus(b: Booking, startsAt: string, now: Date): { label: string; tone: Tone } {
  if (b.status === "cancelled") return { label: b.refunded ? "Cancelada · crédito devuelto" : "Cancelada", tone: "bad" };
  if (new Date(startsAt) > now) return { label: "Confirmada", tone: "ok" };
  if (b.attendance === "present") return { label: "Asististe", tone: "info" };
  if (b.attendance === "absent") return { label: "Ausente", tone: "neutral" };
  return { label: "Finalizada", tone: "neutral" };
}
