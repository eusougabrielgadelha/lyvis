-- Rollback: devolve as funções auxiliares ao schema public
-- (reverter só se algo depender de chamá-las via /rest/v1/rpc/)
-- Recriar as funções em public com o corpo de 20260917000001_init.sql,
-- recriar as policies apontando para public.* e então:
drop schema if exists private cascade;
