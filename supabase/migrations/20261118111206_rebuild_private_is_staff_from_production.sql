begin;
CREATE OR REPLACE FUNCTION private.is_staff()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1 from private.user_roles r
    where r.user_id = (select auth.uid())
      and r.role in ('admin','editor','support')
  );
$function$;
revoke all on function private.is_staff() from public,anon,authenticated,service_role;
grant execute on function private.is_staff() to authenticated;
commit;
