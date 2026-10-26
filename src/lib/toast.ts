// Formato de moneda y toasts. Sin dependencias de la capa de datos (lo usa también la web pública).
import { useSyncExternalStore, type ReactNode } from "react";

export const cop = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

// ── Toasts ───────────────────────────────────────────────────
export type ToastTone = "ok" | "info" | "warn" | "err";
export interface Toast {
  id: number;
  title: ReactNode;
  body?: ReactNode;
  tone: ToastTone;
}
let toasts: Toast[] = [];
let seq = 0;
const toastListeners = new Set<() => void>();
const emit = (next: Toast[]) => {
  toasts = next;
  toastListeners.forEach((f) => f());
};
export function toast(title: ReactNode, opts: { body?: ReactNode; tone?: ToastTone; ms?: number } = {}) {
  const id = ++seq;
  emit([...toasts, { id, title, body: opts.body, tone: opts.tone ?? "ok" }]);
  setTimeout(() => emit(toasts.filter((t) => t.id !== id)), opts.ms ?? 4500);
}
export const dismissToast = (id: number) => emit(toasts.filter((t) => t.id !== id));
export const useToasts = () =>
  useSyncExternalStore(
    (f) => {
      toastListeners.add(f);
      return () => void toastListeners.delete(f);
    },
    () => toasts,
  );
