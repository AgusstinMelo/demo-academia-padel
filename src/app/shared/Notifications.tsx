import { Bell, CalendarCheck, CalendarClock, CreditCard, Megaphone, TimerReset, type LucideIcon } from "lucide-react";
import { useEffect } from "react";
import { useUser } from "../../context/AppContext";
import { data, type NotificationType } from "../../data";
import { fmtDateTime } from "../../domain/time";
import { useQuery } from "../../lib/ui-state";
import { Empty, PageHeader, Skeleton } from "../../components/ui";

const ICON: Record<NotificationType, LucideIcon> = {
  booking_confirmed: CalendarCheck,
  booking_cancelled: CalendarCheck,
  booking_changed: CalendarClock,
  class_reminder: CalendarClock,
  payment_pending: CreditCard,
  payment_approved: CreditCard,
  payment_rejected: CreditCard,
  pack_expiring: TimerReset,
  pack_expired: TimerReset,
  promo: Megaphone,
};

export function Notifications() {
  const user = useUser();
  const notes = useQuery(`notes:${user.id}`, () => data.getNotifications(user.id));

  // Al salir de la pantalla se marcan como leídas (así se ven resaltadas mientras tanto)
  useEffect(() => () => void data.markNotificationsRead(user.id), [user.id]);

  return (
    <>
      <PageHeader title="Notificaciones" subtitle="Reservas, recordatorios, pagos, vencimientos y novedades de la academia." />
      {notes.loading ? (
        <div className="grid gap-3">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : !notes.data?.length ? (
        <Empty icon={<Bell size={36} />} title="Sin notificaciones por ahora" />
      ) : (
        <ul className="grid gap-2">
          {notes.data.map((n) => {
            const Icon = ICON[n.type];
            const warn = n.type === "pack_expiring" || n.type === "pack_expired" || n.type === "payment_rejected";
            return (
              <li key={n.id} className={`card flex gap-4 p-4 ${n.read ? "" : "border-court/50 bg-court/5"}`}>
                <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${warn ? "bg-warn/15 text-warn" : "bg-ball/15 text-ball-text"}`}>
                  <Icon size={20} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold">
                    {!n.read && <span className="mr-2 inline-block size-2 rounded-full bg-court align-middle" aria-label="Sin leer" />}
                    {n.title}
                  </p>
                  <p className="text-sm text-muted">{n.body}</p>
                  <p className="mt-1 text-xs text-muted">{fmtDateTime(n.createdAt)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
