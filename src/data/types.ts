// Contrato de la capa de datos. Lo implementan mockDataSource (demo) y supabaseDataSource (fase real).
import type { Level, PackId, PaymentMethod } from "../config";
import type { BookingError, SlotConflict } from "../domain/booking";
import type {
  AppNotification,
  Attendance,
  Booking,
  ClassSlot,
  Club,
  Court,
  NotificationPrefs,
  Payment,
  Role,
  User,
  UserPack,
} from "../domain/types";

export * from "../domain/types";

/** Error de negocio con código (para mostrar un mensaje claro en la UI) */
export class DomainError extends Error {
  constructor(
    public code: BookingError | "SLOT_CONFLICT" | "NOT_FOUND" | "FORBIDDEN" | "INVALID",
    message: string,
    public conflicts?: SlotConflict[],
  ) {
    super(message);
  }
}

export interface Session {
  user: User;
  clubId: string;
}

export type Segment = "all" | "expiring" | "no_pack" | Level;

export interface Announcement {
  id: string;
  title: string;
  body: string;
  segment: Segment;
  recipients: number;
  createdAt: string;
}

export interface DataSource {
  kind: "mock" | "supabase";

  // Sesión
  getSession(): Promise<Session | null>;
  /** Demo: entra como el usuario de ejemplo de cada rol. En producción: Supabase Auth. */
  signInAs(role: Role): Promise<Session>;
  signOut(): Promise<void>;
  setClub(clubId: string): Promise<void>;

  // Catálogos
  getClubs(): Promise<Club[]>;
  getCourts(): Promise<Court[]>;
  getUsers(filter?: { role?: Role }): Promise<User[]>;
  saveUser(user: Omit<User, "id" | "createdAt" | "clubId"> & { id?: string }): Promise<User>;

  // Agenda y reservas
  getSlots(range: { from: Date; to: Date }): Promise<ClassSlot[]>;
  /** Lanza DomainError("SLOT_CONFLICT") si se pisa con otra clase en la misma cancha o con el mismo profesor */
  saveSlot(slot: Omit<ClassSlot, "id" | "clubId"> & { id?: string }): Promise<ClassSlot>;
  deleteSlot(id: string): Promise<void>;
  getBookings(filter?: { userId?: string; slotIds?: string[] }): Promise<Booking[]>;
  /** Reserva para el usuario de la sesión. Valida créditos, cupo y duplicados de forma atómica. */
  createBooking(slotId: string): Promise<Booking>;
  cancelBooking(bookingId: string): Promise<{ refund: boolean }>;
  setAttendance(bookingId: string, attendance: Attendance): Promise<void>;

  // Packs y pagos
  getUserPacks(userId?: string): Promise<UserPack[]>;
  buyPack(input: { packId: PackId; method: PaymentMethod; receipt?: string }): Promise<{ payment: Payment; userPack: UserPack }>;
  getPayments(filter?: { userId?: string; status?: Payment["status"] }): Promise<Payment[]>;
  confirmPayment(paymentId: string): Promise<void>;
  rejectPayment(paymentId: string, reason: string): Promise<void>;
  /** Admin: suma o resta créditos al pack activo (o crea uno de cortesía) */
  adjustCredits(userId: string, delta: number, reason: string): Promise<void>;

  // Notificaciones
  getNotifications(userId: string): Promise<AppNotification[]>;
  markNotificationsRead(userId: string): Promise<void>;
  getPrefs(userId: string): Promise<NotificationPrefs>;
  setPrefs(userId: string, prefs: NotificationPrefs): Promise<void>;
  sendAnnouncement(input: { title: string; body: string; segment: Segment }): Promise<number>;
  getAnnouncements(): Promise<Announcement[]>;

  // Solo demo
  getNow(): Promise<Date>;
  advanceTime(days: number): Promise<void>;
  resetDemo(): Promise<void>;
}
