import { useEffect, useRef } from "react";
import { data, onDataChange } from "../data";
import { toast } from "../lib/ui-state";
import { showSystemNotification } from "../pwa/pwa";

/**
 * Cuando aparece una notificación nueva para el usuario: muestra un toast y, si dio permiso,
 * una notificación real del sistema. En producción las del sistema llegan por Web Push (ver src/pwa/pwa.ts).
 */
export function NotificationBridge({ userId }: { userId: string }) {
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    seen.current = null;
    let alive = true;
    const check = async () => {
      const list = await data.getNotifications(userId);
      if (!alive) return;
      if (!seen.current) {
        seen.current = new Set(list.map((n) => n.id)); // la primera carga no avisa
        return;
      }
      const fresh = list.filter((n) => !seen.current!.has(n.id)).reverse();
      fresh.forEach((n) => {
        seen.current!.add(n.id);
        toast(n.title, { body: n.body, tone: n.type === "payment_rejected" || n.type === "pack_expired" || n.type === "pack_expiring" ? "warn" : n.type === "class_reminder" || n.type === "promo" ? "info" : "ok" });
        void showSystemNotification(n.title, n.body);
      });
    };
    void check();
    const off = onDataChange(() => void check());
    return () => {
      alive = false;
      off();
    };
  }, [userId]);

  return null;
}
