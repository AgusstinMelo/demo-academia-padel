import {
  Bell,
  CalendarCheck,
  CalendarDays,
  CalendarPlus,
  ChartColumn,
  Clock4,
  CreditCard,
  FileDown,
  Home,
  LogOut,
  Megaphone,
  Moon,
  Settings,
  Sun,
  Ticket,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { business } from "../config";
import { useApp } from "../context/AppContext";
import { data, type Role } from "../data";
import { fmtDateTime } from "../domain/time";
import { toast, useQuery } from "../lib/ui-state";
import { NotificationBridge } from "./NotificationBridge";
import { Logo, Modal, Segmented } from "../components/ui";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Visible en la barra inferior del celular */
  mobile?: boolean;
}

export const NAV: Record<Role, NavItem[]> = {
  student: [
    { to: "/app/alumno", label: "Inicio", icon: Home, mobile: true },
    { to: "/app/alumno/reservar", label: "Reservar", icon: CalendarPlus, mobile: true },
    { to: "/app/alumno/reservas", label: "Mis reservas", icon: CalendarCheck, mobile: true },
    { to: "/app/alumno/packs", label: "Packs y pagos", icon: Ticket, mobile: true },
    { to: "/app/notificaciones", label: "Notificaciones", icon: Bell },
    { to: "/app/ajustes", label: "Ajustes", icon: Settings, mobile: true },
  ],
  coach: [
    { to: "/app/profesor", label: "Agenda", icon: CalendarDays, mobile: true },
    { to: "/app/notificaciones", label: "Notificaciones", icon: Bell, mobile: true },
    { to: "/app/ajustes", label: "Ajustes", icon: Settings, mobile: true },
  ],
  admin: [
    { to: "/app/admin", label: "Dashboard", icon: ChartColumn, mobile: true },
    { to: "/app/admin/pagos", label: "Pagos", icon: CreditCard, mobile: true },
    { to: "/app/admin/usuarios", label: "Usuarios", icon: Users, mobile: true },
    { to: "/app/admin/horarios", label: "Horarios", icon: Clock4, mobile: true },
    { to: "/app/admin/reservas", label: "Reservas", icon: CalendarDays },
    { to: "/app/admin/reportes", label: "Reportes", icon: FileDown },
    { to: "/app/admin/novedades", label: "Novedades", icon: Megaphone, mobile: true },
  ],
};

export const homeFor = (role: Role) => NAV[role][0].to;

const ROLE_LABEL: Record<Role, string> = { student: "Alumno", coach: "Profesor", admin: "Admin" };

/** Panel de demo: adelanta el reloj para disparar recordatorios y vencimientos en vivo */
function TimeTravel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { now } = useApp();
  const [busy, setBusy] = useState(false);
  const jump = async (days: number) => {
    setBusy(true);
    await data.advanceTime(days);
    setBusy(false);
    toast(`Adelantaste ${days === 1 ? "1 día" : `${days} días`}`, { body: "Se ejecutaron los recordatorios y vencimientos de ese momento.", tone: "info" });
  };
  const reset = async () => {
    if (!confirm("Se borran las reservas, pagos y cambios hechos en la demo. ¿Continuar?")) return;
    await data.resetDemo();
    toast("Demo restablecida", { tone: "info" });
    onClose();
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Simular paso del tiempo"
      footer={
        <button type="button" className="btn-danger" onClick={reset}>
          Restablecer demo
        </button>
      }
    >
      <p className="text-sm text-muted">Solo en la demo. Adelanta el reloj para ver en vivo los recordatorios de clase, las alertas de vencimiento y los packs vencidos.</p>
      <p className="mt-4 rounded-2xl bg-surface-2 p-4 text-sm">
        Hora simulada (Bogotá): <strong className="tabular-nums">{fmtDateTime(now)}</strong>
      </p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[1, 3, 7].map((d) => (
          <button key={d} type="button" disabled={busy} className="btn-ghost" onClick={() => jump(d)}>
            +{d} {d === 1 ? "día" : "días"}
          </button>
        ))}
      </div>
    </Modal>
  );
}

export function AppLayout() {
  const { session, ready, signInAs, signOut, theme, toggleTheme, setClub } = useApp();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [timeOpen, setTimeOpen] = useState(false);
  const userId = session?.user.id ?? "";
  const { data: notes } = useQuery(`notes:${userId}`, () => (userId ? data.getNotifications(userId) : Promise.resolve([])));
  const { data: clubs } = useQuery("clubs", () => data.getClubs());

  // El tema claro solo aplica a la app
  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    return () => document.documentElement.classList.remove("light");
  }, [theme]);

  if (!ready) return <div className="grid min-h-dvh place-items-center"><Logo /></div>;
  if (!session) return <Navigate to="/app/login" replace state={{ from: pathname }} />;

  const role = session.user.role;
  const items = NAV[role];
  const unread = notes?.filter((n) => !n.read).length ?? 0;

  const switchRole = async (r: Role) => {
    if (r === role) return;
    await signInAs(r);
    navigate(homeFor(r));
    toast(`Ahora ves la app como ${ROLE_LABEL[r].toLowerCase()}`, { tone: "info", ms: 2500 });
  };

  return (
    <div className="grain min-h-dvh lg:grid lg:grid-cols-[264px_1fr]">
      <NotificationBridge userId={userId} />

      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-surface/60 p-5 lg:flex">
        <NavLink to="/" aria-label={`${business.name}, web pública`}>
          <Logo />
        </NavLink>
        <nav className="mt-8 flex flex-col gap-1" aria-label="Secciones de la app">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to.split("/").length <= 3}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition ${isActive ? "bg-ball text-ball-ink" : "text-muted hover:bg-surface-2 hover:text-text"}`
              }
            >
              <Icon size={18} aria-hidden /> {label}
              {to.endsWith("notificaciones") && unread > 0 && <span className="ml-auto rounded-full bg-bad px-2 text-xs text-white">{unread}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-3">
          <button type="button" onClick={() => setTimeOpen(true)} className="btn-ghost w-full justify-start">
            <Clock4 size={16} aria-hidden /> Simular paso del tiempo
          </button>
          <button
            type="button"
            onClick={async () => {
              await signOut();
              navigate("/app/login");
            }}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-muted hover:text-text"
          >
            <LogOut size={18} aria-hidden /> Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="min-w-0 pb-24 lg:pb-0">
        {/* Header */}
        <header className="glass sticky top-0 z-40 border-b border-line">
          <p className="bg-ball py-1 text-center text-[11px] font-bold text-ball-ink">{business.demoBanner}</p>
          <div className="flex h-16 items-center gap-2 px-4 sm:gap-3 sm:px-6">
            <NavLink to="/" className="lg:hidden" aria-label={`${business.name}, web pública`}>
              <Logo compact />
            </NavLink>
            <Segmented label="Ver la app como" size="sm" value={role} onChange={switchRole} options={(["student", "coach", "admin"] as Role[]).map((r) => ({ value: r, label: ROLE_LABEL[r] }))} />
            {role === "admin" && clubs && (
              <label className="ml-2 hidden items-center gap-2 text-sm md:flex">
                <span className="text-muted">Sede</span>
                <select
                  className="rounded-full border border-line bg-surface-2/60 px-3 py-1.5 text-sm font-bold"
                  value={session.clubId}
                  onChange={(e) => setClub(e.target.value)}
                  aria-label="Sede activa"
                >
                  {clubs.map((c) => (
                    <option key={c.id} value={c.id} disabled={!c.active}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="ml-auto flex items-center gap-1.5">
              <button type="button" onClick={() => setTimeOpen(true)} className="grid size-10 place-items-center rounded-full border border-line text-muted hover:text-text lg:hidden" aria-label="Simular paso del tiempo">
                <Clock4 size={18} />
              </button>
              <button type="button" onClick={toggleTheme} className="grid size-10 place-items-center rounded-full border border-line text-muted hover:text-text" aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}>
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <NavLink to="/app/notificaciones" className="relative grid size-10 place-items-center rounded-full border border-line text-muted hover:text-text" aria-label={`Notificaciones${unread ? `, ${unread} sin leer` : ""}`}>
                <Bell size={18} />
                {unread > 0 && <span className="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full bg-bad px-1 text-[11px] font-bold text-white">{unread}</span>}
              </NavLink>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <Outlet />
        </main>
      </div>

      {/* Barra inferior (celular) */}
      <nav className="glass fixed inset-x-0 bottom-0 z-40 border-t border-line pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Secciones de la app">
        <ul className="flex">
          {items
            .filter((i) => i.mobile)
            .map(({ to, label, icon: Icon }) => (
              <li key={to} className="flex-1">
                <NavLink
                  to={to}
                  end={to.split("/").length <= 3}
                  className={({ isActive }) => `flex flex-col items-center gap-1 py-2.5 text-[10.5px] font-bold ${isActive ? "text-ball-text" : "text-muted"}`}
                >
                  {({ isActive }) => (
                    <>
                      <span className={`grid h-7 w-12 place-items-center rounded-full transition ${isActive ? "bg-ball text-ball-ink" : ""}`}>
                        <Icon size={18} aria-hidden />
                      </span>
                      {label.split(" ")[0]}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
        </ul>
      </nav>

      <TimeTravel open={timeOpen} onClose={() => setTimeOpen(false)} />
    </div>
  );
}
