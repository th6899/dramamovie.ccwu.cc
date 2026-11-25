-- Move the privileged admin-role check into the private schema.
-- The public helper remains SECURITY INVOKER and delegates to the private helper.
begin;
create or replace function private.is_ccwu_admin()
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
 select exists(
  select 1 from private.user_roles r
  where r.user_id=(select auth.uid()) and r.role='admin'
 );
$function$;
revoke all on function private.is_ccwu_admin() from public,anon,authenticated,service_role;
grant execute on function private.is_ccwu_admin() to authenticated,service_role;

create or replace function public.is_ccwu_admin()
returns boolean
language sql
stable
security invoker
set search_path to ''
as $function$
 select private.is_ccwu_admin();
$function$;
revoke all on function public.is_ccwu_admin() from public,anon,authenticated,service_role;
grant execute on function public.is_ccwu_admin() to authenticated,service_role;
commit;
