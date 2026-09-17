-- Lyvis — convites e administradores da plataforma
-- Created: 2026-09-17
-- Rollback: 20260917000003_invites_down.sql

-- Quem opera a plataforma (Gabriel e equipe da Lyvis).
-- Fica fora de `accounts`: é acesso à plataforma inteira, não a um cliente.
create table platform_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  note       text,
  created_at timestamptz not null default now()
);

create table invites (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references accounts(id) on delete cascade,
  email       text not null,                      -- normalizado em minúsculas
  role        member_role not null default 'host',
  token_hash  text not null unique,               -- sha256 do token; o link não fica no banco
  invited_by  uuid references auth.users(id) on delete set null,
  expires_at  timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  created_at  timestamptz not null default now()
);

create index on invites (account_id) where accepted_at is null;
create unique index invites_pendente_key on invites (account_id, email) where accepted_at is null;

alter table platform_admins enable row level security;
alter table invites         enable row level security;

-- Convites: membros da conta enxergam os seus. Criar e aceitar passa pelo
-- servidor (service role), porque quem aceita ainda não é membro.
create policy invites_read on invites
  for select using (private.is_account_member(account_id));

comment on table platform_admins is 'Acesso ao painel da plataforma. Sem policy: só service role.';

-- Assentos ocupados = membros + convites pendentes. Usado pelo limite do plano.
create or replace function private.assentos_usados(p_account uuid)
returns integer language sql stable security definer set search_path = public as $$
  select
    (select count(*) from account_members m where m.account_id = p_account)
  + (select count(*) from invites i where i.account_id = p_account and i.accepted_at is null and i.expires_at > now());
$$;

grant execute on all functions in schema private to authenticated, service_role;
