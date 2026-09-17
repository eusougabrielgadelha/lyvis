-- Lyvo — rollback do schema inicial
-- Reverte 20260917000001_init.sql

drop policy if exists chat_read          on chat_messages;
drop policy if exists heartbeats_read    on viewer_heartbeats;
drop policy if exists sessions_read      on viewer_sessions;
drop policy if exists registrations_read on room_registrations;
drop policy if exists activations_rw     on pitch_activations;
drop policy if exists pitches_rw         on pitches;
drop policy if exists audit_read         on audit_log;
drop policy if exists events_read        on events;
drop policy if exists integrations_rw    on integrations;
drop policy if exists orders_rw          on orders;
drop policy if exists leads_rw           on leads;
drop policy if exists rooms_rw           on rooms;
drop policy if exists account_features_read on account_features;
drop policy if exists members_read       on account_members;
drop policy if exists account_read       on accounts;

drop function if exists public.is_account_member(uuid);
drop function if exists public.feature_limit(uuid, text);
drop function if exists public.has_feature(uuid, text);

drop table if exists audit_log;
drop table if exists event_deliveries;
drop table if exists events;
drop table if exists integrations;
drop table if exists orders;
drop table if exists chat_messages;
drop table if exists quiz_responses;
drop table if exists pitch_events;
drop table if exists room_retention_buckets;
drop table if exists viewer_heartbeats;
drop table if exists viewer_sessions;
drop table if exists room_registrations;
drop table if exists leads;
drop table if exists pitch_activations;
drop table if exists pitches;
drop table if exists room_secrets;
drop table if exists rooms;
drop table if exists account_features;
drop table if exists plan_features;
drop table if exists features;
drop table if exists account_members;
drop table if exists accounts;
drop table if exists plans;

drop type if exists order_status;
drop type if exists room_status;
drop type if exists room_mode;
drop type if exists feature_type;
drop type if exists member_role;
drop type if exists account_status;
