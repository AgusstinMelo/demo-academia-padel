// PWA: instalación y notificaciones del sistema.
//
// ── Flujo real de Web Push (fase 2 de la hoja de ruta) ─────────────────────────
// 1. Generar claves VAPID (npx web-push generate-vapid-keys). La pública va en VITE_VAPID_PUBLIC_KEY,
//    la privada solo en los secretos de la Edge Function.
// 2. Tras un gesto del usuario: Notification.requestPermission() y luego
//      const reg = await navigator.serviceWorker.ready;
//      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) });
//    y guardar sub.toJSON() en la tabla push_subscriptions (user_id, endpoint, p256dh, auth).
// 3. Una Edge Function de Supabase (send-push) firma y envía con la librería web-push a cada suscripción
//    del usuario. Se dispara desde: triggers (reserva/pago aprobado) y pg_cron cada 15 min
//    (recordatorios 24 h / 2 h, packs por vencer a 7 y 1 día).
// 4. El service worker recibe el evento "push" y llama a self.registration.showNotification().
//    Si el endpoint responde 404/410, la función borra esa suscripción.
// En iOS/iPadOS solo funciona desde 16.4 y con la app agregada a la pantalla de inicio.
// ───────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";

export const notificationsSupported = () => typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator;
export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
export const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

export const permission = (): NotificationPermission | "unsupported" => (notificationsSupported() ? Notification.permission : "unsupported");

/** Pide permiso. Debe llamarse tras un clic del usuario (requisito de iOS y de Chrome). */
export async function requestPermission() {
  if (!notificationsSupported()) return "unsupported" as const;
  return Notification.requestPermission();
}

/** Muestra una notificación del sistema (vía service worker si está disponible) */
export async function showSystemNotification(title: string, body: string) {
  if (permission() !== "granted") return false;
  const options: NotificationOptions = { body, icon: "/pwa-192.png", badge: "/badge-96.png", tag: `elite-${Date.now()}` };
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) await reg.showNotification(title, options);
    else new Notification(title, options);
    return true;
  } catch {
    return false;
  }
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // guardamos el evento para lanzarlo desde nuestro botón
    deferred = e as BeforeInstallPromptEvent;
    listeners.forEach((f) => f());
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    listeners.forEach((f) => f());
  });
}

/** Estado de instalación: en Android/Chrome expone `install()`; en iOS hay que mostrar el instructivo */
export function useInstall() {
  const [, force] = useState(0);
  useEffect(() => {
    const f = () => force((n) => n + 1);
    listeners.add(f);
    return () => void listeners.delete(f);
  }, []);
  return {
    canPrompt: !!deferred,
    installed: typeof window !== "undefined" && isStandalone(),
    ios: typeof window !== "undefined" && isIOS(),
    async install() {
      if (!deferred) return "unavailable" as const;
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      deferred = null;
      listeners.forEach((f) => f());
      return outcome;
    },
  };
}
