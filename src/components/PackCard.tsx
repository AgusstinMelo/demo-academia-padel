import { Check } from "lucide-react";
import type { PackDef } from "../config";
import { packPricing } from "../domain/credits";
import { cop } from "../lib/toast";

/** Tarjeta de pack (web pública y app) */
export function PackCard({ p, onChoose }: { p: PackDef; onChoose: () => void }) {
  const pricing = packPricing(p.id);
  return (
    <article className={`relative flex flex-col rounded-card border p-6 ${p.featured ? "border-ball bg-gradient-to-b from-ball/12 to-surface" : "border-line bg-surface"}`}>
      {p.featured && <span className="label-caps absolute -top-3 left-6 rounded-full bg-ball px-3 py-1.5 text-ball-ink">Más elegido</span>}
      <h3 className="display text-3xl">{p.name}</h3>
      <p className="display mt-4 text-5xl">{cop(p.price)}</p>
      <p className="mt-1 text-sm text-muted">
        {cop(pricing.perClass)} por clase
        {pricing.savings > 0 && <span className="ml-2 font-bold text-ok">Ahorras {cop(pricing.savings)}</span>}
      </p>
      <ul className="mt-5 flex-1 space-y-2 text-sm">
        {p.perks.map((perk) => (
          <li key={perk} className="flex gap-2">
            <Check size={16} className="mt-0.5 shrink-0 text-ball-text" aria-hidden /> {perk}
          </li>
        ))}
      </ul>
      <button type="button" onClick={onChoose} className={`mt-6 w-full ${p.featured ? "btn-ball" : "btn-ghost"}`}>
        Elegir {p.classes === 1 ? "clase suelta" : `pack de ${p.classes}`}
      </button>
    </article>
  );
}
