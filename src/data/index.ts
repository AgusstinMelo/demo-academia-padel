// Punto único de acceso a los datos. VITE_DATA_SOURCE=mock|supabase elige la implementación.
// Cada escritura avisa a los hooks (useQuery) para que vuelvan a pedir lo que muestran.
import { mockDataSource } from "./mockDataSource";
import { supabaseDataSource } from "./supabaseDataSource";
import type { DataSource } from "./types";

export * from "./types";

const backend: DataSource = import.meta.env.VITE_DATA_SOURCE === "supabase" ? supabaseDataSource : mockDataSource;

const listeners = new Set<() => void>();
export const onDataChange = (fn: () => void) => {
  listeners.add(fn);
  return () => void listeners.delete(fn);
};
export const invalidate = () => listeners.forEach((fn) => fn());

// Otra pestaña cambió los datos: refrescar (simula el canal en tiempo real de Supabase)
if (typeof window !== "undefined") window.addEventListener("storage", () => invalidate());

const READS = new Set(["kind", "getSession", "getClubs", "getCourts", "getUsers", "getSlots", "getBookings", "getUserPacks", "getPayments", "getNotifications", "getPrefs", "getAnnouncements", "getNow"]);

export const data: DataSource = Object.fromEntries(
  Object.entries(backend).map(([key, value]) => {
    if (READS.has(key) || typeof value !== "function") return [key, value];
    return [
      key,
      async (...args: unknown[]) => {
        try {
          return await value(...args);
        } finally {
          invalidate(); // también tras un error: p. ej. el conflicto de reserva cambia los cupos
        }
      },
    ];
  }),
) as unknown as DataSource;
