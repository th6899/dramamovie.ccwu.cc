begin;
create or replace function public.is_staff()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $function$
  select public.is_ccwu_admin()
$function$;
revoke all on function public.is_staff() from public, anon;
grant execute on function public.is_staff() to authenticated, service_role;
commit;
