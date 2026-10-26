import { Megaphone, Send } from "lucide-react";
import { useState, type FormEvent } from "react";
import { levels } from "../../config";
import { data, type Segment } from "../../data";
import { fmtDateTime } from "../../domain/time";
import { toast, useQuery } from "../../lib/ui-state";
import { PageHeader, Skeleton } from "../../components/ui";

const SEGMENTS: { value: Segment; label: string }[] = [
  { value: "all", label: "Todos los alumnos" },
  { value: "expiring", label: "Con pack por vencer (≤ 7 días)" },
  { value: "no_pack", label: "Sin pack activo" },
  ...levels.map((l) => ({ value: l as Segment, label: `Nivel ${l}` })),
];

export default function Announcements() {
  const sent = useQuery("announcements", () => data.getAnnouncements());
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [segment, setSegment] = useState<Segment>("all");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (title.trim().length < 4) errs.title = "Escribe un título (mínimo 4 caracteres).";
    if (body.trim().length < 10) errs.body = "El mensaje es demasiado corto.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    // API REAL: Edge Function que inserta las notificaciones y envía Web Push a las suscripciones del segmento
    const n = await data.sendAnnouncement({ title: title.trim(), body: body.trim(), segment });
    setBusy(false);
    toast(`Novedad enviada a ${n} ${n === 1 ? "alumno" : "alumnos"}`, { body: "La reciben en el centro de notificaciones y como push si lo permitieron." });
    setTitle("");
    setBody("");
  };

  return (
    <>
      <PageHeader title="Novedades" subtitle="Envía una novedad o promoción a todos los alumnos o a un segmento." />
      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <form onSubmit={submit} noValidate className="card space-y-4 p-5 sm:p-6">
          <div>
            <label className="field-label" htmlFor="a-seg">Destinatarios</label>
            <select id="a-seg" className="input" value={segment} onChange={(e) => setSegment(e.target.value as Segment)}>
              {SEGMENTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="a-title">Título</label>
            <input id="a-title" className="input" maxLength={60} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej.: 20 % de descuento en el pack 8" aria-invalid={!!errors.title} aria-describedby={errors.title ? "a-title-err" : undefined} />
            {errors.title && <p id="a-title-err" className="mt-1 text-sm text-bad">{errors.title}</p>}
          </div>
          <div>
            <label className="field-label" htmlFor="a-body">Mensaje</label>
            <textarea id="a-body" className="input" rows={4} maxLength={200} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Válido hasta el domingo. Compra desde la app." aria-invalid={!!errors.body} aria-describedby={errors.body ? "a-body-err" : undefined} />
            {errors.body && <p id="a-body-err" className="mt-1 text-sm text-bad">{errors.body}</p>}
          </div>
          <button type="submit" className="btn-ball w-full" disabled={busy}>
            <Send size={16} aria-hidden /> {busy ? "Enviando…" : "Enviar novedad"}
          </button>
        </form>

        <section className="card p-5 sm:p-6" aria-labelledby="sent-title">
          <h2 id="sent-title" className="font-extrabold">
            Enviadas
          </h2>
          {sent.loading ? (
            <Skeleton className="mt-4 h-40" />
          ) : (
            <ul className="mt-4 space-y-3">
              {sent.data?.map((a) => (
                <li key={a.id} className="flex gap-3 rounded-2xl bg-surface-2/60 p-3.5">
                  <Megaphone size={18} className="mt-0.5 shrink-0 text-ball-text" aria-hidden />
                  <div className="min-w-0">
                    <p className="font-bold">{a.title}</p>
                    <p className="text-sm text-muted">{a.body}</p>
                    <p className="mt-1 text-xs text-muted">
                      {fmtDateTime(a.createdAt)} · {a.recipients} destinatarios · {SEGMENTS.find((s) => s.value === a.segment)?.label}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
