// Modelo del dominio. Los nombres coinciden con las tablas de supabase/schema.sql.
import type { Level, PackId, PaymentMethod } from "../config";

export type Role = "student" | "coach" | "admin";

export interface Club {
  id: string;
  name: string;
  city: string;
  active: boolean;
}

export interface Court {
  id: string;
  clubId: string;
  name: string;
}

export interface User {
  id: string;
  clubId: string;
  role: Role;
  name: string;
  email: string;
  phone: string;
  level: Level;
  createdAt: string;
  /** Solo profesores */
  coach?: { specialty: string; certification: string; photo: string };
}

export interface ClassSlot {
  id: string;
  clubId: string;
  courtId: string;
  coachId: string;
  startsAt: string; // ISO UTC
  durationMin: number;
  capacity: number;
  level: Level;
}

export type BookingStatus = "confirmed" | "cancelled";
export type Attendance = "present" | "absent" | null;

export interface Booking {
  id: string;
  clubId: string;
  slotId: string;
  userId: string;
  userPackId: string;
  status: BookingStatus;
  createdAt: string;
  cancelledAt: string | null;
  /** Al cancelar: true si se devolvió el crédito */
  refunded: boolean;
  attendance: Attendance;
}

export interface UserPack {
  id: string;
  clubId: string;
  userId: string;
  packId: PackId;
  credits: number;
  remaining: number;
  paymentId: string | null;
  createdAt: string;
  /** null mientras el pago no está confirmado */
  activatedAt: string | null;
  expiresAt: string | null;
  /** true si el pago fue rechazado */
  voided: boolean;
}

export type UserPackStatus = "pending" | "active" | "depleted" | "expired" | "voided";

export type PaymentStatus = "pending" | "approved" | "rejected";
export interface Payment {
  id: string;
  clubId: string;
  userId: string;
  packId: PackId;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  /** Comprobante (data URL en la demo; ruta de Storage en producción) */
  receipt: string | null;
  reference: string;
  createdAt: string;
  reviewedAt: string | null;
  rejectReason: string | null;
}

export type NotificationType =
  | "booking_confirmed"
  | "booking_cancelled"
  | "class_reminder"
  | "booking_changed"
  | "payment_pending"
  | "payment_approved"
  | "payment_rejected"
  | "pack_expiring"
  | "pack_expired"
  | "promo";

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  /** Evita duplicados de recordatorios/vencimientos (p. ej. "reminder:24:<bookingId>") */
  dedupeKey?: string;
}

export type NotificationPrefs = Record<"reminders" | "bookings" | "payments" | "expiry" | "promos", boolean>;
