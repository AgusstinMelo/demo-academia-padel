import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { business } from "../config";
import { dismissToast, useToasts, type ToastTone } from "../lib/toast";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="relative grid size-9 place-items-center rounded-full bg-ball text-ball-ink" aria-hidden>
        {/* Pelota estilizada */}
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4.5 6.5c3 2.2 3 8.8 0 11M19.5 6.5c-3 2.2-3 8.8 0 11" />
        </svg>
      </span>
      {!compact && (
        <span className="display text-[22px] leading-none">
          {business.name.split(" ")[0]} <span className="text-ball-text">{business.name.split(" ")[1]}</span>
        </span>
      )}
    </span>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}

export type Tone = "ok" | "warn" | "bad" | "info" | "neutral" | "ball";
const TONES: Record<Tone, string> = {
  ok: "bg-ok/12 text-ok",
  warn: "bg-warn/15 text-warn",
  bad: "bg-bad/12 text-bad",
  info: "bg-info/12 text-info",
  neutral: "bg-surface-2 text-muted",
  ball: "bg-ball/15 text-ball-text",
};
export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap ${TONES[tone]}`}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {children}
    </span>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="display text-4xl sm:text-5xl">{title}</h1>
        {subtitle && <p className="mt-2 text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Empty({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="card grid place-items-center gap-2 px-6 py-12 text-center">
      {icon && <span className="text-muted">{icon}</span>}
      <p className="font-bold">{title}</p>
      {children && <div className="max-w-sm text-sm text-muted">{children}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, icon, loading, accent }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode; loading?: boolean; accent?: boolean }) {
  return (
    <div className={`card p-4 sm:p-5 ${accent ? "border-ball/40 bg-gradient-to-br from-ball/10 to-transparent" : ""}`}>
      <div className="flex items-center justify-between gap-2 text-sm text-muted">
        {label}
        {icon && <span className="text-ball-text">{icon}</span>}
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-2/3" />
      ) : (
        <>
          <p className="display mt-2 text-4xl tabular-nums">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
        </>
      )}
    </div>
  );
}

export function Segmented<T extends string | number>({ value, options, onChange, label, size = "md" }: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  label: string;
  size?: "sm" | "md";
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full border border-line bg-surface-2/60 p-1">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-full font-bold transition ${size === "sm" ? "px-3 py-1 text-xs" : "px-4 py-2 text-sm"} ${value === o.value ? "bg-ball text-ball-ink" : "text-muted hover:text-text"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Avatar({ name, photo, size = 40 }: { name: string; photo?: string; size?: number }) {
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("");
  return photo ? (
    <img src={`${photo}?auto=format&fit=crop&w=${size * 2}&h=${size * 2}&q=60`} alt="" width={size} height={size} loading="lazy" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="grid shrink-0 place-items-center rounded-full bg-court/20 font-bold text-court" style={{ width: size, height: size, fontSize: size * 0.36 }} aria-hidden>
      {initials}
    </span>
  );
}

/** Modal accesible: en celular se abre como hoja inferior */
export function Modal({ open, onClose, title, children, footer, wide }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>("input, select, textarea, button:not([data-close])")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && panel.current) {
        const f = [...panel.current.querySelectorAll<HTMLElement>("a, button, input, select, textarea, [tabindex]:not([tabindex='-1'])")].filter((el) => !el.hasAttribute("disabled"));
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) (e.preventDefault(), f[f.length - 1].focus());
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) (e.preventDefault(), f[0].focus());
      }
    };
    document.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
      prev?.focus();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby={id}>
          <m.button
            type="button"
            tabIndex={-1}
            aria-label="Cerrar"
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <m.div
            ref={panel}
            className={`relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] border border-line bg-surface shadow-2xl sm:rounded-[28px] ${wide ? "sm:max-w-3xl" : "sm:max-w-lg"}`}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
              <h2 id={id} className="text-lg font-extrabold">
                {title}
              </h2>
              <button type="button" data-close onClick={onClose} className="grid size-9 place-items-center rounded-full border border-line text-muted hover:text-text" aria-label="Cerrar">
                <X size={18} />
              </button>
            </header>
            <div className="overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
            {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4 pb-[max(16px,env(safe-area-inset-bottom))] sm:px-6">{footer}</footer>}
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
}

const TOAST_ICON: Record<ToastTone, ReactNode> = {
  ok: <CheckCircle2 size={20} className="text-ok" />,
  info: <Info size={20} className="text-info" />,
  warn: <AlertTriangle size={20} className="text-warn" />,
  err: <XCircle size={20} className="text-bad" />,
};

export function Toasts() {
  const list = useToasts();
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[80] flex flex-col items-center gap-2 px-3 sm:top-auto sm:right-4 sm:bottom-4 sm:left-auto sm:items-end" role="status" aria-live="polite">
      <AnimatePresence>
        {list.map((t) => (
          <m.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass pointer-events-auto flex w-full max-w-sm gap-3 rounded-2xl border border-line p-4 shadow-2xl"
          >
            <span className="mt-0.5 shrink-0">{TOAST_ICON[t.tone]}</span>
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-bold">{t.title}</p>
              {t.body && <p className="mt-0.5 text-muted">{t.body}</p>}
            </div>
            <button type="button" onClick={() => dismissToast(t.id)} className="text-muted hover:text-text" aria-label="Cerrar aviso">
              <X size={16} />
            </button>
          </m.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
