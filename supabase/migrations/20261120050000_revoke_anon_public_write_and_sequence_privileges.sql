begin;

-- Anonymous browser clients are read-only. RLS remains the row-level control,
-- while these grants remove unnecessary write capabilities at the SQL privilege layer.
revoke insert, update, delete, truncate, references, trigger
on all tables in schema public from anon;

-- Anonymous clients never need to allocate or mutate sequence values directly.
revoke all privileges on all sequences in schema public from anon;

-- Prevent future postgres-owned public tables/sequences from inheriting broad
-- anonymous privileges. Keep SELECT available only when a table migration
-- explicitly grants it.
alter default privileges for role postgres in schema public
revoke all privileges on tables from anon;
alter default privileges for role postgres in schema public
revoke all privileges on sequences from anon;

-- supabase_admin may own objects created by platform-managed workflows.
-- Attempt to tighten its defaults when the current migration role is permitted;
-- otherwise current-table grants above still apply and the notice records the limit.
do $$
begin
  begin
    execute 'alter default privileges for role supabase_admin in schema public revoke all privileges on tables from anon';
    execute 'alter default privileges for role supabase_admin in schema public revoke all privileges on sequences from anon';
  exception when insufficient_privilege or invalid_role_specification then
    raise notice 'Could not change supabase_admin default privileges; postgres defaults and existing tables were hardened';
  end;
end;
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.role_table_grants
    where table_schema='public'
      and grantee='anon'
      and privilege_type in ('INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER')
  ) then
    raise exception 'ANON_PUBLIC_TABLE_WRITE_PRIVILEGES_REMAIN';
  end if;
  if exists (
    select 1
    from information_schema.role_usage_grants
    where object_schema='public'
      and grantee='anon'
      and object_type='SEQUENCE'
  ) then
    raise exception 'ANON_PUBLIC_SEQUENCE_PRIVILEGES_REMAIN';
  end if;
end;
$$;

commit;
