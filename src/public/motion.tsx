// Animaciones de la web pública (respetan prefers-reduced-motion vía MotionConfig y useReducedMotion).
import { animate, m, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;

/** true si el HTML ya pintó el hero estático (index.html): no se repite la animación de entrada */
const shellShown = typeof window !== "undefined" && (window as Window & { __eliteShell?: boolean }).__eliteShell === true;

export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <m.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.8, delay, ease: EASE }}
    >
      {children}
    </m.div>
  );
}

/** Palabras que entran una a una desde abajo (con aire arriba para las tildes) */
export function SplitWords({ text, delay = 0, className = "" }: { text: string; delay?: number; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <m.span className={className} initial={reduced || shellShown ? false : "hidden"} animate="show" transition={{ staggerChildren: 0.08, delayChildren: delay }}>
      {text.split(" ").map((w, i, all) => (
        <span key={i} className="-mt-[0.15em] inline-block overflow-hidden pt-[0.15em] pb-[0.05em] align-bottom">
          <m.span className="inline-block" variants={{ hidden: { y: "105%" }, show: { y: 0, transition: { duration: 0.85, ease: EASE } } }}>
            {w}
          </m.span>
          {i < all.length - 1 && " "}
        </span>
      ))}
    </m.span>
  );
}

export function RotatingWord({ words, className = "" }: { words: string[]; className?: string }) {
  const reduced = useReducedMotion();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduced) return;
    const t = setInterval(() => setI((n) => (n + 1) % words.length), 2200);
    return () => clearInterval(t);
  }, [reduced, words.length]);
  const longest = words.reduce((a, b) => (b.length > a.length ? b : a));
  return (
    <span className={`relative -mt-[0.15em] inline-grid overflow-hidden pt-[0.15em] align-bottom ${className}`}>
      <span className="invisible col-start-1 row-start-1" aria-hidden>
        {longest}
      </span>
      <span className="sr-only">{words.join(", ")}</span>
      {words.map((w, n) => (
        <m.span
          key={w}
          aria-hidden
          className="col-start-1 row-start-1 whitespace-nowrap"
          initial={false}
          animate={n === i ? { y: "0%", opacity: 1 } : { y: n === (i - 1 + words.length) % words.length ? "-100%" : "100%", opacity: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          {w}
        </m.span>
      ))}
    </span>
  );
}

export function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -15% 0px" });
  const reduced = useReducedMotion();
  const [v, setV] = useState(reduced ? to : 0);
  useEffect(() => {
    if (!inView || reduced) return;
    const c = animate(0, to, { duration: 1.8, ease: EASE, onUpdate: (n) => setV(Math.round(n)) });
    return () => c.stop();
  }, [inView, reduced, to]);
  return (
    <span ref={ref} className="tabular-nums">
      {new Intl.NumberFormat("es-CO").format(v)}
      {suffix}
    </span>
  );
}
