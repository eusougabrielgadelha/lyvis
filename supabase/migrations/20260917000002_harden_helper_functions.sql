-- Lyvis — move as funções auxiliares para schema privado
-- Created: 2026-09-17
-- Motivo: o advisor do Supabase apontou que has_feature, feature_limit e
-- is_account_member ficavam expostas em /rest/v1/rpc/ e podiam ser chamadas
-- por anon. Elas só precisam existir para as policies.
-- Rollback: 20260917000002_harden_helper_functions_down.sql

create schema if not exists private;

create or replace function private.is_account_member(p_account uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from account_members m where m.account_id = p_account and m.user_id = auth.uid());
$$;

create or replace function private.has_feature(p_account uuid, p_key text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select af.enabled from account_features af
      where af.account_id = p_account and af.feature_key = p_key
        and (af.expires_at is null or af.expires_at > now())),
    (select pf.enabled from accounts a join plan_features pf on pf.plan_id = a.plan_id
      where a.id = p_account and pf.feature_key = p_key),
    false);
$$;

create or replace function private.feature_limit(p_account uuid, p_key text)
returns integer language sql stable security definer set search_path = public as $$
  select coalesce(
    (select af.limit_value from account_features af
      where af.account_id = p_account and af.feature_key = p_key
        and (af.expires_at is null or af.expires_at > now())),
    (select pf.limit_value from accounts a join plan_features pf on pf.plan_id = a.plan_id
      where a.id = p_account and pf.feature_key = p_key));
$$;

drop policy account_read on accounts;
drop policy members_read on account_members;
drop policy account_features_read on account_features;
drop policy rooms_rw on rooms;
drop policy leads_rw on leads;
drop policy orders_rw on orders;
drop policy integrations_rw on integrations;
drop policy events_read on events;
drop policy audit_read on audit_log;
drop policy pitches_rw on pitches;
drop policy activations_rw on pitch_activations;
drop policy registrations_read on room_registrations;
drop policy sessions_read on viewer_sessions;
drop policy heartbeats_read on viewer_heartbeats;
drop policy retention_read on room_retention_buckets;
drop policy pitch_events_read on pitch_events;
drop policy quiz_responses_read on quiz_responses;
drop policy chat_read on chat_messages;
drop policy deliveries_read on event_deliveries;

drop function public.is_account_member(uuid);
drop function public.has_feature(uuid, text);
drop function public.feature_limit(uuid, text);

create policy account_read on accounts
  for select using (private.is_account_member(id));
create policy members_read on account_members
  for select using (private.is_account_member(account_id));
create policy account_features_read on account_features
  for select using (private.is_account_member(account_id));
create policy rooms_rw on rooms
  for all using (private.is_account_member(account_id))
  with check (private.is_account_member(account_id));
create policy leads_rw on leads
  for all using (private.is_account_member(account_id))
  with check (private.is_account_member(account_id));
create policy orders_rw on orders
  for all using (private.is_account_member(account_id))
  with check (private.is_account_member(account_id));
create policy integrations_rw on integrations
  for all using (private.is_account_member(account_id))
  with check (private.is_account_member(account_id));
create policy events_read on events
  for select using (private.is_account_member(account_id));
create policy audit_read on audit_log
  for select using (private.is_account_member(account_id));
create policy pitches_rw on pitches
  for all using (exists (select 1 from rooms r where r.id = room_id and private.is_account_member(r.account_id)))
  with check (exists (select 1 from rooms r where r.id = room_id and private.is_account_member(r.account_id)));
create policy activations_rw on pitch_activations
  for all using (exists (select 1 from rooms r where r.id = room_id and private.is_account_member(r.account_id)))
  with check (exists (select 1 from rooms r where r.id = room_id and private.is_account_member(r.account_id)));
create policy registrations_read on room_registrations
  for select using (exists (select 1 from rooms r where r.id = room_id and private.is_account_member(r.account_id)));
create policy sessions_read on viewer_sessions
  for select using (exists (select 1 from rooms r where r.id = room_id and private.is_account_member(r.account_id)));
create policy heartbeats_read on viewer_heartbeats
  for select using (exists (select 1 from rooms r where r.id = room_id and private.is_account_member(r.account_id)));
create policy retention_read on room_retention_buckets
  for select using (exists (select 1 from rooms r where r.id = room_id and private.is_account_member(r.account_id)));
create policy pitch_events_read on pitch_events
  for select using (exists (select 1 from pitch_activations pa join rooms r on r.id = pa.room_id
    where pa.id = activation_id and private.is_account_member(r.account_id)));
create policy quiz_responses_read on quiz_responses
  for select using (exists (select 1 from pitch_activations pa join rooms r on r.id = pa.room_id
    where pa.id = activation_id and private.is_account_member(r.account_id)));
create policy chat_read on chat_messages
  for select using (exists (select 1 from rooms r where r.id = room_id and private.is_account_member(r.account_id)));
create policy deliveries_read on event_deliveries
  for select using (exists (select 1 from events e where e.id = event_id and private.is_account_member(e.account_id)));

grant usage on schema private to authenticated, service_role;
grant execute on all functions in schema private to authenticated, service_role;
