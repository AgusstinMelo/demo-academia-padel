// Fuente de datos real (fase 1 de la hoja de ruta). Misma interfaz que mockDataSource.
// Para activarla:
//   1. npm install @supabase/supabase-js
//   2. Ejecutar supabase/schema.sql en el proyecto
//   3. VITE_DATA_SOURCE=supabase, VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env.local
//   4. Implementar cada TODO. Las validaciones críticas (créditos, cupos, duplicados) viven en
//      funciones SQL (book_class, cancel_booking, confirm_payment) para que sean atómicas.
import type { DataSource } from "./types";

// import { createClient } from "@supabase/supabase-js";
// const sb = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

const todo = (name: string): never => {
  throw new Error(`supabaseDataSource.${name}() no está implementado todavía. Usa VITE_DATA_SOURCE=mock.`);
};

export const supabaseDataSource: DataSource = {
  kind: "supabase",

  // TODO: sb.auth.getSession() + select de profiles (rol, club_id)
  getSession: async () => todo("getSession"),
  // TODO: en producción no hay «entrar como»: sb.auth.signInWithOtp({ email }) o signInWithPassword
  signInAs: async () => todo("signInAs"),
  signOut: async () => todo("signOut"), // sb.auth.signOut()
  setClub: async () => todo("setClub"), // guardar club activo en profiles.current_club_id

  getClubs: async () => todo("getClubs"), // sb.from("clubs").select("*")
  getCourts: async () => todo("getCourts"), // sb.from("courts").select("*").eq("club_id", clubId)
  getUsers: async () => todo("getUsers"), // sb.from("profiles").select("*").eq("club_id", clubId)
  saveUser: async () => todo("saveUser"), // upsert en profiles (+ invitación por email con sb.auth.admin desde una Edge Function)

  // TODO: sb.from("class_slots").select("*").gte("starts_at", from).lt("starts_at", to)
  //       En tiempo real: sb.channel("slots").on("postgres_changes", { table: "bookings" }, refetch).subscribe()
  getSlots: async () => todo("getSlots"),
  // TODO: insert/update; el constraint de exclusión class_slots_no_overlap devuelve el conflicto (código 23P01)
  saveSlot: async () => todo("saveSlot"),
  deleteSlot: async () => todo("deleteSlot"), // RPC cancel_slot(slot_id): cancela reservas y devuelve créditos
  getBookings: async () => todo("getBookings"),
  // TODO: sb.rpc("book_class", { p_slot_id }) — valida créditos, cupo y duplicados con bloqueo de fila
  createBooking: async () => todo("createBooking"),
  cancelBooking: async () => todo("cancelBooking"), // sb.rpc("cancel_booking", { p_booking_id })
  setAttendance: async () => todo("setAttendance"), // update bookings set attendance (RLS: profesor de la clase)

  getUserPacks: async () => todo("getUserPacks"),
  // TODO: transferencia/Nequi: subir comprobante a Storage (bucket privado "receipts") + insert en payments (pending)
  //       Pasarela: crear la transacción en Wompi / Mercado Pago desde una Edge Function y activar el pack en su webhook
  buyPack: async () => todo("buyPack"),
  getPayments: async () => todo("getPayments"),
  confirmPayment: async () => todo("confirmPayment"), // sb.rpc("confirm_payment", { p_payment_id })
  rejectPayment: async () => todo("rejectPayment"),
  adjustCredits: async () => todo("adjustCredits"), // RPC con registro en credit_adjustments (auditoría)

  getNotifications: async () => todo("getNotifications"),
  markNotificationsRead: async () => todo("markNotificationsRead"),
  getPrefs: async () => todo("getPrefs"),
  setPrefs: async () => todo("setPrefs"),
  sendAnnouncement: async () => todo("sendAnnouncement"), // Edge Function: inserta notifications + envía Web Push
  getAnnouncements: async () => todo("getAnnouncements"),

  // En producción la hora es la del servidor y no se puede adelantar
  getNow: async () => new Date(),
  advanceTime: async () => todo("advanceTime"),
  resetDemo: async () => todo("resetDemo"),
};
