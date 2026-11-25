begin;
CREATE OR REPLACE FUNCTION public.approve_manual_payment(p_submission_id uuid, p_admin_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_s record;
  v_t record;
  v_duration integer;
begin
  -- Payment approval is a financial action: only the explicit admin role may execute it.
  if auth.uid() is null or not exists (
    select 1
    from private.user_roles as r
    where r.user_id = (select auth.uid())
      and r.role = 'admin'
  ) then
    raise exception 'admin_only';
  end if;

  select
    s.id,
    s.order_id,
    s.status as submission_status,
    o.user_id,
    o.item_type,
    o.item_id,
    o.status as order_status
  into v_s
  from public.manual_payment_submissions as s
  join public.service_orders as o on o.id = s.order_id
  where s.id = p_submission_id
  for update of s, o;

  if not found then
    raise exception 'submission_not_found';
  end if;

  if v_s.submission_status <> 'submitted' or v_s.order_status <> 'pending' then
    raise exception 'submission_not_approvable';
  end if;

  select id, metadata
  into v_t
  from private.payment_transactions
  where order_id = v_s.order_id
    and provider = 'manual'
    and status in ('created', 'pending')
  for update;

  if not found then
    raise exception 'payment_transaction_not_found';
  end if;

  v_duration := nullif(v_t.metadata->>'duration_days', '')::integer;

  if v_duration is null or v_duration <= 0 then
    raise exception 'invalid_entitlement_duration';
  end if;

  update private.payment_transactions
  set status = 'succeeded', verified_at = now()
  where id = v_t.id;

  update public.service_orders
  set status = 'paid', updated_at = now()
  where id = v_s.order_id and status = 'pending';

  update public.manual_payment_submissions
  set status = 'approved',
      admin_note = p_admin_note,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = p_submission_id;

  if v_s.item_type = 'membership' then
    insert into public.membership_subscriptions(
      user_id, plan_id, source_order_id, status, starts_at, ends_at
    )
    values (
      v_s.user_id, v_s.item_id, v_s.order_id, 'active', now(),
      now() + make_interval(days => v_duration)
    )
    on conflict (source_order_id) do nothing;
  elsif v_s.item_type = 'vpn' then
    insert into public.vpn_subscriptions(
      user_id, plan_id, source_order_id, status, starts_at, ends_at, provider_reference
    )
    values (
      v_s.user_id, v_s.item_id, v_s.order_id, 'active', now(),
      now() + make_interval(days => v_duration),
      'manual_qr:' || v_s.order_id::text
    )
    on conflict (source_order_id) do nothing;
  else
    raise exception 'unsupported_order_item_type';
  end if;

  return jsonb_build_object('ok', true, 'order_id', v_s.order_id, 'status', 'paid');
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_manual_payment_order(p_item_type text, p_item_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := auth.uid(); v_amount numeric; v_currency text; v_title text;
  v_duration integer; v_devices integer; v_order_id uuid; v_order_no text;
begin
  if v_user is null then raise exception 'authentication_required'; end if;
  if p_item_type = 'membership' then
    select price_amount, upper(currency), name, duration_days, null::integer
      into v_amount,v_currency,v_title,v_duration,v_devices from public.membership_plans where id=p_item_id and is_active;
  elsif p_item_type = 'vpn' then
    select price_amount, upper(currency), name, duration_days, device_limit
      into v_amount,v_currency,v_title,v_duration,v_devices from public.vpn_plans where id=p_item_id and is_active;
  else raise exception 'unsupported_item_type'; end if;
  if v_title is null or v_amount is null or v_amount <= 0 then raise exception 'plan_not_payable'; end if;
  if v_currency <> 'CNY' then raise exception 'manual_qr_payment_only_supports_cny'; end if;
  v_order_no := 'CCWU-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,14));
  insert into public.service_orders(user_id,order_no,item_type,item_id,amount,currency,status)
    values(v_user,v_order_no,p_item_type,p_item_id,v_amount,v_currency,'pending') returning id into v_order_id;
  insert into private.payment_transactions(order_id,provider,amount,currency,status,metadata)
    values(v_order_id,'manual',v_amount,v_currency,'created',jsonb_build_object('plan_name',v_title,'duration_days',v_duration,'device_limit',v_devices));
  return jsonb_build_object('order_id',v_order_id,'order_no',v_order_no,'title',v_title,'amount',v_amount,'currency',v_currency,'item_type',p_item_type,'item_id',p_item_id);
end; $function$;
revoke all on function public.approve_manual_payment(uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.approve_manual_payment(uuid,text) to authenticated,service_role;
revoke all on function public.create_manual_payment_order(text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.create_manual_payment_order(text,uuid) to authenticated,service_role;
commit;
