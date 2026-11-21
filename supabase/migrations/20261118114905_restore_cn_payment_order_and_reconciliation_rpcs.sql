begin;
CREATE OR REPLACE FUNCTION public.attach_cn_payment_session(p_order_id uuid, p_provider text, p_qr_code text, p_provider_session_id text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_rows integer;
begin
  if (select auth.jwt()->>'role') is distinct from 'service_role' then raise exception 'service_role_required'; end if;
  if p_provider not in ('alipay','wechat_pay') or p_order_id is null
     or coalesce(p_qr_code,'')='' or length(p_qr_code)>4096 then raise exception 'invalid_payment_session';
  end if;
  update private.payment_transactions t
     set status='pending',
         metadata=t.metadata||jsonb_build_object('provider_qr_code',p_qr_code,
           'provider_session_id',left(coalesce(p_provider_session_id,''),128),'session_created_at',now())
   where t.order_id=p_order_id and t.provider=p_provider and t.currency='CNY'
     and t.status='created'
     and exists(select 1 from public.service_orders o where o.id=t.order_id and o.status='pending' and o.currency='CNY');
  get diagnostics v_rows = row_count;
  return v_rows=1;
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_cn_payment_order(p_item_type text, p_item_id uuid, p_provider text, p_request_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := auth.uid();
  v_amount numeric; v_currency text; v_title text; v_duration integer; v_devices integer;
  v_order_id uuid; v_order_no text; v_tx_id uuid; v_method record; v_existing record;
begin
  if v_user is null then raise exception 'authentication_required'; end if;
  if p_provider not in ('alipay','wechat_pay') then raise exception 'unsupported_cn_provider'; end if;
  if coalesce(p_request_key,'') !~ '^[0-9a-fA-F-]{36}$' then raise exception 'invalid_request_key'; end if;
  select o.id,o.order_no,o.amount,o.currency,o.status into v_existing
    from public.service_orders o join private.payment_transactions t on t.order_id=o.id
   where o.user_id=v_user and t.provider=p_provider and t.metadata->>'request_key'=p_request_key limit 1;
  if found then
    return jsonb_build_object('order_id',v_existing.id,'order_no',v_existing.order_no,
      'amount',v_existing.amount,'currency',v_existing.currency,'status',v_existing.status,'duplicate',true);
  end if;
  select * into v_method from public.payment_methods
   where provider=p_provider and asset='CNY' and is_enabled=true order by sort_order limit 1;
  if not found then raise exception 'payment_channel_unavailable'; end if;
  if p_item_type='membership' then
    select price_amount,upper(currency),name,duration_days,null::integer
      into v_amount,v_currency,v_title,v_duration,v_devices
      from public.membership_plans where id=p_item_id and is_active for share;
  elsif p_item_type='vpn' then
    select price_amount,upper(currency),name,duration_days,device_limit
      into v_amount,v_currency,v_title,v_duration,v_devices
      from public.vpn_plans where id=p_item_id and is_active for share;
  else raise exception 'unsupported_item_type'; end if;
  if v_title is null or v_amount is null or v_amount<=0 or v_duration is null or v_duration<=0 then raise exception 'plan_not_payable'; end if;
  if v_currency<>'CNY' then raise exception 'cn_payment_requires_cny_plan'; end if;
  v_order_no := 'CCWU-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,14));
  insert into public.service_orders(user_id,order_no,item_type,item_id,amount,currency,status)
    values(v_user,v_order_no,p_item_type,p_item_id,v_amount,'CNY','pending') returning id into v_order_id;
  insert into private.payment_transactions(order_id,provider,asset,amount,currency,status,metadata)
    values(v_order_id,p_provider,'CNY',v_amount,'CNY','created',
      jsonb_build_object('plan_name',v_title,'duration_days',v_duration,'device_limit',v_devices,
        'request_key',p_request_key,'payment_method_code',v_method.code))
    returning id into v_tx_id;
  return jsonb_build_object('order_id',v_order_id,'order_no',v_order_no,'transaction_id',v_tx_id,
    'title',v_title,'amount',v_amount,'currency','CNY','item_type',p_item_type,'item_id',p_item_id,
    'environment',v_method.environment,'duplicate',false);
exception when unique_violation then
  select o.id,o.order_no,o.amount,o.currency,o.status into v_existing
    from public.service_orders o join private.payment_transactions t on t.order_id=o.id
   where o.user_id=v_user and t.provider=p_provider and t.metadata->>'request_key'=p_request_key limit 1;
  if found then
    return jsonb_build_object('order_id',v_existing.id,'order_no',v_existing.order_no,
      'amount',v_existing.amount,'currency',v_existing.currency,'status',v_existing.status,'duplicate',true);
  end if;
  raise;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_cn_payment_order(p_order_no text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_result jsonb;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select jsonb_build_object(
    'order_id',o.id,'order_no',o.order_no,'amount',o.amount,'currency',o.currency,
    'status',o.status,'payment_expires_at',o.payment_expires_at,
    'provider',t.provider,'transaction_status',t.status,
    'provider_reference',t.provider_reference
  ) into v_result
  from public.service_orders o
  join private.payment_transactions t on t.order_id=o.id
  where o.order_no=p_order_no and o.user_id=auth.uid()
    and o.currency='CNY' and t.provider in ('alipay','wechat_pay')
  order by t.created_at desc limit 1;
  if v_result is null then raise exception 'cn_payment_order_not_found'; end if;
  return v_result;
end;
$function$;

CREATE OR REPLACE FUNCTION public.process_cn_payment_success(p_provider text, p_event_id text, p_event_type text, p_provider_trade_no text, p_order_no text, p_amount numeric, p_currency text, p_payload_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if (select auth.jwt()->>'role') is distinct from 'service_role' then
    raise exception 'service_role_required';
  end if;
  return private.process_cn_payment_success(
    p_provider, p_event_id, p_event_type, p_provider_trade_no,
    p_order_no, p_amount, p_currency, p_payload_hash
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.record_cn_payment_reconciliation(p_provider text, p_order_no text, p_provider_state text, p_provider_trade_no text, p_amount numeric, p_currency text, p_response_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_order record;
  v_tx record;
  v_outcome text := 'pending';
  v_settlement jsonb;
  v_payload_hash text;
  v_event_id text;
begin
  if (select auth.jwt()->>'role') is distinct from 'service_role' then
    raise exception 'service_role_required';
  end if;
  if p_provider not in ('alipay','wechat_pay')
    or p_provider_state not in ('SUCCESS','TRADE_SUCCESS','CLOSED','TRADE_CLOSED','NOTPAY','USERPAYING','PAYERROR','REVOKED','UNKNOWN')
    or nullif(p_order_no,'') is null
    or p_amount is null or p_amount < 0
    or upper(coalesce(p_currency,'')) <> 'CNY'
    or coalesce(p_response_hash,'') !~ '^[a-f0-9]{64}$'
  then raise exception 'invalid_reconciliation_result'; end if;

  select o.id,o.user_id,o.item_type,o.item_id,o.amount,o.currency,o.status,o.payment_expires_at
    into v_order from public.service_orders o where o.order_no=p_order_no for update;
  if not found then raise exception 'order_not_found'; end if;

  select t.id,t.amount,t.currency,t.status into v_tx
    from private.payment_transactions t
   where t.order_id=v_order.id and t.provider=p_provider
   order by t.created_at desc limit 1 for update;
  if not found then raise exception 'provider_transaction_not_found'; end if;

  if v_order.currency <> 'CNY' or v_tx.currency <> 'CNY'
     or v_order.amount <> p_amount or v_tx.amount <> p_amount then
    v_outcome := 'mismatch';
  elsif p_provider_state in ('SUCCESS','TRADE_SUCCESS') then
    if nullif(p_provider_trade_no,'') is null then raise exception 'provider_trade_number_required'; end if;
    v_payload_hash := encode(sha256(convert_to(
      p_provider||'|'||p_provider_trade_no||'|'||p_order_no||'|'||p_amount::text||'|CNY|SUCCESS','UTF8'
    )),'hex');
    v_event_id := 'reconcile:'||p_provider||':'||p_provider_trade_no;
    v_settlement := private.process_cn_payment_success(
      p_provider,v_event_id,
      case when p_provider='alipay' then 'TRADE_SUCCESS' else 'TRANSACTION.SUCCESS' end,
      p_provider_trade_no,p_order_no,p_amount,'CNY',v_payload_hash
    );
    v_outcome := case when coalesce((v_settlement->>'ok')::boolean,false) then 'settled' else 'ignored' end;
  elsif p_provider_state in ('CLOSED','TRADE_CLOSED','PAYERROR','REVOKED') then
    if v_order.status='pending' and v_tx.status in ('created','pending') then
      update private.payment_transactions set status='failed'
       where id=v_tx.id and status in ('created','pending');
      update public.service_orders set status='failed',payment_closed_at=now(),updated_at=now()
       where id=v_order.id and status='pending';
      v_outcome := 'closed';
    else
      v_outcome := 'ignored';
    end if;
  else
    v_outcome := 'pending';
  end if;

  insert into private.cn_payment_reconciliation_checks(
    provider,order_id,provider_state,provider_trade_no,amount,currency,response_hash,outcome
  ) values (p_provider,v_order.id,p_provider_state,nullif(p_provider_trade_no,''),p_amount,'CNY',p_response_hash,v_outcome);

  return jsonb_build_object('ok',true,'outcome',v_outcome,'order_id',v_order.id,'provider_state',p_provider_state);
end;
$function$;
revoke all on function public.attach_cn_payment_session(uuid,text,text,text) from public,anon,authenticated,service_role;
grant execute on function public.attach_cn_payment_session(uuid,text,text,text) to service_role;
revoke all on function public.create_cn_payment_order(text,uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function public.create_cn_payment_order(text,uuid,text,text) to authenticated,service_role;
revoke all on function public.get_my_cn_payment_order(text) from public,anon,authenticated,service_role;
grant execute on function public.get_my_cn_payment_order(text) to authenticated,service_role;
revoke all on function public.process_cn_payment_success(text,text,text,text,text,numeric,text,text) from public,anon,authenticated,service_role;
grant execute on function public.process_cn_payment_success(text,text,text,text,text,numeric,text,text) to service_role;
revoke all on function public.record_cn_payment_reconciliation(text,text,text,text,numeric,text,text) from public,anon,authenticated,service_role;
grant execute on function public.record_cn_payment_reconciliation(text,text,text,text,numeric,text,text) to service_role;
commit;
