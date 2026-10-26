import { ArrowLeft, Check, Minus, X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { Link } from "react-router";
import { business } from "../config";
import { Logo } from "../components/ui";

type Support = "yes" | "no" | "partial";
const ROWS: { feature: string; android: [Support, string]; ios: [Support, string] }[] = [
  { feature: "Usar la app desde el navegador", android: ["yes", "Chrome, Edge, Samsung Internet"], ios: ["yes", "Safari y otros navegadores"] },
  { feature: "Instalar en la pantalla de inicio", android: ["yes", "Botón «Instalar app» o aviso de Chrome"], ios: ["partial", "Manual: Compartir → Agregar a inicio"] },
  { feature: "Notificaciones push sin instalar", android: ["yes", "Desde Chrome, con permiso del usuario"], ios: ["no", "Safari no las permite sin instalar"] },
  { feature: "Notificaciones push con la app instalada", android: ["yes", "Sí"], ios: ["partial", "Solo iOS/iPadOS 16.4 o superior"] },
  { feature: "Pedir permiso de notificaciones", android: ["yes", "Tras tocar un botón"], ios: ["partial", "Solo tras una acción del usuario y con la app instalada"] },
  { feature: "Funcionar sin conexión (app ya abierta antes)", android: ["yes", "Sí"], ios: ["yes", "Sí"] },
  { feature: "Contador (badge) en el ícono", android: ["partial", "Según el launcher"], ios: ["partial", "Desde 16.4, no en todas las versiones"] },
];

const ICON: Record<Support, ReactNode> = {
  yes: <Check size={16} className="text-ok" aria-label="Sí" />,
  partial: <Minus size={16} className="text-warn" aria-label="Con limitaciones" />,
  no: <X size={16} className="text-bad" aria-label="No" />,
};

export default function Compatibility() {
  useEffect(() => {
    document.title = `Compatibilidad de la app · ${business.name}`;
  }, []);
  return (
    <div className="grain min-h-dvh">
      <p className="bg-ball py-1 text-center text-[11px] font-bold text-ball-ink">{business.demoBanner}</p>
      <main className="wrap max-w-4xl py-10">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-muted hover:text-text">
          <ArrowLeft size={16} aria-hidden /> Volver
        </Link>
        <div className="mt-8 flex items-center gap-4">
          <Logo compact />
          <p className="label-caps text-muted">Android e iOS</p>
        </div>
        <h1 className="display mt-4 text-5xl sm:text-7xl">Compatibilidad de la app</h1>
        <p className="mt-4 max-w-2xl text-muted">
          La app de {business.name} es una PWA: se usa desde el navegador y se puede instalar sin pasar por la tienda. Estas son las diferencias entre plataformas.
        </p>

        <div className="card mt-8 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <caption className="sr-only">Soporte de funciones por plataforma</caption>
            <thead className="border-b border-line text-left text-xs text-muted uppercase">
              <tr>
                <th className="px-4 py-3 font-bold">Función</th>
                <th className="px-4 py-3 font-bold">Android</th>
                <th className="px-4 py-3 font-bold">iPhone / iPad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {ROWS.map((r) => (
                <tr key={r.feature}>
                  <th scope="row" className="px-4 py-3.5 text-left font-bold">{r.feature}</th>
                  {[r.android, r.ios].map(([s, note], i) => (
                    <td key={i} className="px-4 py-3.5">
                      <span className="flex items-start gap-2">
                        <span className="mt-0.5">{ICON[s]}</span>
                        <span className="text-muted">{note}</span>
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="card p-6">
            <h2 className="text-lg font-extrabold">Limitaciones a tener en cuenta</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted">
              <li>En iPhone las notificaciones solo llegan si la app está agregada a la pantalla de inicio (iOS 16.4+).</li>
              <li>El sistema puede retrasar o no entregar una notificación si limita la app (ahorro de batería, modo concentración).</li>
              <li>El contador en el ícono no está disponible en todas las versiones.</li>
              <li>Por eso, todos los avisos también quedan en el centro de notificaciones de la app.</li>
            </ul>
          </div>
          <div className="card p-6">
            <h2 className="text-lg font-extrabold">Cómo instalar</h2>
            <p className="mt-3 text-sm text-muted">
              <strong className="text-text">Android:</strong> abre la web en Chrome y toca «Instalar app».
            </p>
            <p className="mt-2 text-sm text-muted">
              <strong className="text-text">iPhone:</strong> en Safari toca Compartir → Agregar a inicio. Luego abre la app desde el ícono y activa las notificaciones en Ajustes.
            </p>
            <Link to="/app/login" className="btn-ball mt-5">
              Abrir la app
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
