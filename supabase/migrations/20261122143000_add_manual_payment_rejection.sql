create or replace function public.reject_manual_payment(
  p_submission_id uuid,
  p_admin_note text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_s record;
  v_rows integer;
begin
  if auth.uid() is null or not exists (
    select 1 from private.user_roles r
    where r.user_id = (select auth.uid()) and r.role = 'admin'
  ) then
    raise exception 'admin_only';
  end if;

  select s.id, s.order_id, s.status as submission_status,
         o.status as order_status
    into v_s
    from public.manual_payment_submissions s
    join public.service_orders o on o.id = s.order_id
   where s.id = p_submission_id
   for update of s, o;

  if not found then raise exception 'submission_not_found'; end if;
  if v_s.submission_status <> 'submitted' or v_s.order_status <> 'pending' then
    raise exception 'submission_not_rejectable';
  end if;

  update public.manual_payment_submissions
     set status = 'rejected',
         admin_note = nullif(left(coalesce(p_admin_note, ''), 500), ''),
         reviewed_by = auth.uid(),
         reviewed_at = now()
   where id = p_submission_id and status = 'submitted';
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then raise exception 'payment_submission_state_changed'; end if;

  update private.payment_transactions
     set status = 'failed'
   where order_id = v_s.order_id
     and provider = 'manual'
     and status in ('created', 'pending');

  update public.service_orders
     set status = 'failed',
         payment_closed_at = now(),
         updated_at = now()
   where id = v_s.order_id and status = 'pending';
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then raise exception 'payment_order_state_changed'; end if;

  return jsonb_build_object('ok', true, 'order_id', v_s.order_id, 'status', 'rejected');
end;
$function$;

revoke all on function public.reject_manual_payment(uuid, text) from public, anon;
grant execute on function public.reject_manual_payment(uuid, text) to authenticated;
