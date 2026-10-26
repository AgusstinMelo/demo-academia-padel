import { ArrowRight, GraduationCap, ShieldCheck, Trophy } from "lucide-react";
import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { business, site } from "../config";
import { useApp } from "../context/AppContext";
import type { Role } from "../data";
import { Logo } from "../components/ui";
import { homeFor } from "./AppLayout";

const ACCESS: { role: Role; title: string; who: string; text: string; icon: typeof Trophy }[] = [
  { role: "student", title: "Entrar como alumno", who: "Valentina Ríos", text: "Reserva clases, compra packs y recibe recordatorios.", icon: Trophy },
  { role: "coach", title: "Entrar como profesor", who: "Juliana Restrepo", text: "Agenda del día, alumnos inscritos y asistencia.", icon: GraduationCap },
  { role: "admin", title: "Entrar como admin", who: "Carolina Mejía", text: "Pagos, usuarios, horarios, reportes y novedades.", icon: ShieldCheck },
];

export function Login() {
  const { session, ready, signInAs } = useApp();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from;
  const [busy, setBusy] = useState<Role | null>(null);

  if (ready && session) return <Navigate to={homeFor(session.user.role)} replace />;

  const enter = async (role: Role) => {
    setBusy(role);
    const s = await signInAs(role);
    const target = from && from.startsWith(`/app/${{ student: "alumno", coach: "profesor", admin: "admin" }[role]}`) ? from : homeFor(s.user.role);
    navigate(target, { replace: true });
  };

  return (
    <div className="grain relative grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden overflow-hidden lg:block">
        <img src={`${site.images.login}?auto=format&fit=crop&w=1400&q=60`} alt="" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/50 to-bg/10" />
        <div className="absolute bottom-12 left-12 max-w-md">
          <p className="display text-6xl">Tu pádel, en el bolsillo</p>
          <p className="mt-3 text-muted">Reserva, paga y recibe avisos desde la app de {business.name}.</p>
        </div>
      </div>

      <div className="relative flex flex-col justify-center px-5 py-10 sm:px-12">
        <div className="glow -top-40 -right-40 size-[520px]" aria-hidden />
        <a href="/" className="relative mb-10 self-start" aria-label={`${business.name}, volver a la web`}>
          <Logo />
        </a>
        <p className="label-caps relative text-ball-text">{business.demoBanner}</p>
        <h1 className="display relative mt-3 text-5xl sm:text-6xl">Ingresar</h1>
        <p className="relative mt-3 max-w-md text-muted">
          En la versión real cada persona entra con su correo. Para la presentación, elige un rol y podrás cambiarlo en cualquier momento desde la barra superior.
        </p>
        <ul className="relative mt-8 grid max-w-lg gap-3">
          {ACCESS.map(({ role, title, who, text, icon: Icon }) => (
            <li key={role}>
              <button type="button" disabled={!!busy} onClick={() => enter(role)} className="card group flex w-full items-center gap-4 p-4 text-left transition hover:border-ball/50 sm:p-5">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-ball/15 text-ball-text">
                  <Icon size={22} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-extrabold">{title}</span>
                  <span className="block text-sm text-muted">
                    {who} · {text}
                  </span>
                </span>
                <ArrowRight size={18} className={`shrink-0 text-muted transition group-hover:translate-x-1 group-hover:text-text ${busy === role ? "animate-pulse" : ""}`} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
