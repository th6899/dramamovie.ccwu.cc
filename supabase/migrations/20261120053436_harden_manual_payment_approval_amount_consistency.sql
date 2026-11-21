-- Harden manual-payment approval against mismatched or cross-owner ledger rows.
CREATE OR REPLACE FUNCTION public.approve_manual_payment(p_submission_id uuid, p_admin_note text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare v_s record; v_t record; v_duration integer; v_rows integer;
begin
  if auth.uid() is null or not exists (
    select 1 from private.user_roles r where r.user_id=(select auth.uid()) and r.role='admin'
  ) then raise exception 'admin_only'; end if;
  select s.id,s.order_id,s.user_id as submission_user_id,s.status as submission_status,
    o.user_id,o.item_type,o.item_id,o.amount as order_amount,o.currency as order_currency,o.status as order_status
  into v_s from public.manual_payment_submissions s
  join public.service_orders o on o.id=s.order_id
  where s.id=p_submission_id for update of s,o;
  if not found then raise exception 'submission_not_found'; end if;
  if v_s.submission_status<>'submitted' or v_s.order_status<>'pending' then raise exception 'submission_not_approvable'; end if;
  if v_s.submission_user_id is distinct from v_s.user_id then raise exception 'submission_order_owner_mismatch'; end if;
  if v_s.order_currency<>'CNY' or v_s.order_amount is null or v_s.order_amount<=0 then raise exception 'manual_payment_order_amount_invalid'; end if;
  select id,amount,currency,asset,metadata into v_t from private.payment_transactions
  where order_id=v_s.order_id and provider='manual' and status in ('created','pending') for update;
  if not found then raise exception 'payment_transaction_not_found'; end if;
  if v_t.currency<>'CNY' or v_t.asset<>'CNY' or v_t.amount is null or v_t.amount<>v_s.order_amount then
    raise exception 'manual_payment_amount_or_currency_mismatch'; end if;
  v_duration:=nullif(v_t.metadata->>'duration_days','')::integer;
  if v_duration is null or v_duration<=0 then raise exception 'invalid_entitlement_duration'; end if;
  update private.payment_transactions set status='succeeded',verified_at=now()
  where id=v_t.id and status in ('created','pending');
  get diagnostics v_rows=row_count;
  if v_rows<>1 then raise exception 'payment_transaction_state_changed'; end if;
  update public.service_orders set status='paid',updated_at=now()
  where id=v_s.order_id and status='pending';
  get diagnostics v_rows=row_count;
  if v_rows<>1 then raise exception 'payment_order_state_changed'; end if;
  update public.manual_payment_submissions set status='approved',admin_note=p_admin_note,
    reviewed_by=auth.uid(),reviewed_at=now() where id=p_submission_id and status='submitted';
  get diagnostics v_rows=row_count;
  if v_rows<>1 then raise exception 'payment_submission_state_changed'; end if;
  if v_s.item_type='membership' then
    insert into public.membership_subscriptions(user_id,plan_id,source_order_id,status,starts_at,ends_at)
    values(v_s.user_id,v_s.item_id,v_s.order_id,'active',now(),now()+make_interval(days=>v_duration))
    on conflict(source_order_id) do nothing;
  elsif v_s.item_type='vpn' then
    insert into public.vpn_subscriptions(user_id,plan_id,source_order_id,status,starts_at,ends_at,provider_reference)
    values(v_s.user_id,v_s.item_id,v_s.order_id,'active',now(),now()+make_interval(days=>v_duration),'manual_qr:'||v_s.order_id::text)
    on conflict(source_order_id) do nothing;
  else raise exception 'unsupported_order_item_type'; end if;
  return jsonb_build_object('ok',true,'order_id',v_s.order_id,'status','paid');
end;
$function$;
REVOKE ALL ON FUNCTION public.approve_manual_payment(uuid,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.approve_manual_payment(uuid,text) TO authenticated,service_role;
