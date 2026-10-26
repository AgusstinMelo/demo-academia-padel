-- ─────────────────────────────────────────────────────────────
--  ÉLITE PÁDEL · Esquema propuesto para Supabase (Postgres)
--  Multi-sede (club_id en las tablas principales), reservas sin duplicados,
--  packs con créditos y vencimiento, pagos y notificaciones push.
--  Los nombres siguen src/domain/types.ts.
-- ─────────────────────────────────────────────────────────────

create extension if not exists btree_gist;   -- restricciones de exclusión por rango de tiempo
create extension if not exists pg_cron;      -- tareas programadas (vencimientos, recordatorios)

-- ── Tipos ────────────────────────────────────────────────────
create type user_role as enum ('student', 'coach', 'admin');
create type level as enum ('Iniciación', 'Intermedio', 'Avanzado', 'Competición');
create type booking_status as enum ('confirmed', 'cancelled');
create type attendance as enum ('present', 'absent');
create type payment_method as enum ('transfer', 'nequi', 'gateway');
create type payment_status as enum ('pending', 'approved', 'rejected');

-- ── Sedes y canchas ──────────────────────────────────────────
create table clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null,
  timezone text not null default 'America/Bogota',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table courts (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs on delete cascade,
  name text not null,
  unique (club_id, name)
);

-- ── Personas ─────────────────────────────────────────────────
-- Un perfil por usuario de Supabase Auth, con su rol y sede principal
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  club_id uuid not null references clubs,
  role user_role not null default 'student',
  full_name text not null,
  phone text,
  level level not null default 'Iniciación',
  created_at timestamptz not null default now()
);
create index profiles_club_role_idx on profiles (club_id, role);

-- Datos extra de los profesores
create table coaches (
  profile_id uuid primary key references profiles on delete cascade,
  specialty text not null default '',
  certification text not null default '',
  photo_url text
);

-- ── Agenda ───────────────────────────────────────────────────
-- Rango [inicio, fin) de una clase. Es inmutable porque solo suma minutos (no días ni meses,
-- que sí dependerían de la zona horaria); así se puede usar en una columna generada.
create function slot_range(starts_at timestamptz, minutes int) returns tstzrange
language sql immutable as $$ select tstzrange(starts_at, starts_at + minutes * interval '1 minute') $$;

create table class_slots (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs,
  court_id uuid not null references courts,
  coach_id uuid not null references coaches (profile_id),
  starts_at timestamptz not null,
  duration_min int not null default 60 check (duration_min between 30 and 180),
  capacity int not null default 4 check (capacity between 1 and 8),
  level level not null,
  -- Rango calculado para las restricciones de exclusión
  during tstzrange generated always as (slot_range(starts_at, duration_min)) stored,
  -- Una cancha no puede tener dos clases que se pisen…
  constraint class_slots_court_no_overlap exclude using gist (court_id with =, during with &&),
  -- …ni un profesor dar dos clases a la vez
  constraint class_slots_coach_no_overlap exclude using gist (coach_id with =, during with &&)
);
create index class_slots_club_start_idx on class_slots (club_id, starts_at);

-- ── Packs ────────────────────────────────────────────────────
-- Catálogo (precios en COP). Ver también src/config.ts
create table packs (
  id text primary key,                 -- 'single' | 'pack4' | 'pack8'
  club_id uuid references clubs,       -- null = disponible en todas las sedes
  name text not null,
  classes int not null check (classes > 0),
  price_cop int not null check (price_cop > 0),
  validity_days int not null default 60,
  active boolean not null default true
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs,
  user_id uuid not null references profiles on delete cascade,
  pack_id text not null references packs,
  amount_cop int not null,
  method payment_method not null,
  status payment_status not null default 'pending',
  receipt_path text,                   -- ruta en Storage (bucket privado "receipts")
  reference text not null,             -- referencia bancaria o id de la pasarela
  gateway_payload jsonb,               -- respuesta del webhook de Wompi / Mercado Pago
  reviewed_by uuid references profiles,
  reviewed_at timestamptz,
  reject_reason text,
  created_at timestamptz not null default now()
);
create index payments_club_status_idx on payments (club_id, status, created_at desc);

-- Packs comprados: créditos restantes y vencimiento (se activa al aprobar el pago)
create table user_packs (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs,
  user_id uuid not null references profiles on delete cascade,
  pack_id text not null references packs,
  payment_id uuid unique references payments,  -- null = cortesía asignada por el admin
  credits int not null check (credits > 0),
  remaining int not null check (remaining >= 0 and remaining <= credits),
  activated_at timestamptz,
  expires_at timestamptz,
  voided boolean not null default false,
  created_at timestamptz not null default now(),
  check ((activated_at is null) = (expires_at is null))
);
create index user_packs_user_idx on user_packs (user_id, expires_at);

-- ── Reservas ─────────────────────────────────────────────────
create table bookings (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs,
  slot_id uuid not null references class_slots on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  user_pack_id uuid not null references user_packs,
  status booking_status not null default 'confirmed',
  attendance attendance,
  refunded boolean not null default false,
  created_at timestamptz not null default now(),
  cancelled_at timestamptz
);
-- Sin duplicados: un alumno no puede tener dos reservas activas en la misma clase
create unique index bookings_one_active_per_slot on bookings (slot_id, user_id) where status = 'confirmed';
create index bookings_slot_idx on bookings (slot_id) where status = 'confirmed';

-- Auditoría de ajustes manuales de créditos
create table credit_adjustments (
  id uuid primary key default gen_random_uuid(),
  user_pack_id uuid not null references user_packs,
  delta int not null,
  reason text not null,
  created_by uuid not null references profiles,
  created_at timestamptz not null default now()
);

-- ── Notificaciones ───────────────────────────────────────────
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  type text not null,                  -- booking_confirmed, class_reminder, pack_expiring…
  title text not null,
  body text not null,
  read_at timestamptz,
  dedupe_key text unique,              -- evita recordatorios duplicados (p. ej. 'reminder:24:<booking>')
  created_at timestamptz not null default now()
);
create index notifications_user_idx on notifications (user_id, created_at desc);

create table notification_prefs (
  user_id uuid primary key references profiles on delete cascade,
  reminders boolean not null default true,
  bookings boolean not null default true,
  payments boolean not null default true,
  expiry boolean not null default true,
  promos boolean not null default true
);

-- Suscripciones Web Push (una por dispositivo)
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
--  Reservar: validación + escritura atómica
--  El FOR UPDATE sobre la clase serializa las reservas simultáneas del último cupo.
-- ─────────────────────────────────────────────────────────────
create or replace function book_class(p_slot_id uuid) returns bookings
language plpgsql security definer set search_path = public as $$
declare
  v_slot class_slots;
  v_taken int;
  v_pack user_packs;
  v_booking bookings;
begin
  select * into v_slot from class_slots where id = p_slot_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_slot.starts_at <= now() then raise exception 'SLOT_STARTED'; end if;
  if v_slot.starts_at > now() + interval '14 days' then raise exception 'OUT_OF_WINDOW'; end if;

  if exists (select 1 from bookings where slot_id = p_slot_id and user_id = auth.uid() and status = 'confirmed') then
    raise exception 'ALREADY_BOOKED';
  end if;
  if exists (select 1 from bookings b join class_slots s on s.id = b.slot_id
             where b.user_id = auth.uid() and b.status = 'confirmed' and s.during && v_slot.during) then
    raise exception 'TIME_CONFLICT';
  end if;

  select count(*) into v_taken from bookings where slot_id = p_slot_id and status = 'confirmed';
  if v_taken >= v_slot.capacity then raise exception 'SLOT_FULL'; end if;

  -- Pack que vence primero, con créditos y vigente
  select * into v_pack from user_packs
   where user_id = auth.uid() and not voided and remaining > 0 and expires_at > now()
   order by expires_at limit 1 for update;
  if not found then raise exception 'NO_CREDITS'; end if;

  update user_packs set remaining = remaining - 1 where id = v_pack.id;
  insert into bookings (club_id, slot_id, user_id, user_pack_id)
  values (v_slot.club_id, p_slot_id, auth.uid(), v_pack.id)
  returning * into v_booking;   -- el índice único rechaza el duplicado si llegara a colarse
  return v_booking;
end $$;

-- Cancelar: devuelve el crédito si faltan ≥ 12 h y el pack sigue vigente
create or replace function cancel_booking(p_booking_id uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_b bookings; v_start timestamptz; v_refund boolean;
begin
  select * into v_b from bookings where id = p_booking_id and (user_id = auth.uid() or is_admin()) for update;
  if not found or v_b.status <> 'confirmed' then raise exception 'NOT_FOUND'; end if;
  select starts_at into v_start from class_slots where id = v_b.slot_id;
  if v_start <= now() then raise exception 'SLOT_STARTED'; end if;
  v_refund := v_start - now() >= interval '12 hours'
              and exists (select 1 from user_packs where id = v_b.user_pack_id and expires_at > now());
  update bookings set status = 'cancelled', cancelled_at = now(), refunded = v_refund where id = p_booking_id;
  if v_refund then update user_packs set remaining = remaining + 1 where id = v_b.user_pack_id; end if;
  return v_refund;
end $$;

-- Confirmar pago: activa el pack (60 días) y notifica
create or replace function confirm_payment(p_payment_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'FORBIDDEN'; end if;
  update payments set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
   where id = p_payment_id and status = 'pending';
  if not found then raise exception 'INVALID'; end if;
  update user_packs up set activated_at = now(),
         expires_at = (date_trunc('day', now() at time zone 'America/Bogota') + make_interval(days => p.validity_days + 1) - interval '1 second') at time zone 'America/Bogota'
    from packs p where up.payment_id = p_payment_id and p.id = up.pack_id;
  insert into notifications (user_id, type, title, body)
  select user_id, 'payment_approved', '¡Pago confirmado!', 'Tu pack ya está activo.' from payments where id = p_payment_id;
  -- La Edge Function send-push escucha inserts en notifications (Database Webhook) y envía el push
end $$;

-- ─────────────────────────────────────────────────────────────
--  Tareas programadas (pg_cron) — la Edge Function send-push envía cada notificación nueva
-- ─────────────────────────────────────────────────────────────
-- Cada 15 min: recordatorios de clase 24 h y 2 h antes (dedupe_key evita repetirlos)
-- select cron.schedule('class-reminders', '*/15 * * * *', $$
--   insert into notifications (user_id, type, title, body, dedupe_key)
--   select b.user_id, 'class_reminder', 'Tu clase es mañana', s.level || ' · ' || to_char(s.starts_at at time zone 'America/Bogota', 'HH24:MI'),
--          'reminder:24:' || b.id
--     from bookings b join class_slots s on s.id = b.slot_id
--    where b.status = 'confirmed' and s.starts_at between now() + interval '2 hours' and now() + interval '24 hours'
--   on conflict (dedupe_key) do nothing;
-- $$);
-- Cada día a las 8:00 (Bogotá = 13:00 UTC): packs por vencer a 7 y 1 día
-- select cron.schedule('pack-expiry', '0 13 * * *', $$ … insert into notifications … 'expiring:7:' || up.id … $$);

-- ─────────────────────────────────────────────────────────────
--  Row Level Security por rol
-- ─────────────────────────────────────────────────────────────
create or replace function is_admin() returns boolean language sql stable security definer set search_path = public as
  $$ select exists (select 1 from profiles where id = auth.uid() and role = 'admin') $$;
create or replace function my_club() returns uuid language sql stable security definer set search_path = public as
  $$ select club_id from profiles where id = auth.uid() $$;

alter table clubs enable row level security;
alter table courts enable row level security;
alter table profiles enable row level security;
alter table coaches enable row level security;
alter table class_slots enable row level security;
alter table packs enable row level security;
alter table payments enable row level security;
alter table user_packs enable row level security;
alter table bookings enable row level security;
alter table credit_adjustments enable row level security;
alter table notifications enable row level security;
alter table notification_prefs enable row level security;
alter table push_subscriptions enable row level security;

-- Catálogo visible para cualquier usuario autenticado de la sede
create policy "ver sedes" on clubs for select to authenticated using (true);
create policy "ver canchas" on courts for select to authenticated using (club_id = my_club());
create policy "ver packs" on packs for select using (active);
create policy "ver agenda" on class_slots for select to authenticated using (club_id = my_club());
create policy "ver profesores" on coaches for select to authenticated using (true);

-- Perfiles: cada uno el suyo; el admin, todos los de su sede; el profesor, sus alumnos
create policy "mi perfil" on profiles for select using (id = auth.uid());
create policy "admin: perfiles de la sede" on profiles for all using (is_admin() and club_id = my_club());
create policy "profesor: alumnos de sus clases" on profiles for select using (
  exists (select 1 from bookings b join class_slots s on s.id = b.slot_id where b.user_id = profiles.id and s.coach_id = auth.uid()));

-- Reservas: el alumno ve las suyas (y escribe solo vía book_class / cancel_booking);
-- el profesor ve y marca asistencia en sus clases; el admin, todo en su sede
create policy "alumno: mis reservas" on bookings for select using (user_id = auth.uid());
create policy "profesor: reservas de mis clases" on bookings for select using (
  exists (select 1 from class_slots s where s.id = slot_id and s.coach_id = auth.uid()));
create policy "profesor: asistencia" on bookings for update using (
  exists (select 1 from class_slots s where s.id = slot_id and s.coach_id = auth.uid()));
create policy "admin: reservas" on bookings for all using (is_admin() and club_id = my_club());
-- Para mostrar cupos sin exponer quién reservó: vista con el conteo por clase
create view slot_occupancy with (security_invoker = false) as
  select slot_id, count(*)::int as taken from bookings where status = 'confirmed' group by slot_id;

-- Packs y pagos: el alumno los suyos (crea pagos pendientes); el admin, los de su sede
create policy "alumno: mis packs" on user_packs for select using (user_id = auth.uid());
create policy "admin: packs" on user_packs for all using (is_admin() and club_id = my_club());
create policy "alumno: mis pagos" on payments for select using (user_id = auth.uid());
create policy "alumno: crear pago" on payments for insert with check (user_id = auth.uid() and status = 'pending');
create policy "admin: pagos" on payments for all using (is_admin() and club_id = my_club());
create policy "admin: ajustes" on credit_adjustments for all using (is_admin());

-- Notificaciones y suscripciones: solo el dueño
create policy "mis notificaciones" on notifications for select using (user_id = auth.uid());
create policy "marcar leídas" on notifications for update using (user_id = auth.uid());
create policy "mis preferencias" on notification_prefs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "mis dispositivos" on push_subscriptions for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Storage: bucket privado "receipts"; cada alumno sube a receipts/<user_id>/… y el admin lee todo
-- (políticas en storage.objects, ver README)
