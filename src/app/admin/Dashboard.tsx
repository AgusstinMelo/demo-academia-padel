import { CalendarCheck2, CreditCard, Gauge, TimerReset, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { packs } from "../../config";
import { confirmedIn } from "../../domain/booking";
import { daysToExpiry, isExpiringSoon, packDef } from "../../domain/credits";
import { addDaysTz, fmt, inTz, startOfWeekTz } from "../../domain/time";
import { cop } from "../../lib/ui-state";
import { Avatar, PageHeader, Skeleton, Stat } from "../../components/ui";
import { useAdminData, userName } from "./shared";

const axis = { tickLine: false, axisLine: false, tick: { fill: "var(--c-muted)", fontSize: 12 } } as const;
const PIE = ["var(--c-ball)", "var(--c-court)", "var(--c-muted)"];
const monthKey = (d: Date | string) => fmt(d, "yyyy-MM");

function ChartCard({ title, children, loading }: { title: string; children: ReactNode; loading: boolean }) {
  return (
    <section className="card p-5">
      <h2 className="mb-4 font-extrabold">{title}</h2>
      <div className="h-64">{loading ? <Skeleton className="size-full" /> : children}</div>
    </section>
  );
}

export default function Dashboard() {
  const { now, loading, users, payments, userPacks, slots, bookings } = useAdminData();
  const thisMonth = monthKey(now);
  const approved = payments.filter((p) => p.status === "approved" && p.reviewedAt);
  const monthPayments = approved.filter((p) => monthKey(p.reviewedAt!) === thisMonth);
  const pending = payments.filter((p) => p.status === "pending");
  const expiring = userPacks.filter((p) => isExpiringSoon(p, now));

  // Ocupación de la semana actual
  const weekStart = startOfWeekTz(now).getTime();
  const weekSlots = slots.filter((s) => {
    const t = new Date(s.startsAt).getTime();
    return t >= weekStart && t < weekStart + 7 * 864e5;
  });
  const occ = (list: typeof slots) => {
    const cap = list.reduce((s, x) => s + x.capacity, 0);
    return cap ? list.reduce((s, x) => s + confirmedIn(x.id, bookings).length, 0) / cap : 0;
  };

  // Ingresos de los últimos 6 meses
  const revenue = Array.from({ length: 6 }, (_, i) => {
    const d = inTz(now);
    d.setDate(1);
    d.setMonth(d.getMonth() - (5 - i));
    const key = monthKey(d);
    return { mes: fmt(d, "MMM"), ingresos: approved.filter((p) => monthKey(p.reviewedAt!) === key).reduce((s, p) => s + p.amount, 0) };
  });

  // Packs vendidos en el mes por tipo
  const byPack = packs.map((p) => ({ name: p.name, value: monthPayments.filter((x) => x.packId === p.id).length }));

  // Ocupación por día de la semana (últimas 4 semanas)
  const pastSlots = slots.filter((s) => new Date(s.startsAt) < now && new Date(s.startsAt).getTime() > now.getTime() - 28 * 864e5);
  const byWeekday = Array.from({ length: 7 }, (_, i) => {
    const day = addDaysTz(startOfWeekTz(now), i);
    const list = pastSlots.filter((s) => (inTz(s.startsAt).getDay() + 6) % 7 === i);
    return { dia: fmt(day, "EEE"), ocupacion: Math.round(occ(list) * 100) };
  });

  return (
    <>
      <PageHeader title="Dashboard" subtitle={`Resumen de ${fmt(now, "MMMM 'de' yyyy")} · Sede El Poblado`} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat loading={loading} accent label="Ingresos del mes" icon={<Wallet size={18} />} value={cop(monthPayments.reduce((s, p) => s + p.amount, 0))} />
        <Stat loading={loading} label="Packs vendidos" icon={<CreditCard size={18} />} value={monthPayments.length} hint="en el mes" />
        <Stat loading={loading} label="Ocupación" icon={<Gauge size={18} />} value={`${Math.round(occ(weekSlots) * 100)}%`} hint="esta semana" />
        <Stat loading={loading} label="Pagos pendientes" icon={<CalendarCheck2 size={18} />} value={pending.length} hint={<Link to="/app/admin/pagos" className="font-bold text-ball-text">Revisar</Link>} />
        <Stat loading={loading} label="Packs por vencer" icon={<TimerReset size={18} />} value={expiring.length} hint="en 7 días o menos" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartCard title="Ingresos por mes" loading={loading}>
            <ResponsiveContainer>
              <BarChart data={revenue} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--c-grid)" vertical={false} />
                <XAxis dataKey="mes" {...axis} />
                <YAxis {...axis} width={56} tickFormatter={(v: number) => `$${Math.round(v / 1e6)} M`} />
                <Tooltip formatter={(v) => [cop(Number(v)), "Ingresos"]} cursor={{ fill: "var(--c-surface-2)" }} contentStyle={{ background: "var(--c-surface)", border: "1px solid var(--c-line)", borderRadius: 12 }} />
                <Bar dataKey="ingresos" fill="var(--c-ball)" radius={[8, 8, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
        <ChartCard title="Packs vendidos este mes" loading={loading}>
          <div className="flex h-full flex-col">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={byPack} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2} stroke="var(--c-surface)">
                  {byPack.map((_, i) => <Cell key={i} fill={PIE[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--c-surface)", border: "1px solid var(--c-line)", borderRadius: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <ul className="flex justify-center gap-4 text-xs">
              {byPack.map((p, i) => (
                <li key={p.name} className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full" style={{ background: PIE[i] }} /> {p.name.replace("Pack ", "")} ({p.value})
                </li>
              ))}
            </ul>
          </div>
        </ChartCard>
        <div className="lg:col-span-2">
          <ChartCard title="Ocupación por día (últimas 4 semanas)" loading={loading}>
            <ResponsiveContainer>
              <BarChart data={byWeekday} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--c-grid)" vertical={false} />
                <XAxis dataKey="dia" {...axis} />
                <YAxis {...axis} width={40} domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
                <Tooltip formatter={(v) => [`${v}%`, "Ocupación"]} cursor={{ fill: "var(--c-surface-2)" }} contentStyle={{ background: "var(--c-surface)", border: "1px solid var(--c-line)", borderRadius: 12 }} />
                <Bar dataKey="ocupacion" fill="var(--c-court)" radius={[8, 8, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
        <section className="card p-5">
          <h2 className="mb-4 font-extrabold">Packs por vencer</h2>
          {loading ? (
            <Skeleton className="h-56" />
          ) : expiring.length ? (
            <ul className="space-y-3">
              {expiring.slice(0, 6).map((p) => (
                <li key={p.id} className="flex items-center gap-3 text-sm">
                  <Avatar name={userName(users, p.userId)} size={32} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{userName(users, p.userId)}</span>
                    <span className="text-muted">
                      {packDef(p.packId).name} · {p.remaining} clases
                    </span>
                  </span>
                  <span className="font-bold text-warn">{daysToExpiry(p, now)} d</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Ningún pack vence esta semana.</p>
          )}
        </section>
      </div>
    </>
  );
}
