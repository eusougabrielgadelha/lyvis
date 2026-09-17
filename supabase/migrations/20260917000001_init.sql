-- Lyvis — initial schema
-- Created: 2026-09-17
-- Rollback: see 20260917000001_init_down.sql

create extension if not exists pgcrypto;

-- ============================================================
-- ACCOUNTS & MEMBERSHIPS
-- ============================================================

create type account_status as enum ('trialing', 'active', 'past_due', 'canceled');
create type member_role   as enum ('owner', 'admin', 'host', 'moderator');

create table plans (
  id          text primary key,              -- 'starter' | 'pro' | 'scale'
  name        text not null,
  price_brl   numeric(10,2) not null default 0,
  interval    text not null default 'month', -- month | year
  is_public   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table accounts (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  slug         text not null unique,
  plan_id      text references plans(id),
  status       account_status not null default 'trialing',
  billing_ref  text,                          -- id da assinatura no Stripe/Asaas
  created_at   timestamptz not null default now()
);

create table account_members (
  account_id  uuid not null references accounts(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        member_role not null default 'host',
  created_at  timestamptz not null default now(),
  primary key (account_id, user_id)
);

create index on account_members (user_id);

-- ============================================================
-- FEATURES (módulos e limites vendáveis)
-- ============================================================

create type feature_type as enum ('module', 'limit');

create table features (
  key         text primary key,              -- 'block.quiz', 'limit.seats'
  name        text not null,
  type        feature_type not null default 'module',
  description text
);

create table plan_features (
  plan_id      text not null references plans(id) on delete cascade,
  feature_key  text not null references features(key) on delete cascade,
  enabled      boolean not null default true,
  limit_value  integer,                      -- null = ilimitado
  primary key (plan_id, feature_key)
);

-- Exceção por conta: libera módulo em teste, com prazo, sem criar plano novo
create table account_features (
  account_id   uuid not null references accounts(id) on delete cascade,
  feature_key  text not null references features(key) on delete cascade,
  enabled      boolean not null default true,
  limit_value  integer,
  expires_at   timestamptz,
  note         text,
  created_at   timestamptz not null default now(),
  primary key (account_id, feature_key)
);

-- Fonte única de verdade do controle de acesso. SEMPRE checar no servidor.
create or replace function public.has_feature(p_account uuid, p_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select af.enabled
       from account_features af
      where af.account_id = p_account
        and af.feature_key = p_key
        and (af.expires_at is null or af.expires_at > now())),
    (select pf.enabled
       from accounts a
       join plan_features pf on pf.plan_id = a.plan_id
      where a.id = p_account
        and pf.feature_key = p_key),
    false
  );
$$;

create or replace function public.feature_limit(p_account uuid, p_key text)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select af.limit_value
       from account_features af
      where af.account_id = p_account
        and af.feature_key = p_key
        and (af.expires_at is null or af.expires_at > now())),
    (select pf.limit_value
       from accounts a
       join plan_features pf on pf.plan_id = a.plan_id
      where a.id = p_account
        and pf.feature_key = p_key)
  );
$$;

-- ============================================================
-- ROOMS & PITCHES
-- ============================================================

create type room_mode   as enum ('live', 'meeting');
create type room_status as enum ('draft', 'scheduled', 'live', 'ended');

create table rooms (
  id           uuid primary key default gen_random_uuid(),
  account_id   uuid not null references accounts(id) on delete cascade,
  slug         text not null,
  title        text not null,
  mode         room_mode not null default 'live',
  status       room_status not null default 'draft',
  starts_at    timestamptz,
  ended_at     timestamptz,
  -- gate de inscrição, display_viewers, tracking (só IDs; segredos em room_secrets)
  settings     jsonb not null default '{}'::jsonb,
  created_by   uuid references auth.users(id),
  created_at   timestamptz not null default now(),
  unique (account_id, slug)
);

create index on rooms (account_id, status);

-- Segredos nunca vão pro navegador (CAPI token, GA4 api_secret)
create table room_secrets (
  room_id     uuid primary key references rooms(id) on delete cascade,
  secrets     jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

create table pitches (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references rooms(id) on delete cascade,
  name        text not null,
  definition  jsonb not null,               -- { start, steps: { id: { blocks[], next[] } } }
  version     integer not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index on pitches (room_id);

create table pitch_activations (
  id            uuid primary key default gen_random_uuid(),
  room_id       uuid not null references rooms(id) on delete cascade,
  pitch_id      uuid not null references pitches(id) on delete cascade,
  version       integer not null,
  activated_by  uuid references auth.users(id),
  activated_at  timestamptz not null default now(),
  ended_at      timestamptz
);

create index on pitch_activations (room_id, activated_at desc);

-- ============================================================
-- LEADS & VIEWERS
-- ============================================================

create table leads (
  id              uuid primary key default gen_random_uuid(),
  account_id      uuid not null references accounts(id) on delete cascade,
  name            text not null,
  email           text,                      -- normalizado: lower(trim())
  phone           text,                      -- normalizado: E.164
  consent_at      timestamptz,
  consent_text    text,
  source_room_id  uuid references rooms(id) on delete set null,
  first_seen_at   timestamptz not null default now(),
  last_seen_at    timestamptz not null default now(),
  constraint leads_contact_check check (email is not null or phone is not null)
);

-- Lead é único por CONTA, não por sala
create unique index leads_account_email_key on leads (account_id, email) where email is not null;
create unique index leads_account_phone_key on leads (account_id, phone) where phone is not null;

create table room_registrations (
  id             uuid primary key default gen_random_uuid(),
  room_id        uuid not null references rooms(id) on delete cascade,
  lead_id        uuid not null references leads(id) on delete cascade,
  registered_at  timestamptz not null default now(),
  utm            jsonb not null default '{}'::jsonb,
  unique (room_id, lead_id)
);

create table viewer_sessions (
  id             uuid primary key default gen_random_uuid(),
  room_id        uuid not null references rooms(id) on delete cascade,
  lead_id        uuid references leads(id) on delete set null,
  anon_id        text not null,              -- identificador assinado do navegador
  joined_at      timestamptz not null default now(),
  left_at        timestamptz,
  watch_seconds  integer not null default 0,
  device         jsonb not null default '{}'::jsonb
);

create index on viewer_sessions (room_id, joined_at);
create index on viewer_sessions (lead_id);

-- ============================================================
-- ANALYTICS
-- ============================================================

-- Bruto: lote de 30s enviado pelo navegador. Expurgo após N dias.
create table viewer_heartbeats (
  id          bigserial primary key,
  room_id     uuid not null references rooms(id) on delete cascade,
  viewer_ref  text not null,                 -- anon_id
  at          timestamptz not null,
  position_s  integer not null
);

create index on viewer_heartbeats (room_id, at);

-- Agregado: alimenta a curva de retenção
create table room_retention_buckets (
  room_id     uuid not null references rooms(id) on delete cascade,
  bucket_10s  integer not null,
  viewers     integer not null,
  pct         numeric(5,2),
  primary key (room_id, bucket_10s)
);

create table pitch_events (
  id             bigserial primary key,
  activation_id  uuid not null references pitch_activations(id) on delete cascade,
  viewer_ref     text not null,
  step_id        text,
  block_id       text,
  event          text not null,              -- viewed | answered | clicked | checkout_opened
  payload        jsonb not null default '{}'::jsonb,
  at             timestamptz not null default now()
);

create index on pitch_events (activation_id, event);

create table quiz_responses (
  id             bigserial primary key,
  activation_id  uuid not null references pitch_activations(id) on delete cascade,
  viewer_ref     text not null,
  lead_id        uuid references leads(id) on delete set null,
  block_id       text not null,
  answer         text not null,
  at             timestamptz not null default now()
);

create index on quiz_responses (activation_id, block_id);

-- ============================================================
-- CHAT
-- ============================================================

create table chat_messages (
  id           bigserial primary key,
  room_id      uuid not null references rooms(id) on delete cascade,
  lead_id      uuid references leads(id) on delete set null,
  user_id      uuid references auth.users(id) on delete set null,
  display_name text not null,
  body         text not null,
  is_host      boolean not null default false,
  deleted_at   timestamptz,
  created_at   timestamptz not null default now()
);

create index on chat_messages (room_id, created_at);

-- ============================================================
-- ORDERS (webhooks das plataformas)
-- ============================================================

create type order_status as enum ('pending', 'paid', 'refunded', 'chargeback', 'canceled');

create table orders (
  id             uuid primary key default gen_random_uuid(),
  account_id     uuid not null references accounts(id) on delete cascade,
  room_id        uuid references rooms(id) on delete set null,
  activation_id  uuid references pitch_activations(id) on delete set null,
  provider       text not null,              -- eduzz | hotmart | kiwify | xgrow
  external_id    text not null,
  viewer_ref     text,
  lead_id        uuid references leads(id) on delete set null,
  amount_brl     numeric(10,2),
  status         order_status not null default 'pending',
  raw            jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  unique (provider, external_id)
);

create index on orders (account_id, created_at desc);

-- ============================================================
-- INTEGRAÇÕES & OUTBOX
-- ============================================================

create table integrations (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references accounts(id) on delete cascade,
  kind        text not null,                 -- webhook | zapier | make | activecampaign
  config      jsonb not null default '{}'::jsonb,
  secret      text,                          -- assinatura HMAC
  enabled     boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Eventos canônicos; entrega por processo separado, permite reenvio
create table events (
  id          bigserial primary key,
  account_id  uuid not null references accounts(id) on delete cascade,
  room_id     uuid references rooms(id) on delete set null,
  type        text not null,                 -- lead.registered | order.paid | ...
  payload     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index on events (account_id, created_at desc);

create table event_deliveries (
  id              bigserial primary key,
  event_id        bigint not null references events(id) on delete cascade,
  integration_id  uuid not null references integrations(id) on delete cascade,
  status          text not null default 'pending',  -- pending | sent | failed
  attempts        integer not null default 0,
  last_error      text,
  delivered_at    timestamptz
);

create index on event_deliveries (status, attempts);

-- ============================================================
-- AUDITORIA
-- ============================================================

create table audit_log (
  id          bigserial primary key,
  account_id  uuid references accounts(id) on delete set null,
  actor_id    uuid references auth.users(id) on delete set null,
  action      text not null,                 -- 'room.display_viewers.enabled', 'admin.impersonate'
  target      text,
  payload     jsonb not null default '{}'::jsonb,
  at          timestamptz not null default now()
);

create index on audit_log (account_id, at desc);

-- ============================================================
-- RLS
-- ============================================================

create or replace function public.is_account_member(p_account uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from account_members m
     where m.account_id = p_account and m.user_id = auth.uid()
  );
$$;

alter table accounts            enable row level security;
alter table account_members     enable row level security;
alter table account_features    enable row level security;
alter table rooms               enable row level security;
alter table room_secrets        enable row level security;
alter table pitches             enable row level security;
alter table pitch_activations   enable row level security;
alter table leads               enable row level security;
alter table room_registrations  enable row level security;
alter table viewer_sessions     enable row level security;
alter table viewer_heartbeats   enable row level security;
alter table pitch_events        enable row level security;
alter table quiz_responses      enable row level security;
alter table chat_messages       enable row level security;
alter table orders              enable row level security;
alter table integrations        enable row level security;
alter table events              enable row level security;
alter table audit_log           enable row level security;

-- Membros enxergam a própria conta
create policy account_read on accounts
  for select using (public.is_account_member(id));

create policy members_read on account_members
  for select using (public.is_account_member(account_id));

create policy account_features_read on account_features
  for select using (public.is_account_member(account_id));

-- Tabelas por conta: membros leem e escrevem
create policy rooms_rw on rooms
  for all using (public.is_account_member(account_id))
  with check (public.is_account_member(account_id));

create policy leads_rw on leads
  for all using (public.is_account_member(account_id))
  with check (public.is_account_member(account_id));

create policy orders_rw on orders
  for all using (public.is_account_member(account_id))
  with check (public.is_account_member(account_id));

create policy integrations_rw on integrations
  for all using (public.is_account_member(account_id))
  with check (public.is_account_member(account_id));

create policy events_read on events
  for select using (public.is_account_member(account_id));

create policy audit_read on audit_log
  for select using (public.is_account_member(account_id));

-- Tabelas por sala: herda a conta da sala
create policy pitches_rw on pitches
  for all using (exists (select 1 from rooms r where r.id = room_id and public.is_account_member(r.account_id)))
  with check (exists (select 1 from rooms r where r.id = room_id and public.is_account_member(r.account_id)));

create policy activations_rw on pitch_activations
  for all using (exists (select 1 from rooms r where r.id = room_id and public.is_account_member(r.account_id)))
  with check (exists (select 1 from rooms r where r.id = room_id and public.is_account_member(r.account_id)));

create policy registrations_read on room_registrations
  for select using (exists (select 1 from rooms r where r.id = room_id and public.is_account_member(r.account_id)));

create policy sessions_read on viewer_sessions
  for select using (exists (select 1 from rooms r where r.id = room_id and public.is_account_member(r.account_id)));

create policy heartbeats_read on viewer_heartbeats
  for select using (exists (select 1 from rooms r where r.id = room_id and public.is_account_member(r.account_id)));

create policy chat_read on chat_messages
  for select using (exists (select 1 from rooms r where r.id = room_id and public.is_account_member(r.account_id)));

-- room_secrets: nenhuma policy. Só service role (nunca chega ao navegador).
-- Espectador (anônimo) não usa RLS: passa por Edge Function com service role,
-- que valida o token assinado da sala antes de inserir lead/chat/heartbeat.

-- ============================================================
-- SEED — features e planos iniciais
-- ============================================================

insert into features (key, name, type, description) values
  ('room.live',              'Live (1 → N)',              'module', 'Transmissão ao vivo'),
  ('room.meeting',           'Sala de vídeo (grade)',     'module', 'Reunião estilo Zoom'),
  ('room.display_viewers',   'Espectadores exibidos',     'module', 'Número configurável na tela'),
  ('block.text',             'Bloco: texto',              'module', null),
  ('block.button',           'Bloco: botão',              'module', null),
  ('block.quiz',             'Bloco: quiz',               'module', null),
  ('block.timer',            'Bloco: timer',              'module', null),
  ('block.checkout',         'Bloco: checkout',           'module', null),
  ('checkout.eduzz',         'Checkout Eduzz (inline)',   'module', null),
  ('checkout.hotmart',       'Checkout Hotmart (widget)', 'module', null),
  ('checkout.kiwify',        'Checkout Kiwify (janela)',  'module', null),
  ('checkout.xgrow',         'Checkout Xgrow (janela)',   'module', null),
  ('tracking.meta',          'Pixel + CAPI Meta',         'module', null),
  ('tracking.google',        'GA4 + Google Ads',          'module', null),
  ('integration.webhook',    'Webhook de eventos',        'module', null),
  ('analytics.retention',    'Curva de retenção',         'module', null),
  ('limit.seats',            'Assentos',                  'limit',  'Membros por conta'),
  ('limit.viewers_per_room', 'Espectadores por sala',     'limit',  null),
  ('limit.hours_per_month',  'Horas de transmissão/mês',  'limit',  null);

insert into plans (id, name, price_brl, interval) values
  ('starter', 'Starter', 97.00,  'month'),
  ('pro',     'Pro',     297.00, 'month'),
  ('scale',   'Scale',   697.00, 'month');

insert into plan_features (plan_id, feature_key, enabled, limit_value) values
  ('starter', 'room.live', true, null),
  ('starter', 'block.text', true, null),
  ('starter', 'block.button', true, null),
  ('starter', 'block.checkout', true, null),
  ('starter', 'checkout.eduzz', true, null),
  ('starter', 'checkout.hotmart', true, null),
  ('starter', 'limit.seats', true, 2),
  ('starter', 'limit.viewers_per_room', true, 200),
  ('starter', 'limit.hours_per_month', true, 20),

  ('pro', 'room.live', true, null),
  ('pro', 'room.meeting', true, null),
  ('pro', 'room.display_viewers', true, null),
  ('pro', 'block.text', true, null),
  ('pro', 'block.button', true, null),
  ('pro', 'block.quiz', true, null),
  ('pro', 'block.timer', true, null),
  ('pro', 'block.checkout', true, null),
  ('pro', 'checkout.eduzz', true, null),
  ('pro', 'checkout.hotmart', true, null),
  ('pro', 'checkout.kiwify', true, null),
  ('pro', 'checkout.xgrow', true, null),
  ('pro', 'tracking.meta', true, null),
  ('pro', 'tracking.google', true, null),
  ('pro', 'analytics.retention', true, null),
  ('pro', 'limit.seats', true, 5),
  ('pro', 'limit.viewers_per_room', true, 1000),
  ('pro', 'limit.hours_per_month', true, 60),

  ('scale', 'room.live', true, null),
  ('scale', 'room.meeting', true, null),
  ('scale', 'room.display_viewers', true, null),
  ('scale', 'block.text', true, null),
  ('scale', 'block.button', true, null),
  ('scale', 'block.quiz', true, null),
  ('scale', 'block.timer', true, null),
  ('scale', 'block.checkout', true, null),
  ('scale', 'checkout.eduzz', true, null),
  ('scale', 'checkout.hotmart', true, null),
  ('scale', 'checkout.kiwify', true, null),
  ('scale', 'checkout.xgrow', true, null),
  ('scale', 'tracking.meta', true, null),
  ('scale', 'tracking.google', true, null),
  ('scale', 'integration.webhook', true, null),
  ('scale', 'analytics.retention', true, null),
  ('scale', 'limit.seats', true, 15),
  ('scale', 'limit.viewers_per_room', true, 5000),
  ('scale', 'limit.hours_per_month', true, null);
