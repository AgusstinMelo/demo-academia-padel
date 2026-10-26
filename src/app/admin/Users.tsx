import { Minus, Pencil, Plus, Search, UserPlus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { levels, type Level } from "../../config";
import { data, DomainError, type Role, type User } from "../../data";
import { availableCredits, daysToExpiry, packToConsume } from "../../domain/credits";
import { toast } from "../../lib/ui-state";
import { Avatar, Badge, Modal, PageHeader, Segmented, Skeleton } from "../../components/ui";
import { useAdminData } from "./shared";

const ROLE: Record<Role, string> = { student: "Alumno", coach: "Profesor", admin: "Admin" };
type Draft = { id?: string; name: string; email: string; phone: string; role: Role; level: Level };
const EMPTY: Draft = { name: "", email: "", phone: "", role: "student", level: "Iniciación" };

export default function Users() {
  const { users, userPacks, now, loading } = useAdminData();
  const [q, setQ] = useState("");
  const [role, setRole] = useState<Role | "all">("all");
  const [editing, setEditing] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [credits, setCredits] = useState<User | null>(null);
  const [delta, setDelta] = useState(1);
  const [reason, setReason] = useState("Clase de reposición");

  const query = q.trim().toLowerCase();
  const list = users.filter((u) => (role === "all" || u.role === role) && (!query || `${u.name} ${u.email} ${u.phone}`.toLowerCase().includes(query)));
  const packsOf = (id: string) => userPacks.filter((p) => p.userId === id);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const errs: Record<string, string> = {};
    if (editing.name.trim().length < 3) errs.name = "Escribe nombre y apellido.";
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(editing.email)) errs.email = "Correo no válido.";
    if (users.some((u) => u.email === editing.email && u.id !== editing.id)) errs.email = "Ya existe un usuario con ese correo.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    // API REAL: el alta envía una invitación por correo (Supabase Auth) para que el usuario cree su contraseña
    await data.saveUser({ ...editing, name: editing.name.trim(), email: editing.email.trim().toLowerCase() });
    toast(editing.id ? "Usuario actualizado" : "Usuario creado", { body: editing.id ? undefined : "En la versión real recibe un correo de invitación." });
    setEditing(null);
  };

  const applyCredits = async () => {
    if (!credits) return;
    try {
      await data.adjustCredits(credits.id, delta, reason);
      toast(`${delta > 0 ? "Sumaste" : "Restaste"} ${Math.abs(delta)} ${Math.abs(delta) === 1 ? "crédito" : "créditos"}`, { body: `${credits.name} recibió una notificación.` });
      setCredits(null);
    } catch (e) {
      toast("No se pudo ajustar", { body: (e as DomainError).message, tone: "err" });
    }
  };

  return (
    <>
      <PageHeader
        title="Usuarios"
        subtitle={`${users.filter((u) => u.role === "student").length} alumnos · ${users.filter((u) => u.role === "coach").length} profesores`}
        actions={
          <button type="button" className="btn-ball" onClick={() => (setErrors({}), setEditing({ ...EMPTY }))}>
            <UserPlus size={16} aria-hidden /> Nuevo usuario
          </button>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="relative min-w-60 flex-1">
          <span className="sr-only">Buscar usuarios</span>
          <Search size={16} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" aria-hidden />
          <input type="search" className="input pl-10" placeholder="Nombre, correo o teléfono" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <Segmented
          label="Rol"
          size="sm"
          value={role}
          onChange={setRole}
          options={[{ value: "all" as const, label: "Todos" }, ...(["student", "coach", "admin"] as Role[]).map((r) => ({ value: r, label: ROLE[r] }))]}
        />
      </div>

      {/* Celular: tarjetas */}
      <ul className="grid gap-3 md:hidden">
        {loading
          ? Array.from({ length: 4 }, (_, i) => <li key={i}><Skeleton className="h-24" /></li>)
          : list.map((u) => {
              const own = packsOf(u.id);
              const current = packToConsume(own, now);
              const days = current && daysToExpiry(current, now);
              return (
                <li key={u.id} className="card p-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={u.name} photo={u.coach?.photo} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{u.name}</p>
                      <p className="truncate text-xs text-muted">{u.email}</p>
                    </div>
                    <Badge tone={u.role === "admin" ? "info" : u.role === "coach" ? "ball" : "neutral"}>{ROLE[u.role]}</Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2 text-sm">
                    <span className="text-muted">
                      {u.level}
                      {u.role === "student" && <> · <strong className="text-text">{availableCredits(own, now)}</strong> créditos{days !== null && days !== undefined ? ` · vence en ${days} d` : ""}</>}
                    </span>
                    <span className="flex gap-2">
                      {u.role === "student" && (
                        <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={() => (setDelta(1), setCredits(u))}>
                          Créditos
                        </button>
                      )}
                      <button type="button" className="grid size-8 place-items-center rounded-full border border-line text-muted" onClick={() => (setErrors({}), setEditing({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, level: u.level }))} aria-label={`Editar a ${u.name}`}>
                        <Pencil size={14} />
                      </button>
                    </span>
                  </div>
                </li>
              );
            })}
      </ul>

      {/* Desktop: tabla */}
      <div className="card hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-line text-left text-xs text-muted uppercase">
            <tr>
              <th className="px-4 py-3 font-bold">Usuario</th>
              <th className="px-4 py-3 font-bold">Rol</th>
              <th className="px-4 py-3 font-bold">Nivel</th>
              <th className="px-4 py-3 font-bold">Créditos</th>
              <th className="px-4 py-3 font-bold">Vence</th>
              <th className="px-4 py-3"><span className="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loading
              ? Array.from({ length: 6 }, (_, i) => (
                  <tr key={i}><td colSpan={6} className="px-4 py-3"><Skeleton className="h-8" /></td></tr>
                ))
              : list.map((u) => {
                  const own = packsOf(u.id);
                  const c = availableCredits(own, now);
                  const current = packToConsume(own, now);
                  const days = current && daysToExpiry(current, now);
                  return (
                    <tr key={u.id} className="hover:bg-surface-2/50">
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-3">
                          <Avatar name={u.name} photo={u.coach?.photo} size={34} />
                          <span>
                            <span className="block font-bold">{u.name}</span>
                            <span className="text-xs text-muted">{u.email}</span>
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3"><Badge tone={u.role === "admin" ? "info" : u.role === "coach" ? "ball" : "neutral"}>{ROLE[u.role]}</Badge></td>
                      <td className="px-4 py-3">{u.level}</td>
                      <td className="px-4 py-3 font-bold tabular-nums">{u.role === "student" ? c : "—"}</td>
                      <td className={`px-4 py-3 ${days !== null && days !== undefined && days <= 7 ? "font-bold text-warn" : "text-muted"}`}>{u.role === "student" && days !== null && days !== undefined ? `${days} d` : "—"}</td>
                      <td className="px-4 py-3">
                        <span className="flex justify-end gap-2">
                          {u.role === "student" && (
                            <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={() => (setDelta(1), setCredits(u))}>
                              Créditos
                            </button>
                          )}
                          <button type="button" className="grid size-8 place-items-center rounded-full border border-line text-muted hover:text-text" onClick={() => (setErrors({}), setEditing({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, level: u.level }))} aria-label={`Editar a ${u.name}`}>
                            <Pencil size={14} />
                          </button>
                        </span>
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? "Editar usuario" : "Nuevo usuario"}
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>
              Cancelar
            </button>
            <button type="submit" form="user-form" className="btn-ball">
              Guardar
            </button>
          </>
        }
      >
        {editing && (
          <form id="user-form" onSubmit={save} noValidate className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="field-label" htmlFor="u-name">Nombre y apellido</label>
              <input id="u-name" className="input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} aria-invalid={!!errors.name} aria-describedby={errors.name ? "u-name-err" : undefined} />
              {errors.name && <p id="u-name-err" className="mt-1 text-sm text-bad">{errors.name}</p>}
            </div>
            <div>
              <label className="field-label" htmlFor="u-email">Correo</label>
              <input id="u-email" type="email" className="input" value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} aria-invalid={!!errors.email} aria-describedby={errors.email ? "u-email-err" : undefined} />
              {errors.email && <p id="u-email-err" className="mt-1 text-sm text-bad">{errors.email}</p>}
            </div>
            <div>
              <label className="field-label" htmlFor="u-phone">Celular</label>
              <input id="u-phone" type="tel" className="input" value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} placeholder="+57 300 000 0000" />
            </div>
            <div>
              <label className="field-label" htmlFor="u-role">Rol</label>
              <select id="u-role" className="input" value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value as Role })}>
                {(["student", "coach", "admin"] as Role[]).map((r) => <option key={r} value={r}>{ROLE[r]}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="u-level">Nivel</label>
              <select id="u-level" className="input" value={editing.level} onChange={(e) => setEditing({ ...editing, level: e.target.value as Level })}>
                {levels.map((l) => <option key={l}>{l}</option>)}
              </select>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={!!credits}
        onClose={() => setCredits(null)}
        title={credits ? `Créditos de ${credits.name}` : ""}
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setCredits(null)}>
              Cancelar
            </button>
            <button type="button" className="btn-ball" onClick={applyCredits} disabled={!delta || !reason.trim()}>
              Aplicar ajuste
            </button>
          </>
        }
      >
        {credits && (
          <div className="space-y-5">
            <p className="text-sm text-muted">
              Créditos actuales: <strong className="text-text">{availableCredits(packsOf(credits.id), now)}</strong>. Si no tiene un pack activo, se crea uno de cortesía.
            </p>
            <div className="flex items-center justify-center gap-6">
              <button type="button" className="grid size-12 place-items-center rounded-full border border-line" onClick={() => setDelta((d) => Math.max(-8, d - 1))} aria-label="Restar">
                <Minus size={18} />
              </button>
              <output className={`display w-20 text-center text-6xl ${delta < 0 ? "text-bad" : "text-ball-text"}`} aria-live="polite">
                {delta > 0 ? `+${delta}` : delta}
              </output>
              <button type="button" className="grid size-12 place-items-center rounded-full border border-line" onClick={() => setDelta((d) => Math.min(8, d + 1))} aria-label="Sumar">
                <Plus size={18} />
              </button>
            </div>
            <div>
              <label className="field-label" htmlFor="adj-reason">Motivo (lo verá el alumno)</label>
              <input id="adj-reason" className="input" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
