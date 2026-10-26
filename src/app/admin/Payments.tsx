import { Check, FileImage, X } from "lucide-react";
import { useState } from "react";
import { paymentMethods } from "../../config";
import { data, DomainError, type Payment } from "../../data";
import { packDef } from "../../domain/credits";
import { fmtDateTime } from "../../domain/time";
import { cop, toast } from "../../lib/ui-state";
import { Avatar, Badge, Empty, Modal, PageHeader, Segmented, Skeleton } from "../../components/ui";
import { PAYMENT_STATUS } from "../status";
import { useAdminData, userName } from "./shared";

const REASONS = ["El monto no coincide", "El comprobante no es legible", "No encontramos la transferencia", "Comprobante duplicado"];

export default function Payments() {
  const { payments, users, loading } = useAdminData();
  const [tab, setTab] = useState<Payment["status"]>("pending");
  const [preview, setPreview] = useState<Payment | null>(null);
  const [rejecting, setRejecting] = useState<Payment | null>(null);
  const [reason, setReason] = useState(REASONS[0]);
  const [busy, setBusy] = useState<string | null>(null);
  const list = payments.filter((p) => p.status === tab);
  const count = (s: Payment["status"]) => payments.filter((p) => p.status === s).length;

  const approve = async (p: Payment) => {
    setBusy(p.id);
    try {
      await data.confirmPayment(p.id);
      toast("Pago aprobado", { body: `Se activó el ${packDef(p.packId).name} de ${userName(users, p.userId)} y le avisamos por notificación.` });
      setPreview(null);
    } catch (e) {
      toast("No se pudo aprobar", { body: (e as DomainError).message, tone: "err" });
    } finally {
      setBusy(null);
    }
  };
  const reject = async () => {
    if (!rejecting) return;
    setBusy(rejecting.id);
    try {
      await data.rejectPayment(rejecting.id, reason);
      toast("Pago rechazado", { body: `Le avisamos a ${userName(users, rejecting.userId)} con el motivo.`, tone: "warn" });
      setRejecting(null);
      setPreview(null);
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageHeader title="Pagos" subtitle="Confirma los comprobantes de transferencia y Nequi. Al aprobar, el pack se activa y el alumno recibe una notificación." />
      <div className="mb-5">
        <Segmented
          label="Estado"
          value={tab}
          onChange={setTab}
          options={[
            { value: "pending", label: `Pendientes (${count("pending")})` },
            { value: "approved", label: "Aprobados" },
            { value: "rejected", label: "Rechazados" },
          ]}
        />
      </div>

      {loading ? (
        <div className="grid gap-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : !list.length ? (
        <Empty icon={<Check size={36} />} title={tab === "pending" ? "No hay comprobantes por revisar" : "Sin pagos en este estado"} />
      ) : (
        <ul className="grid gap-3">
          {list.slice(0, 40).map((p) => {
            const st = PAYMENT_STATUS[p.status];
            const name = userName(users, p.userId);
            return (
              <li key={p.id} className="card flex flex-wrap items-center gap-4 p-4 sm:p-5">
                <Avatar name={name} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold">{name}</p>
                  <p className="text-sm text-muted">
                    {packDef(p.packId).name} · <strong className="text-text">{cop(p.amount)}</strong> · {paymentMethods[p.method].label}
                  </p>
                  <p className="text-xs text-muted">
                    {fmtDateTime(p.createdAt)} · Ref. {p.reference}
                    {p.rejectReason && ` · Motivo: ${p.rejectReason}`}
                  </p>
                </div>
                {p.receipt && (
                  <button type="button" className="btn-ghost py-2" onClick={() => setPreview(p)}>
                    <FileImage size={16} aria-hidden /> Comprobante
                  </button>
                )}
                {p.status === "pending" ? (
                  <div className="flex gap-2">
                    <button type="button" className="btn-danger py-2" onClick={() => setRejecting(p)} disabled={busy === p.id}>
                      <X size={16} aria-hidden /> Rechazar
                    </button>
                    <button type="button" className="btn-ball py-2" onClick={() => approve(p)} disabled={busy === p.id}>
                      <Check size={16} aria-hidden /> {busy === p.id ? "Aprobando…" : "Aprobar"}
                    </button>
                  </div>
                ) : (
                  <Badge tone={st.tone}>{st.label}</Badge>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        title={preview ? `Comprobante de ${userName(users, preview.userId)}` : ""}
        footer={
          preview?.status === "pending" && (
            <>
              <button type="button" className="btn-danger" onClick={() => setRejecting(preview)}>
                Rechazar
              </button>
              <button type="button" className="btn-ball" onClick={() => approve(preview)} disabled={busy === preview.id}>
                Aprobar y activar pack
              </button>
            </>
          )
        }
      >
        {preview && (
          <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
            <img src={preview.receipt!} alt="Comprobante de pago" className="mx-auto max-h-[60dvh] rounded-xl border border-line" />
            <dl className="space-y-3 text-sm">
              <div><dt className="text-muted">Monto esperado</dt><dd className="display text-3xl">{cop(preview.amount)}</dd></div>
              <div><dt className="text-muted">Pack</dt><dd className="font-bold">{packDef(preview.packId).name}</dd></div>
              <div><dt className="text-muted">Método</dt><dd className="font-bold">{paymentMethods[preview.method].label}</dd></div>
              <div><dt className="text-muted">Referencia</dt><dd className="font-bold">{preview.reference}</dd></div>
            </dl>
          </div>
        )}
      </Modal>

      <Modal
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        title="Rechazar pago"
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setRejecting(null)}>
              Volver
            </button>
            <button type="button" className="btn-danger" onClick={reject} disabled={!reason.trim() || !!busy}>
              Rechazar y avisar
            </button>
          </>
        }
      >
        <label className="field-label" htmlFor="reject-reason">
          Motivo (lo verá el alumno)
        </label>
        <select id="reject-reason" className="input" value={REASONS.includes(reason) ? reason : "otro"} onChange={(e) => setReason(e.target.value === "otro" ? "" : e.target.value)}>
          {REASONS.map((r) => (
            <option key={r}>{r}</option>
          ))}
          <option value="otro">Otro motivo…</option>
        </select>
        {!REASONS.includes(reason) && (
          <textarea className="input mt-3" rows={3} placeholder="Escribe el motivo" value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Otro motivo" />
        )}
      </Modal>
    </>
  );
}
