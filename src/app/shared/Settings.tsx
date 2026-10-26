import { BellRing, Download, Moon, Share, Smartphone, SquarePlus, Sun } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { useApp, useUser } from "../../context/AppContext";
import { data, type NotificationPrefs } from "../../data";
import { toast, useQuery } from "../../lib/ui-state";
import { isIOS, isStandalone, permission, requestPermission, showSystemNotification, useInstall } from "../../pwa/pwa";
import { Avatar, PageHeader, Skeleton } from "../../components/ui";

const PREF_LABELS: Record<keyof NotificationPrefs, { label: string; hint: string }> = {
  reminders: { label: "Recordatorios de clase", hint: "24 h y 2 h antes" },
  bookings: { label: "Reservas", hint: "Confirmaciones, cancelaciones y cambios de horario" },
  payments: { label: "Pagos", hint: "Comprobante recibido, pago aprobado o rechazado" },
  expiry: { label: "Vencimiento de packs", hint: "7 días y 1 día antes" },
  promos: { label: "Novedades y promociones", hint: "Clínicas, torneos y ofertas" },
};

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? "bg-ball" : "bg-line"}`}>
      <span className={`absolute top-1 left-1 size-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : ""}`} />
    </button>
  );
}

export function Settings() {
  const user = useUser();
  const { theme, toggleTheme } = useApp();
  const prefs = useQuery(`prefs:${user.id}`, () => data.getPrefs(user.id));
  const install = useInstall();
  const [perm, setPerm] = useState(permission());

  const setPref = async (key: keyof NotificationPrefs, value: boolean) => {
    if (!prefs.data) return;
    await data.setPrefs(user.id, { ...prefs.data, [key]: value });
  };

  const testNotification = async () => {
    let p = perm;
    if (p === "default") {
      p = await requestPermission();
      setPerm(p);
    }
    if (p === "granted") {
      const ok = await showSystemNotification("Tu clase es mañana 🎾", "Intermedio · 7:00 p. m. en la Cancha 1. ¡Te esperamos!");
      toast(ok ? "Notificación enviada" : "No se pudo mostrar la notificación", { body: ok ? "Revisa el centro de notificaciones de tu dispositivo." : undefined, tone: ok ? "ok" : "warn" });
    } else if (p === "denied") {
      toast("Las notificaciones están bloqueadas", { body: "Actívalas en los ajustes del navegador para este sitio.", tone: "warn" });
    } else {
      toast("Este navegador no admite notificaciones", { body: isIOS() ? "En iPhone, primero agrega la app a la pantalla de inicio (iOS 16.4 o superior)." : undefined, tone: "warn" });
    }
  };

  return (
    <>
      <PageHeader title="Ajustes" />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5 sm:p-6" aria-labelledby="profile-title">
          <h2 id="profile-title" className="label-caps text-muted">
            Perfil
          </h2>
          <div className="mt-4 flex items-center gap-4">
            <Avatar name={user.name} photo={user.coach?.photo} size={56} />
            <div>
              <p className="text-lg font-extrabold">{user.name}</p>
              <p className="text-sm text-muted">{user.email}</p>
              <p className="text-sm text-muted">Nivel {user.level}</p>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between gap-4 border-t border-line pt-5">
            <span className="flex items-center gap-3 font-bold">
              {theme === "dark" ? <Moon size={18} aria-hidden /> : <Sun size={18} aria-hidden />} Modo {theme === "dark" ? "oscuro" : "claro"}
            </span>
            <Switch checked={theme === "light"} onChange={toggleTheme} label="Usar modo claro" />
          </div>
        </section>

        <section className="card p-5 sm:p-6" aria-labelledby="install-title">
          <h2 id="install-title" className="label-caps text-muted">
            App en tu celular
          </h2>
          {install.installed || isStandalone() ? (
            <p className="mt-4 font-bold text-ok">Estás usando la app instalada ✓</p>
          ) : install.ios ? (
            <ol className="mt-4 space-y-3 text-sm">
              <li className="flex items-center gap-3"><Share size={18} className="text-ball-text" aria-hidden /> 1. Toca <strong>Compartir</strong> en Safari.</li>
              <li className="flex items-center gap-3"><SquarePlus size={18} className="text-ball-text" aria-hidden /> 2. Elige <strong>Agregar a inicio</strong>.</li>
              <li className="flex items-center gap-3"><Smartphone size={18} className="text-ball-text" aria-hidden /> 3. Abre ÉLITE desde el ícono para recibir notificaciones.</li>
            </ol>
          ) : (
            <div className="mt-4">
              <p className="text-sm text-muted">Instálala para abrirla como una app y recibir avisos de tus clases.</p>
              <button type="button" className="btn-ball mt-4" disabled={!install.canPrompt} onClick={() => install.install()}>
                <Download size={16} aria-hidden /> {install.canPrompt ? "Instalar app" : "Instalación no disponible en este navegador"}
              </button>
            </div>
          )}
          <Link to="/compatibilidad" className="mt-4 inline-block text-sm font-bold text-ball-text underline-offset-4 hover:underline">
            Ver compatibilidad en Android e iOS
          </Link>
        </section>

        <section className="card p-5 sm:p-6 lg:col-span-2" aria-labelledby="notif-title">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="notif-title" className="label-caps text-muted">
              Qué notificaciones recibir
            </h2>
            <button type="button" className="btn-ghost py-2" onClick={testNotification}>
              <BellRing size={16} aria-hidden /> Enviar notificación de prueba
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">
            Permiso del sistema: <strong>{{ granted: "concedido", denied: "bloqueado", default: "sin pedir", unsupported: "no disponible" }[perm]}</strong>. Siempre verás los avisos en la app.
          </p>
          {prefs.loading ? (
            <Skeleton className="mt-4 h-48" />
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {(Object.keys(PREF_LABELS) as (keyof NotificationPrefs)[]).map((k) => (
                <li key={k} className="flex items-center justify-between gap-4 py-3.5">
                  <span>
                    <span className="block font-bold">{PREF_LABELS[k].label}</span>
                    <span className="block text-sm text-muted">{PREF_LABELS[k].hint}</span>
                  </span>
                  <Switch checked={!!prefs.data?.[k]} onChange={(v) => setPref(k, v)} label={PREF_LABELS[k].label} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
