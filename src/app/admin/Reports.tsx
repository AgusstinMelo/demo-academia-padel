import { CalendarCheck, CreditCard, Download, Ticket } from "lucide-react";
import { paymentMethods } from "../../config";
import { packDef, packStatus } from "../../domain/credits";
import { fmt, fmtDateTime, fmtTime } from "../../domain/time";
import { cop } from "../../lib/ui-state";
import { PageHeader } from "../../components/ui";
import { PACK_STATUS, PAYMENT_STATUS } from "../status";
import { downloadCsv, useAdminData, userName } from "./shared";

export default function Reports() {
  const { payments, bookings, slots, userPacks, users, courts, now, loading } = useAdminData();
  const stamp = fmt(now, "yyyy-MM-dd");
  const bySlot = new Map(slots.map((s) => [s.id, s]));

  const reports = [
    {
      icon: CreditCard,
      title: "Pagos",
      text: `${payments.length} pagos con estado, método y referencia.`,
      run: () =>
        downloadCsv(`pagos-${stamp}.csv`, [
          ["fecha", "alumno", "pack", "monto_cop", "metodo", "estado", "referencia", "motivo_rechazo"],
          ...payments.map((p) => [fmtDateTime(p.createdAt), userName(users, p.userId), packDef(p.packId).name, p.amount, paymentMethods[p.method].label, PAYMENT_STATUS[p.status].label, p.reference, p.rejectReason]),
        ]),
    },
    {
      icon: CalendarCheck,
      title: "Reservas y asistencia",
      text: "Reservas de las últimas 5 semanas y las próximas 4, con asistencia.",
      run: () =>
        downloadCsv(`reservas-${stamp}.csv`, [
          ["fecha", "hora", "nivel", "cancha", "profesor", "alumno", "estado", "asistencia", "credito_devuelto"],
          ...bookings
            .filter((b) => bySlot.has(b.slotId))
            .map((b) => {
              const s = bySlot.get(b.slotId)!;
              return [fmt(s.startsAt, "yyyy-MM-dd"), fmtTime(s.startsAt), s.level, courts.find((c) => c.id === s.courtId)?.name, userName(users, s.coachId), userName(users, b.userId), b.status === "confirmed" ? "Confirmada" : "Cancelada", b.attendance === "present" ? "Presente" : b.attendance === "absent" ? "Ausente" : "", b.refunded ? "Sí" : ""];
            }),
        ]),
    },
    {
      icon: Ticket,
      title: "Packs y créditos",
      text: "Créditos restantes y vencimiento de cada pack.",
      run: () =>
        downloadCsv(`packs-${stamp}.csv`, [
          ["alumno", "pack", "creditos", "restantes", "estado", "activado", "vence"],
          ...userPacks.map((p) => [userName(users, p.userId), packDef(p.packId).name, p.credits, p.remaining, PACK_STATUS[packStatus(p, now)].label, p.activatedAt ? fmt(p.activatedAt, "yyyy-MM-dd") : "", p.expiresAt ? fmt(p.expiresAt, "yyyy-MM-dd") : ""]),
        ]),
    },
  ];

  const revenue = payments.filter((p) => p.status === "approved").reduce((s, p) => s + p.amount, 0);

  return (
    <>
      <PageHeader title="Reportes" subtitle={`Exporta a CSV (se abre en Excel o Google Sheets). Ingresos históricos aprobados: ${cop(revenue)}.`} />
      <div className="grid gap-4 md:grid-cols-3">
        {reports.map(({ icon: Icon, title, text, run }) => (
          <section key={title} className="card flex flex-col p-5">
            <Icon size={24} className="text-ball-text" aria-hidden />
            <h2 className="mt-4 text-lg font-extrabold">{title}</h2>
            <p className="mt-1 flex-1 text-sm text-muted">{text}</p>
            <button type="button" className="btn-ghost mt-5" onClick={run} disabled={loading}>
              <Download size={16} aria-hidden /> Exportar CSV
            </button>
          </section>
        ))}
      </div>
    </>
  );
}
