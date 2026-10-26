import { ArrowRight, ArrowUpRight, BellRing, CalendarCheck, Clock, Download, Mail, MapPin, Menu, MessageCircle, Plus, Share, Smartphone, SquarePlus, Star, X } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { business, packs, site } from "../config";
import { Logo } from "../components/ui";
import { PackCard } from "../components/PackCard";
import { useInstall } from "../pwa/pwa";
import { Counter, Reveal, RotatingWord, SplitWords } from "./motion";

const wa = (msg: string) => `https://wa.me/${business.whatsapp}?text=${encodeURIComponent(msg)}`;
const img = (url: string, w: number, h: number) => `${url}?auto=format&fit=crop&w=${w}&h=${h}&q=60`;
const srcSet = (url: string, ratio: number, widths = [480, 828, 1200, 1600]) => widths.map((w) => `${img(url, w, Math.round(w * ratio))} ${w}w`).join(", ");

function SectionTitle({ index, label, title, children }: { index: string; label: string; title: string; children?: ReactNode }) {
  return (
    <Reveal className="mb-10 sm:mb-14">
      <p className="label-caps flex items-center gap-3 text-muted">
        <span className="text-ball-text">{index}</span> / {label}
        <span className="h-px flex-1 bg-line" aria-hidden />
      </p>
      <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <h2 className="display max-w-4xl text-[length:var(--t-h2)]">{title}</h2>
        {children && <p className="max-w-sm text-muted">{children}</p>}
      </div>
    </Reveal>
  );
}

function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 30);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <p className="bg-ball py-1 text-center text-[11px] font-bold text-ball-ink">{business.demoBanner}</p>
      <div className={`transition-colors duration-300 ${scrolled || open ? "glass border-b border-line" : ""}`}>
        <div className="wrap flex h-16 items-center gap-4">
          <a href="#top" aria-label={`${business.name}, inicio`}>
            <Logo />
          </a>
          <nav className="ml-auto hidden lg:block" aria-label="Secciones">
            <ul className="flex gap-1">
              {site.nav.map((n) => (
                <li key={n.href}>
                  <a href={n.href} className="rounded-full px-4 py-2 text-sm font-bold text-muted hover:text-text">
                    {n.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <Link to="/app/login" className="btn-ghost hidden py-2.5 sm:inline-flex">
              Ingresar
            </Link>
            <Link to="/app/login" className="btn-ball py-2.5">
              Reserva tu clase
            </Link>
            <button type="button" onClick={() => setOpen((o) => !o)} className="grid size-11 place-items-center rounded-full border border-line lg:hidden" aria-expanded={open} aria-controls="mnav" aria-label={open ? "Cerrar menú" : "Abrir menú"}>
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        <AnimatePresence>
          {open && (
            <m.nav id="mnav" aria-label="Secciones" className="wrap pb-6 lg:hidden" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <ul>
                {site.nav.map((n) => (
                  <li key={n.href} className="border-b border-line">
                    <a href={n.href} onClick={() => setOpen(false)} className="display block py-4 text-4xl">
                      {n.label}
                    </a>
                  </li>
                ))}
              </ul>
              <Link to="/app/login" className="btn-ghost mt-5 w-full">
                Ingresar a la app
              </Link>
            </m.nav>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}

function InstallSection() {
  const install = useInstall();
  return (
    <section id="app" className="relative overflow-hidden border-y border-line bg-surface" aria-labelledby="app-title">
      <div className="glow glow-court -top-40 -left-40 size-[600px]" aria-hidden />
      <div className="wrap relative grid items-center gap-12 py-[var(--section-y)] lg:grid-cols-2">
        <div>
          <p className="label-caps text-ball-text">08 / La app</p>
          <h2 id="app-title" className="display mt-4 text-[length:var(--t-h2)]">
            Instala la app en tu celular
          </h2>
          <p className="mt-4 max-w-md text-muted">Sin pasar por la tienda de apps: reservas en segundos, ves tus créditos y recibes recordatorios de clase y avisos de vencimiento.</p>
          <ul className="mt-6 grid gap-3 text-sm">
            {[
              [CalendarCheck, "Cupos en tiempo real y reserva en dos toques"],
              [BellRing, "Notificaciones: recordatorios, pagos y vencimientos"],
              [Smartphone, "Se abre a pantalla completa, como cualquier app"],
            ].map(([Icon, t]) => {
              const I = Icon as typeof CalendarCheck;
              return (
                <li key={t as string} className="flex items-center gap-3">
                  <I size={18} className="shrink-0 text-ball-text" aria-hidden /> {t as string}
                </li>
              );
            })}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            {install.installed ? (
              <p className="font-bold text-ok">Ya tienes la app instalada ✓</p>
            ) : install.canPrompt ? (
              <button type="button" onClick={() => install.install()} className="btn-ball px-6 py-3.5">
                <Download size={18} aria-hidden /> Instalar app
              </button>
            ) : (
              <Link to="/app/login" className="btn-ball px-6 py-3.5">
                Abrir la app <ArrowRight size={18} aria-hidden />
              </Link>
            )}
            <Link to="/compatibilidad" className="btn-ghost px-6 py-3.5">
              Compatibilidad Android / iOS
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="card p-6">
            <p className="label-caps text-muted">Android · Chrome</p>
            <ol className="mt-4 space-y-3 text-sm">
              <li className="flex gap-3"><span className="display text-2xl text-ball-text">1</span> Toca «Instalar app» o el aviso de Chrome.</li>
              <li className="flex gap-3"><span className="display text-2xl text-ball-text">2</span> Confirma con «Instalar».</li>
              <li className="flex gap-3"><span className="display text-2xl text-ball-text">3</span> Abre ÉLITE desde tu pantalla de inicio.</li>
            </ol>
          </div>
          <div className="card p-6">
            <p className="label-caps text-muted">iPhone · Safari</p>
            <ol className="mt-4 space-y-3 text-sm">
              <li className="flex items-center gap-3"><Share size={20} className="shrink-0 text-ball-text" aria-hidden /> Toca <strong>Compartir</strong>.</li>
              <li className="flex items-center gap-3"><SquarePlus size={20} className="shrink-0 text-ball-text" aria-hidden /> Elige <strong>Agregar a inicio</strong>.</li>
              <li className="flex items-center gap-3"><BellRing size={20} className="shrink-0 text-ball-text" aria-hidden /> Abre la app y activa los avisos (iOS 16.4+).</li>
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const [faq, setFaq] = useState<number | null>(0);
  // Primero se pinta el hero; el resto de la página se monta en otra tarea, cuando el navegador
  // está libre. Así el primer render no bloquea el hilo principal en celulares lentos.
  const [rest, setRest] = useState(false);
  useEffect(() => {
    const show = () => setRest(true);
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(show, { timeout: 600 });
    else setTimeout(show, 50);
  }, []);
  // Si se entra con un ancla (/#packs), se monta todo enseguida para poder saltar a la sección
  useEffect(() => {
    if (location.hash) setRest(true);
  }, []);
  useEffect(() => {
    document.title = `${business.name} · Clases de pádel en Medellín`;
  }, []);
  const coaches = site.coaches;

  return (
    <div className="grain">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[90] focus:rounded-full focus:bg-ball focus:px-4 focus:py-2 focus:text-ball-ink">
        Saltar al contenido
      </a>
      <Header />
      <main id="main">
        {/* Hero */}
        <section id="top" className="relative flex min-h-[100svh] items-end overflow-hidden pt-32 pb-14 sm:pb-20">
          <img
            src={img(site.hero.image, 1200, 800)}
            srcSet={srcSet(site.hero.image, 1333 / 2000, [480, 828, 1200, 1600, 2000])}
            sizes="100vw"
            alt={site.hero.imageAlt}
            width={2000}
            height={1333}
            fetchPriority="high"
            className="absolute inset-0 -z-10 size-full object-cover object-[65%_center]"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-bg via-bg/55 to-bg/20" aria-hidden />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-bg/80 to-transparent" aria-hidden />
          <div className="glow -bottom-48 -left-40 -z-10 size-[620px]" aria-hidden />

          <div className="wrap">
            <p className="label-caps mb-5 flex items-center gap-3 text-ball-text">
              <span className="h-px w-10 bg-ball" aria-hidden /> {site.hero.eyebrow}
            </p>
            <h1 className="display text-[length:var(--t-hero)]">
              <SplitWords text={site.hero.titleTop} className="block" />
              <span className="block text-ball-text">
                <RotatingWord words={site.hero.rotating} />
              </span>
              <SplitWords text={site.hero.titleBottom} className="block" delay={0.2} />
            </h1>
            <div className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <p className="max-w-md text-lg text-text/85">{site.hero.subtitle}</p>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => navigate("/app/login")} className="btn-ball px-7 py-4 text-base">
                  {site.hero.cta} <ArrowUpRight size={18} aria-hidden />
                </button>
                <a href="#packs" className="btn-ghost px-7 py-4 text-base">
                  {site.hero.secondary}
                </a>
              </div>
            </div>
          </div>

          <a
            href={wa(site.hero.trialMessage)}
            target="_blank"
            rel="noopener"
            className="glass absolute top-28 right-[var(--gutter)] flex items-center gap-2 rounded-full border border-ball/50 px-4 py-2.5 text-sm font-bold sm:top-36"
          >
            <span className="relative flex size-2.5" aria-hidden>
              <span className="pulse-ring absolute inset-0 rounded-full bg-ball" />
              <span className="relative size-2.5 rounded-full bg-ball" />
            </span>
            {site.hero.badge} · gratis
          </a>
        </section>

        {rest && (
          <>
        {/* Marquee */}
        <div className="overflow-x-clip border-y border-line bg-surface py-5" aria-hidden>
          <div className="marquee-track flex w-max">
            {[0, 1].map((k) => (
              <ul key={k} className="flex shrink-0">
                {site.marquee.map((m) => (
                  <li key={m} className="display flex items-center gap-8 px-6 text-[clamp(28px,4vw,48px)]">
                    {m} <span className="size-3 rounded-full bg-ball" />
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>

        {/* Cifras */}
        <section aria-label="ÉLITE en números" className="wrap pt-[var(--section-y)]">
          <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line lg:grid-cols-4">
            {site.stats.map((s) => (
              <li key={s.label} className="bg-bg p-6 sm:p-8">
                <p className="display text-[clamp(48px,7vw,96px)]">
                  <Counter to={s.value} suffix={s.suffix} />
                </p>
                <p className="label-caps mt-2 text-muted">{s.label}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Programas */}
        <section id="programas" className="wrap py-[var(--section-y)]">
          <SectionTitle index="01" label="Programas" title="Un nivel para cada jugador">
            Grupos de máximo 4 alumnos del mismo nivel. Te evaluamos en la clase de prueba.
          </SectionTitle>
          <div className="grid gap-4 md:grid-cols-3 md:grid-rows-2">
            {site.programs.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.08} className={i === 0 ? "md:row-span-2" : i === 3 ? "md:col-span-2" : ""}>
                <article className="group relative h-full min-h-[300px] overflow-hidden rounded-card">
                  <img
                    src={img(p.image, 900, i === 0 ? 1200 : 640)}
                    srcSet={srcSet(p.image, i === 0 ? 4 / 3 : 0.7, [480, 900, 1300])}
                    sizes={i === 0 ? "(min-width: 768px) 33vw, 100vw" : "(min-width: 768px) 66vw, 100vw"}
                    alt=""
                    width={900}
                    height={i === 0 ? 1200 : 640}
                    loading="lazy"
                    className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent" aria-hidden />
                  <div className="relative flex h-full flex-col justify-end p-6 sm:p-8">
                    <span className="label-caps text-ball-text">0{i + 1}</span>
                    <h3 className={`display mt-2 ${i === 0 ? "text-6xl" : "text-5xl"}`}>{p.title}</h3>
                    <p className="mt-2 max-w-sm text-text/85">{p.text}</p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Profesores */}
        <section id="profesores" className="wrap pb-[var(--section-y)]">
          <SectionTitle index="02" label="Profesores" title="Entrenadores certificados" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {coaches.map((c, i) => (
              <Reveal key={c.name} delay={i * 0.08}>
                <figure>
                  <img src={img(c.photo, 600, 720)} srcSet={srcSet(c.photo, 1.2, [320, 480, 640])} sizes="(min-width: 1024px) 25vw, 50vw" alt={`Foto de ${c.name}`} width={600} height={720} loading="lazy" className="aspect-[5/6] w-full rounded-card object-cover grayscale-[0.3]" />
                  <figcaption className="mt-3">
                    <p className="font-extrabold">{c.name}</p>
                    <p className="text-sm text-ball-text">{c.role}</p>
                    <p className="text-sm text-muted">
                      {c.level} · {c.specialty}
                    </p>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Packs */}
        <section id="packs" className="relative border-y border-line bg-surface/50 py-[var(--section-y)]">
          <div className="glow top-1/3 left-1/2 size-[640px] -translate-x-1/2" aria-hidden />
          <div className="wrap relative">
            <SectionTitle index="03" label="Packs" title="Elige tu pack">
              Precios en pesos colombianos. Todos los packs son válidos por 60 días.
            </SectionTitle>
            <div className="grid gap-5 pt-3 md:grid-cols-3">
              {packs.map((p) => (
                <Reveal key={p.id}>
                  <PackCard p={p} onChoose={() => navigate("/app/login")} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Cómo funciona */}
        <section className="wrap py-[var(--section-y)]" aria-labelledby="how-title">
          <Reveal className="mb-10">
            <p className="label-caps text-muted"><span className="text-ball-text">04</span> / Cómo funciona</p>
            <h2 id="how-title" className="display mt-5 text-[length:var(--t-h2)]">Tres pasos y a jugar</h2>
          </Reveal>
          <ol className="grid gap-4 md:grid-cols-3">
            {site.howItWorks.map((s, i) => (
              <li key={s.title}>
                <Reveal delay={i * 0.1} className="card h-full p-6 sm:p-8">
                  <span className="display text-7xl text-ball-text">{i + 1}</span>
                  <h3 className="mt-4 text-xl font-extrabold">{s.title}</h3>
                  <p className="mt-2 text-muted">{s.text}</p>
                </Reveal>
              </li>
            ))}
          </ol>
        </section>

        <InstallSection />

        {/* Testimonios */}
        <section className="wrap py-[var(--section-y)]" aria-labelledby="t-title">
          <Reveal className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="label-caps text-muted"><span className="text-ball-text">05</span> / Alumnos</p>
              <h2 id="t-title" className="display mt-5 text-[length:var(--t-h2)]">Lo que dicen</h2>
            </div>
            <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-bold text-muted">Testimonios de ejemplo</span>
          </Reveal>
          <div className="grid gap-4 md:grid-cols-3">
            {site.testimonials.map((t, i) => (
              <Reveal key={t.name} delay={i * 0.08}>
                <figure className="card flex h-full flex-col p-6">
                  <div className="flex gap-1 text-ball-text" role="img" aria-label="5 de 5 estrellas">
                    {Array.from({ length: 5 }, (_, k) => <Star key={k} size={16} fill="currentColor" strokeWidth={0} aria-hidden />)}
                  </div>
                  <blockquote className="mt-4 flex-1 text-lg font-semibold">“{t.quote}”</blockquote>
                  <figcaption className="mt-5 text-sm">
                    <strong>{t.name}</strong> <span className="text-muted">· {t.detail}</span>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="wrap grid gap-10 pb-[var(--section-y)] lg:grid-cols-[1fr_1.4fr]" aria-labelledby="faq-title">
          <Reveal>
            <p className="label-caps text-muted"><span className="text-ball-text">06</span> / Preguntas</p>
            <h2 id="faq-title" className="display mt-5 text-[length:var(--t-h2)]">Preguntas frecuentes</h2>
          </Reveal>
          <ul className="border-t border-line">
            {site.faq.map((f, i) => (
              <li key={f.q} className="border-b border-line">
                <h3>
                  <button type="button" aria-expanded={faq === i} aria-controls={`faq-${i}`} onClick={() => setFaq(faq === i ? null : i)} className="flex w-full items-center justify-between gap-4 py-5 text-left text-lg font-bold">
                    {f.q}
                    <m.span animate={{ rotate: faq === i ? 45 : 0 }} className={`grid size-9 shrink-0 place-items-center rounded-full border ${faq === i ? "border-ball bg-ball text-ball-ink" : "border-line"}`}>
                      <Plus size={16} aria-hidden />
                    </m.span>
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {faq === i && (
                    <m.div id={`faq-${i}`} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <p className="pb-5 text-muted">{f.a}</p>
                    </m.div>
                  )}
                </AnimatePresence>
              </li>
            ))}
          </ul>
        </section>

        {/* Ubicación */}
        <section id="ubicacion" className="wrap pb-[var(--section-y)]" aria-labelledby="loc-title">
          <Reveal className="mb-10">
            <p className="label-caps text-muted"><span className="text-ball-text">07</span> / Ubicación</p>
            <h2 id="loc-title" className="display mt-5 text-[length:var(--t-h2)]">Ven a jugar</h2>
          </Reveal>
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <iframe
              title={`Mapa: ${business.name} en ${business.address.area}`}
              src={`https://www.google.com/maps?q=${encodeURIComponent(business.mapQuery)}&z=15&output=embed`}
              loading="lazy"
              width="800"
              height="380"
              className="h-80 w-full rounded-card border border-line [filter:invert(0.92)_hue-rotate(180deg)_grayscale(0.5)] lg:h-full lg:min-h-96"
            />
            <div className="card space-y-5 p-6">
              <p className="flex gap-3"><MapPin size={20} className="mt-0.5 shrink-0 text-ball-text" aria-hidden /><span>{business.address.street}<br /><span className="text-muted">{business.address.area}, {business.address.city}</span></span></p>
              <div className="flex gap-3"><Clock size={20} className="mt-0.5 shrink-0 text-ball-text" aria-hidden /><ul className="text-sm">{business.openingHours.map((h) => <li key={h.days}>{h.days}: <span className="text-muted">{h.time}</span></li>)}</ul></div>
              <p className="flex gap-3"><Mail size={20} className="mt-0.5 shrink-0 text-ball-text" aria-hidden /><a href={`mailto:${business.email}`} className="underline-offset-4 hover:underline">{business.email}</a></p>
              <a href={wa(site.hero.trialMessage)} target="_blank" rel="noopener" className="btn-ball w-full">
                <MessageCircle size={18} aria-hidden /> Agenda tu clase de prueba
              </a>
            </div>
          </div>
        </section>
          </>
        )}
      </main>

      {rest && (
        <>
      <footer className="border-t border-line py-10 text-sm text-muted">
        <div className="wrap flex flex-wrap items-center justify-between gap-4">
          <Logo />
          <nav aria-label="Pie de página" className="flex flex-wrap gap-4">
            {business.socials.map((s) => <a key={s.label} href={s.href} target="_blank" rel="noopener" className="hover:text-text">{s.label}</a>)}
            <Link to="/compatibilidad" className="hover:text-text">Compatibilidad de la app</Link>
          </nav>
          <p>© {new Date().getFullYear()} {business.name} · {business.demoBanner}</p>
        </div>
      </footer>

      {/* WhatsApp flotante */}
      <a href={wa(site.hero.trialMessage)} target="_blank" rel="noopener" className="glass fixed right-5 bottom-5 z-50 grid size-14 place-items-center rounded-full border border-ball/50 text-ball-text shadow-xl" aria-label="Escríbenos por WhatsApp">
        <span className="pulse-ring absolute inset-0 rounded-full border-2 border-ball" aria-hidden />
        <MessageCircle size={26} aria-hidden />
      </a>
        </>
      )}
    </div>
  );
}
