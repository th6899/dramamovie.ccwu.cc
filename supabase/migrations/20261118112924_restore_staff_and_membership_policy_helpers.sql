begin;
CREATE OR REPLACE FUNCTION public.current_staff_role()
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select r.role
  from private.user_roles as r
  where r.user_id = (select auth.uid())
  order by case r.role
    when 'admin' then 1
    when 'editor' then 2
    when 'support' then 3
    else 4
  end
  limit 1;
$function$;

CREATE OR REPLACE FUNCTION public.has_active_membership()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select exists (
    select 1
    from public.membership_subscriptions ms
    where ms.user_id = (select auth.uid())
      and ms.status = 'active'
      and ms.starts_at is not null
      and ms.starts_at <= now()
      and ms.ends_at is not null
      and ms.ends_at > now()
  );
$function$;
revoke all on function public.current_staff_role() from public,anon,authenticated,service_role;
grant execute on function public.current_staff_role() to authenticated,service_role;
revoke all on function public.has_active_membership() from public,anon,authenticated,service_role;
grant execute on function public.has_active_membership() to authenticated,service_role;
commit;