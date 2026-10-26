import { Building2, Check, CreditCard, Lock, Smartphone, Upload } from "lucide-react";
import { useState, type ChangeEvent } from "react";
import { packs, paymentMethods, rules, type PackDef, type PaymentMethod } from "../../config";
import { useApp, useUser } from "../../context/AppContext";
import { data, DomainError } from "../../data";
import { daysToExpiry, packDef, packStatus } from "../../domain/credits";
import { fmt, fmtDateTime } from "../../domain/time";
import { compressImage } from "../../lib/image";
import { cop, useQuery } from "../../lib/ui-state";
import { PackCard } from "../../components/PackCard";
import { Badge, Modal, PageHeader, Segmented, Skeleton } from "../../components/ui";
import { PACK_STATUS, PAYMENT_STATUS } from "../status";

const METHOD_ICON: Record<PaymentMethod, typeof CreditCard> = { transfer: Building2, nequi: Smartphone, gateway: CreditCard };

type Step = "method" | "manual" | "gateway" | "processing" | "done";

function BuyFlow({ pack, onClose }: { pack: PackDef; onClose: () => void }) {
  const [step, setStep] = useState<Step>("method");
  const [method, setMethod] = useState<PaymentMethod>("gateway");
  const [receipt, setReceipt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<"approved" | "pending" | null>(null);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      setReceipt(await compressImage(f));
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const submit = async () => {
    if (method !== "gateway" && !receipt) return setError("Sube la foto o captura del comprobante.");
    setStep("processing");
    try {
      // Pasarela simulada (tipo Wompi / Mercado Pago): en producción, redirección + webhook que activa el pack
      if (method === "gateway") await new Promise((r) => setTimeout(r, 1400));
      const { payment } = await data.buyPack({ packId: pack.id, method, receipt: receipt ?? undefined });
      setResult(payment.status === "approved" ? "approved" : "pending");
      setStep("done");
    } catch (e) {
      setError((e as DomainError).message);
      setStep(method === "gateway" ? "gateway" : "manual");
    }
  };

  const footer =
    step === "method" ? (
      <button type="button" className="btn-ball" onClick={() => setStep(method === "gateway" ? "gateway" : "manual")}>
        Continuar
      </button>
    ) : step === "manual" ? (
      <>
        <button type="button" className="btn-ghost" onClick={() => setStep("method")}>
          Atrás
        </button>
        <button type="button" className="btn-ball" onClick={submit}>
          Enviar comprobante
        </button>
      </>
    ) : step === "gateway" ? (
      <>
        <button type="button" className="btn-ghost" onClick={() => setStep("method")}>
          Atrás
        </button>
        <button type="button" className="btn-ball" onClick={submit}>
          <Lock size={15} aria-hidden /> Pagar {cop(pack.price)}
        </button>
      </>
    ) : step === "done" ? (
      <button type="button" className="btn-ball" onClick={onClose}>
        Listo
      </button>
    ) : null;

  return (
    <Modal open onClose={onClose} title={`Comprar ${pack.name}`} footer={footer}>
      <div className="mb-5 flex items-baseline justify-between rounded-2xl bg-surface-2 p-4">
        <span className="font-bold">{pack.name}</span>
        <span className="display text-3xl">{cop(pack.price)}</span>
      </div>

      {step === "method" && (
        <fieldset>
          <legend className="field-label">¿Cómo quieres pagar?</legend>
          <div className="grid gap-2">
            {(Object.keys(paymentMethods) as PaymentMethod[]).map((m) => {
              const Icon = METHOD_ICON[m];
              return (
                <label key={m} className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition ${method === m ? "border-ball bg-ball/10" : "border-line hover:bg-surface-2"}`}>
                  <input type="radio" name="method" value={m} checked={method === m} onChange={() => setMethod(m)} className="sr-only" />
                  <Icon size={22} className="shrink-0 text-ball-text" aria-hidden />
                  <span className="flex-1">
                    <span className="block font-bold">{paymentMethods[m].label}</span>
                    <span className="block text-xs text-muted">{m === "gateway" ? "Aprobación inmediata" : "Subes el comprobante y lo confirmamos"}</span>
                  </span>
                  <span className={`grid size-5 place-items-center rounded-full border ${method === m ? "border-ball bg-ball text-ball-ink" : "border-line"}`} aria-hidden>
                    {method === m && <Check size={12} strokeWidth={3} />}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {step === "manual" && method !== "gateway" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-line p-4 text-sm">
            <p className="font-bold">1. Transfiere {cop(pack.price)}</p>
            <p className="mt-1 text-muted">{paymentMethods[method].detail}</p>
          </div>
          <div>
            <p className="field-label">2. Sube el comprobante</p>
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line p-6 text-center text-sm transition hover:border-court">
              {receipt ? (
                <img src={receipt} alt="Vista previa del comprobante" className="max-h-48 rounded-xl" />
              ) : (
                <>
                  <Upload size={24} className="text-muted" aria-hidden />
                  <span className="font-bold">Toca para elegir la foto o captura</span>
                  <span className="text-xs text-muted">JPG o PNG</span>
                </>
              )}
              <input type="file" accept="image/*" className="sr-only" onChange={onFile} aria-describedby={error ? "receipt-err" : undefined} />
            </label>
            {error && <p id="receipt-err" className="mt-2 text-sm text-bad">{error}</p>}
          </div>
          <p className="text-xs text-muted">Tu pack quedará pendiente hasta que validemos el pago (normalmente en pocas horas).</p>
        </div>
      )}

      {step === "gateway" && (
        // Checkout simulado: en producción es el widget/redirect de Wompi o Mercado Pago (no se piden datos de tarjeta aquí)
        <div className="space-y-3">
          <div className="rounded-2xl border border-line p-4">
            <p className="label-caps text-muted">Pasarela de pago · simulada</p>
            <p className="mt-2 text-sm">En la versión real se abre el checkout seguro de la pasarela (tarjeta, PSE o Nequi). En esta demo el pago se aprueba al instante.</p>
          </div>
          {error && <p className="text-sm text-bad">{error}</p>}
        </div>
      )}

      {step === "processing" && (
        <div className="py-8 text-center" role="status">
          <span className="mx-auto block size-12 animate-spin rounded-full border-4 border-line border-t-ball" aria-hidden />
          <p className="mt-4 font-bold">{method === "gateway" ? "Procesando el pago…" : "Enviando comprobante…"}</p>
        </div>
      )}

      {step === "done" && (
        <div className="py-6 text-center">
          <span className={`mx-auto grid size-16 place-items-center rounded-full ${result === "approved" ? "bg-ok/15 text-ok" : "bg-warn/15 text-warn"}`}>
            <Check size={32} strokeWidth={3} aria-hidden />
          </span>
          <p className="mt-4 text-lg font-extrabold">{result === "approved" ? "¡Pack activado!" : "Comprobante recibido"}</p>
          <p className="mt-1 text-sm text-muted">
            {result === "approved"
              ? `Tienes ${pack.classes} ${pack.classes === 1 ? "clase" : "clases"} para usar en los próximos ${rules.packValidityDays} días.`
              : "Te avisaremos cuando confirmemos el pago y se active tu pack."}
          </p>
        </div>
      )}
    </Modal>
  );
}

export function Packs() {
  const user = useUser();
  const { now } = useApp();
  const [buying, setBuying] = useState<PackDef | null>(null);
  const [tab, setTab] = useState<"packs" | "payments">("packs");
  const [receipt, setReceipt] = useState<string | null>(null);
  const mine = useQuery(`packs:${user.id}`, () => data.getUserPacks(user.id));
  const payments = useQuery(`pay:${user.id}`, () => data.getPayments({ userId: user.id }));

  return (
    <>
      <PageHeader title="Elige tu pack" subtitle={`Todos los packs son válidos por ${rules.packValidityDays} días desde que se activan.`} />
      <div className="grid gap-5 pt-3 md:grid-cols-3">
        {packs.map((p) => (
          <PackCard key={p.id} p={p} onChoose={() => setBuying(p)} />
        ))}
      </div>

      <div className="mt-10 mb-4">
        <Segmented
          label="Historial"
          value={tab}
          onChange={setTab}
          options={[
            { value: "packs", label: "Mis packs" },
            { value: "payments", label: "Mis pagos" },
          ]}
        />
      </div>

      {tab === "packs" ? (
        mine.loading ? (
          <Skeleton className="h-40" />
        ) : (
          <ul className="grid gap-3">
            {(mine.data ?? []).map((p) => {
              const st = PACK_STATUS[packStatus(p, now)];
              const days = daysToExpiry(p, now);
              return (
                <li key={p.id} className="card flex flex-wrap items-center gap-4 p-4 sm:p-5">
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold">{packDef(p.packId).name}</p>
                    <p className="text-sm text-muted">
                      {p.expiresAt ? `Vence el ${fmt(p.expiresAt, "d 'de' MMMM")}${days !== null && days >= 0 ? ` (${days} días)` : ""}` : `Comprado el ${fmt(p.createdAt, "d 'de' MMMM")}`}
                    </p>
                  </div>
                  <p className="text-sm">
                    <strong className="display text-2xl">{p.remaining}</strong> / {p.credits} clases
                  </p>
                  <Badge tone={st.tone}>{st.label}</Badge>
                </li>
              );
            })}
          </ul>
        )
      ) : payments.loading ? (
        <Skeleton className="h-40" />
      ) : (
        <ul className="grid gap-3">
          {(payments.data ?? []).map((p) => {
            const st = PAYMENT_STATUS[p.status];
            return (
              <li key={p.id} className="card flex flex-wrap items-center gap-4 p-4 sm:p-5">
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold">
                    {packDef(p.packId).name} · {cop(p.amount)}
                  </p>
                  <p className="text-sm text-muted">
                    {paymentMethods[p.method].label} · {fmtDateTime(p.createdAt)} · Ref. {p.reference}
                  </p>
                  {p.rejectReason && <p className="mt-1 text-sm text-bad">Motivo: {p.rejectReason}</p>}
                </div>
                {p.receipt && (
                  <button type="button" className="text-sm font-bold text-ball-text underline-offset-4 hover:underline" onClick={() => setReceipt(p.receipt)}>
                    Ver comprobante
                  </button>
                )}
                <Badge tone={st.tone}>{st.label}</Badge>
              </li>
            );
          })}
        </ul>
      )}

      {buying && (
        <BuyFlow
          pack={buying}
          onClose={() => {
            setBuying(null);
            setTab("packs");
          }}
        />
      )}
      <Modal open={!!receipt} onClose={() => setReceipt(null)} title="Comprobante">
        {receipt && <img src={receipt} alt="Comprobante de pago" className="mx-auto max-h-[70dvh] rounded-xl" />}
      </Modal>
    </>
  );
}
