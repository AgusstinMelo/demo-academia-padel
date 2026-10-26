// Consultas que comparten varias pantallas del panel de administración.
import { useApp } from "../../context/AppContext";
import { data } from "../../data";
import { DAY } from "../../domain/time";
import { useQuery } from "../../lib/ui-state";

export function useAdminData() {
  const { now } = useApp();
  const users = useQuery("users", () => data.getUsers());
  const payments = useQuery("payments", () => data.getPayments());
  const packs = useQuery("userPacks", () => data.getUserPacks());
  const courts = useQuery("courts", () => data.getCourts());
  // Agenda: 5 semanas atrás y 4 adelante (cubre el dashboard, la agenda y los reportes)
  const from = new Date(now.getTime() - 35 * DAY);
  const to = new Date(now.getTime() + 28 * DAY);
  const slots = useQuery(`slots:admin:${from.toISOString().slice(0, 10)}`, () => data.getSlots({ from, to }));
  const bookings = useQuery("bookings:all", () => data.getBookings());
  const loading = users.loading || payments.loading || packs.loading || slots.loading || bookings.loading || courts.loading;
  return {
    now,
    loading,
    users: users.data ?? [],
    payments: payments.data ?? [],
    userPacks: packs.data ?? [],
    slots: slots.data ?? [],
    bookings: bookings.data ?? [],
    courts: courts.data ?? [],
  };
}

export const userName = (users: { id: string; name: string }[], id: string) => users.find((u) => u.id === id)?.name ?? "—";

export function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const csv = rows.map((r) => r.map((v) => (v == null ? "" : `"${String(v).replace(/"/g, '""')}"`)).join(";")).join("\n");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
