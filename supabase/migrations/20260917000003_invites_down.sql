-- Rollback dos convites e admins da plataforma
drop function if exists private.assentos_usados(uuid);
drop policy if exists invites_read on invites;
drop table if exists invites;
drop table if exists platform_admins;
