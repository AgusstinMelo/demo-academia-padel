import { AlertTriangle, ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { levels, rules, type Level } from "../../config";
import { data, DomainError, type ClassSlot } from "../../data";
import { confirmedIn, scheduleConflicts } from "../../domain/booking";
import { addDaysTz, atTime, fmt, fmtTime, isoDay, startOfWeekTz } from "../../domain/time";
import { toast } from "../../lib/ui-state";
import { Badge, Modal, PageHeader, Skeleton } from "../../components/ui";
import { useAdminData, userName } from "./shared";

interface Draft {
  id?: string;
  day: string; // yyyy-mm-dd
  time: string;
  courtId: string;
  coachId: string;
  capacity: number;
  level: Level;
}

export default function Schedule() {
  const { slots, bookings, users, courts, now, loading } = useAdminData();
  const [week, setWeek] = useState(0);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const coaches = users.filter((u) => u.role === "coach");
  const weekStart = useMemo(() => addDaysTz(startOfWeekTz(now), week * 7), [now, week]);
  const days = Array.from({ length: 7 }, (_, i) => addDaysTz(weekStart, i));

  const toSlot = (d: Draft): ClassSlot => ({
    id: d.id ?? "nuevo",
    clubId: slots[0]?.clubId ?? "club-poblado",
    courtId: d.courtId,
    coachId: d.coachId,
    startsAt: atTime(d.day, d.time).toISOString(),
    durationMin: rules.classDurationMin,
    capacity: d.capacity,
    level: d.level,
  });
  // Conflictos en vivo mientras se edita (la fuente de datos vuelve a validar al guardar)
  const conflicts = draft && draft.courtId && draft.coachId ? scheduleConflicts(toSlot(draft), slots) : [];

  const openNew = (day: Date) => setDraft({ day: isoDay(day), time: "18:00", courtId: courts[0]?.id ?? "", coachId: coaches[0]?.id ?? "", capacity: rules.defaultCapacity, level: "Iniciación" });
  const openEdit = (s: ClassSlot) => setDraft({ id: s.id, day: isoDay(s.startsAt), time: fmtTime(s.startsAt), courtId: s.courtId, coachId: s.coachId, capacity: s.capacity, level: s.level });

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft || conflicts.length) return;
    setSaving(true);
    try {
      const { id: _id, clubId: _club, ...rest } = toSlot(draft);
      await data.saveSlot({ ...rest, id: draft.id });
      toast(draft.id ? "Clase actualizada" : "Clase creada", { body: draft.id ? "Los alumnos inscritos reciben un aviso si cambió el horario o la cancha." : undefined });
      setDraft(null);
    } catch (err) {
      toast("No se pudo guardar", { body: (err as DomainError).message, tone: "err" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!draft?.id) return;
    const n = confirmedIn(draft.id, bookings).length;
    if (!confirm(n ? `La clase tiene ${n} reservas: se cancelan y se devuelven los créditos. ¿Continuar?` : "¿Eliminar esta clase?")) return;
    await data.deleteSlot(draft.id);
    toast("Clase eliminada", { body: n ? `Se avisó a ${n} alumnos y recuperaron su crédito.` : undefined, tone: "info" });
    setDraft(null);
  };

  return (
    <>
      <PageHeader title="Horarios" subtitle="Crea y edita clases. El sistema avisa si una cancha o un profesor quedan ocupados dos veces." />
      <div className="mb-5 flex items-center gap-2">
        <button type="button" className="grid size-10 place-items-center rounded-full border border-line" onClick={() => setWeek((w) => w - 1)} aria-label="Semana anterior">
          <ChevronLeft size={18} />
        </button>
        <p className="min-w-44 text-center font-bold">
          {fmt(days[0], "d MMM")} – {fmt(days[6], "d MMM yyyy")}
        </p>
        <button type="button" className="grid size-10 place-items-center rounded-full border border-line" onClick={() => setWeek((w) => w + 1)} aria-label="Semana siguiente">
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {days.map((d) => {
          const list = slots.filter((s) => isoDay(s.startsAt) === isoDay(d));
          return (
            <section key={isoDay(d)} className="card p-4">
              <header className="mb-3 flex items-center justify-between">
                <h2 className="font-extrabold first-letter:uppercase">{fmt(d, "EEEE d")}</h2>
                <button type="button" className="grid size-8 place-items-center rounded-full bg-ball text-ball-ink" onClick={() => openNew(d)} aria-label={`Agregar clase el ${fmt(d, "EEEE d")}`}>
                  <Plus size={16} />
                </button>
              </header>
              {loading ? (
                <Skeleton className="h-24" />
              ) : (
                <ul className="space-y-2">
                  {list.map((s) => (
                    <li key={s.id}>
                      <button type="button" onClick={() => openEdit(s)} className="flex w-full items-center gap-3 rounded-xl bg-surface-2/60 px-3 py-2 text-left text-sm hover:bg-surface-2">
                        <span className="font-extrabold tabular-nums">{fmtTime(s.startsAt)}</span>
                        <span className="min-w-0 flex-1 truncate text-muted">
                          {s.level} · {userName(users, s.coachId).split(" ")[0]} · {courts.find((c) => c.id === s.courtId)?.name.replace("Cancha ", "C")}
                        </span>
                        <span className="text-xs font-bold tabular-nums">
                          {confirmedIn(s.id, bookings).length}/{s.capacity}
                        </span>
                        <Pencil size={13} className="text-muted" aria-hidden />
                      </button>
                    </li>
                  ))}
                  {!list.length && <li className="py-3 text-center text-xs text-muted">Sin clases</li>}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        title={draft?.id ? "Editar clase" : "Nueva clase"}
        footer={
          <>
            {draft?.id && (
              <button type="button" className="btn-danger mr-auto" onClick={remove}>
                <Trash2 size={16} aria-hidden /> Eliminar
              </button>
            )}
            <button type="button" className="btn-ghost" onClick={() => setDraft(null)}>
              Cancelar
            </button>
            <button type="submit" form="slot-form" className="btn-ball" disabled={!!conflicts.length || saving}>
              Guardar
            </button>
          </>
        }
      >
        {draft && (
          <form id="slot-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="s-day">Día</label>
              <input id="s-day" type="date" className="input" value={draft.day} onChange={(e) => setDraft({ ...draft, day: e.target.value })} required />
            </div>
            <div>
              <label className="field-label" htmlFor="s-time">Hora</label>
              <input id="s-time" type="time" step={1800} className="input" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} required />
            </div>
            <div>
              <label className="field-label" htmlFor="s-court">Cancha</label>
              <select id="s-court" className="input" value={draft.courtId} onChange={(e) => setDraft({ ...draft, courtId: e.target.value })}>
                {courts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="s-coach">Profesor</label>
              <select id="s-coach" className="input" value={draft.coachId} onChange={(e) => setDraft({ ...draft, coachId: e.target.value })}>
                {coaches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="s-level">Nivel</label>
              <select id="s-level" className="input" value={draft.level} onChange={(e) => setDraft({ ...draft, level: e.target.value as Level })}>
                {levels.map((l) => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="s-cap">Cupo</label>
              <input id="s-cap" type="number" min={1} max={8} className="input" value={draft.capacity} onChange={(e) => setDraft({ ...draft, capacity: Math.max(1, Number(e.target.value)) })} />
            </div>
            <div className="sm:col-span-2" aria-live="polite">
              {conflicts.length > 0 ? (
                <div className="flex gap-3 rounded-2xl border border-bad/40 bg-bad/10 p-4 text-sm">
                  <AlertTriangle size={18} className="mt-0.5 shrink-0 text-bad" aria-hidden />
                  <ul className="space-y-1">
                    {conflicts.map((c, i) => (
                      <li key={i}>
                        <strong>{c.kind === "court" ? "Cancha ocupada" : "Profesor ocupado"}:</strong> {c.slot.level} a las {fmtTime(c.slot.startsAt)} con {userName(users, c.slot.coachId)} en {courts.find((x) => x.id === c.slot.courtId)?.name}.
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <Badge tone="ok">Sin conflictos de cancha ni de profesor</Badge>
              )}
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
