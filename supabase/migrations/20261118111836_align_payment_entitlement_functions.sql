begin;
CREATE OR REPLACE FUNCTION private.process_cn_payment_success(p_provider text, p_event_id text, p_event_type text, p_provider_trade_no text, p_order_no text, p_amount numeric, p_currency text, p_payload_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_order record; v_tx record; v_duration integer; v_event_id uuid; v_existing_hash text;
begin
  if (select auth.jwt()->>'role') is distinct from 'service_role' then raise exception 'service_role_required'; end if;
  if p_provider not in ('alipay','wechat_pay')
     or (p_provider='alipay' and p_event_type <> 'TRADE_SUCCESS')
     or (p_provider='wechat_pay' and p_event_type <> 'TRANSACTION.SUCCESS')
     or nullif(p_event_id,'') is null or nullif(p_event_type,'') is null
     or nullif(p_provider_trade_no,'') is null or nullif(p_order_no,'') is null
     or p_amount is null or p_amount <= 0 or upper(coalesce(p_currency,'')) <> 'CNY'
     or coalesce(p_payload_hash,'') !~ '^[a-f0-9]{64}$' then raise exception 'invalid_verified_payment_event'; end if;

  select o.id,o.user_id,o.item_type,o.item_id,o.amount,o.currency,o.status into v_order
    from public.service_orders o where o.order_no=p_order_no for update;
  if not found then raise exception 'order_not_found'; end if;

  insert into private.payment_webhook_events(provider,event_id,event_type,payload_hash,order_id,processing_status)
  values(p_provider,p_event_id,p_event_type,p_payload_hash,v_order.id,'received')
  on conflict(provider,event_id) do nothing returning id into v_event_id;
  if v_event_id is null then
    select e.payload_hash into v_existing_hash from private.payment_webhook_events e
     where e.provider=p_provider and e.event_id=p_event_id;
    if v_existing_hash is distinct from p_payload_hash then raise exception 'duplicate_event_payload_mismatch'; end if;
    return pg_catalog.jsonb_build_object('ok',true,'duplicate',true,'order_id',v_order.id);
  end if;

  if v_order.currency <> 'CNY' or v_order.amount <> p_amount then raise exception 'payment_amount_or_currency_mismatch'; end if;
  if v_order.status <> 'pending' then
    update private.payment_webhook_events set processing_status='ignored',failure_code='order_not_pending',processed_at=now() where id=v_event_id;
    return pg_catalog.jsonb_build_object('ok',false,'ignored',true,'reason','order_not_pending'); end if;
  select t.id,t.status,t.amount,t.currency,t.metadata into v_tx from private.payment_transactions t
    where t.order_id=v_order.id and t.provider=p_provider order by t.created_at desc limit 1 for update;
  if not found then raise exception 'provider_transaction_not_found'; end if;
  if v_tx.amount <> p_amount or v_tx.currency <> 'CNY' or v_tx.status not in ('created','pending') then raise exception 'provider_transaction_mismatch'; end if;
  v_duration := nullif(v_tx.metadata->>'duration_days','')::integer;
  if v_duration is null or v_duration <= 0 then raise exception 'invalid_entitlement_duration'; end if;
  update private.payment_transactions set status='succeeded',provider_reference=p_provider_trade_no,verified_at=now() where id=v_tx.id;
  update public.service_orders set status='paid',updated_at=now() where id=v_order.id and status='pending';
  if v_order.item_type='membership' then
    insert into public.membership_subscriptions(user_id,plan_id,source_order_id,status,starts_at,ends_at)
    values(v_order.user_id,v_order.item_id,v_order.id,'active',now(),now()+make_interval(days=>v_duration)) on conflict(source_order_id) do nothing;
  elsif v_order.item_type='vpn' then
    insert into public.vpn_subscriptions(user_id,plan_id,source_order_id,status,starts_at,ends_at,provider_reference)
    values(v_order.user_id,v_order.item_id,v_order.id,'active',now(),now()+make_interval(days=>v_duration),p_provider||':'||p_provider_trade_no) on conflict(source_order_id) do nothing;
  else raise exception 'unsupported_order_item_type'; end if;
  update private.payment_webhook_events set processing_status='processed',processed_at=now() where id=v_event_id;
  return pg_catalog.jsonb_build_object('ok',true,'duplicate',false,'order_id',v_order.id,'status','paid');
end;
$function$;

CREATE OR REPLACE FUNCTION private.process_stripe_subscription_event(p_event_id text, p_event_type text, p_subscription_id text, p_event_created_at bigint, p_status text, p_period_end timestamp with time zone, p_cancel_at_period_end boolean, p_canceled_at timestamp with time zone, p_invoice_id text, p_payment_intent_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_sub private.provider_subscriptions%rowtype; v_entitlement_status text; v_order_id uuid;
begin
 if coalesce(p_event_id,'') !~ '^evt_[A-Za-z0-9]+$' or coalesce(p_subscription_id,'') !~ '^sub_[A-Za-z0-9]+$' or p_event_type not in ('invoice.paid','invoice.payment_failed','customer.subscription.updated','customer.subscription.deleted') or p_event_created_at is null then raise exception 'invalid_subscription_event'; end if;
 if p_payment_intent_id is not null and p_payment_intent_id !~ '^pi_[A-Za-z0-9]+$' then raise exception 'invalid_payment_intent_id'; end if;
 select * into v_sub from private.provider_subscriptions where provider='stripe' and provider_subscription_id=p_subscription_id for update;
 if not found then insert into private.provider_subscription_events(provider,event_id,event_type,provider_subscription_id,outcome) values('stripe',p_event_id,p_event_type,p_subscription_id,'unmapped') on conflict do nothing; return jsonb_build_object('ok',false,'reason','subscription_not_mapped'); end if;
 if exists(select 1 from private.provider_subscription_events where provider='stripe' and event_id=p_event_id and outcome<>'unmapped') then return jsonb_build_object('ok',true,'duplicate',true); end if;
 if v_sub.last_event_created_at is not null and p_event_created_at<v_sub.last_event_created_at then insert into private.provider_subscription_events(provider,event_id,event_type,provider_subscription_id,outcome) values('stripe',p_event_id,p_event_type,p_subscription_id,'stale') on conflict(provider,event_id) do update set outcome='stale'; return jsonb_build_object('ok',true,'stale',true); end if;
 if p_event_type='invoice.paid' then
  update private.provider_subscriptions set status='active',current_period_end=coalesce(p_period_end,current_period_end),last_invoice_id=coalesce(p_invoice_id,last_invoice_id),last_event_created_at=p_event_created_at,updated_at=now() where id=v_sub.id;
  v_entitlement_status:='active';
  if p_payment_intent_id is not null and coalesce(v_sub.metadata->>'source_order_id','') ~ '^[0-9a-fA-F-]{36}$' then
   v_order_id:=(v_sub.metadata->>'source_order_id')::uuid;
   update private.payment_transactions set stripe_payment_intent_id=p_payment_intent_id
    where order_id=v_order_id and provider='card_psp' and status='succeeded'
      and (stripe_payment_intent_id is null or stripe_payment_intent_id=p_payment_intent_id);
  end if;
 elsif p_event_type='invoice.payment_failed' then update private.provider_subscriptions set status='past_due',last_invoice_id=coalesce(p_invoice_id,last_invoice_id),last_event_created_at=p_event_created_at,updated_at=now() where id=v_sub.id; v_entitlement_status:=null;
 elsif p_event_type='customer.subscription.updated' then update private.provider_subscriptions set status=case when p_status in ('active','trialing','past_due','unpaid','canceled','incomplete') then p_status else status end,current_period_end=coalesce(p_period_end,current_period_end),cancel_at_period_end=coalesce(p_cancel_at_period_end,cancel_at_period_end),canceled_at=coalesce(p_canceled_at,canceled_at),last_event_created_at=p_event_created_at,updated_at=now() where id=v_sub.id; v_entitlement_status:=case when coalesce(p_status,v_sub.status) in ('active','trialing','past_due','canceled','unpaid') and coalesce(p_period_end,v_sub.current_period_end)>now() then 'active' when coalesce(p_status,v_sub.status) in ('active','trialing','past_due') then 'active' else null end;
 elsif p_event_type='customer.subscription.deleted' then update private.provider_subscriptions set status='canceled',cancel_at_period_end=false,canceled_at=coalesce(p_canceled_at,now()),current_period_end=coalesce(p_period_end,current_period_end),last_event_created_at=p_event_created_at,updated_at=now() where id=v_sub.id; v_entitlement_status:=case when coalesce(p_period_end,v_sub.current_period_end)>now() then 'active' else 'expired' end;
 end if;
 if v_entitlement_status is not null then if v_sub.item_type='membership' then update public.membership_subscriptions set status=v_entitlement_status,ends_at=coalesce(p_period_end,ends_at),updated_at=now() where id=v_sub.entitlement_id; else update public.vpn_subscriptions set status=v_entitlement_status,ends_at=coalesce(p_period_end,ends_at) where id=v_sub.entitlement_id; end if; end if;
 insert into private.provider_subscription_events(provider,event_id,event_type,provider_subscription_id,outcome) values('stripe',p_event_id,p_event_type,p_subscription_id,'processed') on conflict(provider,event_id) do update set outcome='processed',provider_subscription_id=excluded.provider_subscription_id;
 return jsonb_build_object('ok',true,'status',v_entitlement_status);
end; $function$;

CREATE OR REPLACE FUNCTION private.process_stripe_subscription_event(p_event_id text, p_event_type text, p_subscription_id text, p_event_created_at bigint, p_status text DEFAULT NULL::text, p_period_end timestamp with time zone DEFAULT NULL::timestamp with time zone, p_cancel_at_period_end boolean DEFAULT NULL::boolean, p_canceled_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_invoice_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_sub private.provider_subscriptions%rowtype; v_entitlement_status text;
begin
 if coalesce(p_event_id,'') !~ '^evt_[A-Za-z0-9]+$' or coalesce(p_subscription_id,'') !~ '^sub_[A-Za-z0-9]+$' or p_event_type not in ('invoice.paid','invoice.payment_failed','customer.subscription.updated','customer.subscription.deleted') or p_event_created_at is null then raise exception 'invalid_subscription_event'; end if;
 select * into v_sub from private.provider_subscriptions where provider='stripe' and provider_subscription_id=p_subscription_id for update;
 if not found then insert into private.provider_subscription_events(provider,event_id,event_type,provider_subscription_id,outcome) values('stripe',p_event_id,p_event_type,p_subscription_id,'unmapped') on conflict do nothing; return jsonb_build_object('ok',false,'reason','subscription_not_mapped'); end if;
 if exists(select 1 from private.provider_subscription_events where provider='stripe' and event_id=p_event_id and outcome<>'unmapped') then return jsonb_build_object('ok',true,'duplicate',true); end if;
 if v_sub.last_event_created_at is not null and p_event_created_at < v_sub.last_event_created_at then insert into private.provider_subscription_events(provider,event_id,event_type,provider_subscription_id,outcome) values('stripe',p_event_id,p_event_type,p_subscription_id,'stale') on conflict(provider,event_id) do update set outcome='stale'; return jsonb_build_object('ok',true,'stale',true); end if;
 if p_event_type='invoice.paid' then update private.provider_subscriptions set status='active',current_period_end=coalesce(p_period_end,current_period_end),last_invoice_id=coalesce(p_invoice_id,last_invoice_id),last_event_created_at=p_event_created_at,updated_at=now() where id=v_sub.id; v_entitlement_status:='active';
 elsif p_event_type='invoice.payment_failed' then update private.provider_subscriptions set status='past_due',last_invoice_id=coalesce(p_invoice_id,last_invoice_id),last_event_created_at=p_event_created_at,updated_at=now() where id=v_sub.id; v_entitlement_status:=null;
 elsif p_event_type='customer.subscription.updated' then update private.provider_subscriptions set status=case when p_status in ('active','trialing','past_due','unpaid','canceled','incomplete') then p_status else status end,current_period_end=coalesce(p_period_end,current_period_end),cancel_at_period_end=coalesce(p_cancel_at_period_end,cancel_at_period_end),canceled_at=coalesce(p_canceled_at,canceled_at),last_event_created_at=p_event_created_at,updated_at=now() where id=v_sub.id; v_entitlement_status:=case when coalesce(p_status,v_sub.status) in ('active','trialing','past_due','canceled','unpaid') and coalesce(p_period_end,v_sub.current_period_end)>now() then 'active' when coalesce(p_status,v_sub.status) in ('active','trialing','past_due') then 'active' else null end;
 elsif p_event_type='customer.subscription.deleted' then update private.provider_subscriptions set status='canceled',cancel_at_period_end=false,canceled_at=coalesce(p_canceled_at,now()),current_period_end=coalesce(p_period_end,current_period_end),last_event_created_at=p_event_created_at,updated_at=now() where id=v_sub.id; v_entitlement_status:=case when coalesce(p_period_end,v_sub.current_period_end)>now() then 'active' else 'expired' end; end if;
 if v_entitlement_status is not null then if v_sub.item_type='membership' then update public.membership_subscriptions set status=v_entitlement_status,ends_at=coalesce(p_period_end,ends_at),updated_at=now() where id=v_sub.entitlement_id; else update public.vpn_subscriptions set status=v_entitlement_status,ends_at=coalesce(p_period_end,ends_at) where id=v_sub.entitlement_id; end if; end if;
 insert into private.provider_subscription_events(provider,event_id,event_type,provider_subscription_id,outcome) values('stripe',p_event_id,p_event_type,p_subscription_id,'processed') on conflict(provider,event_id) do update set outcome='processed',provider_subscription_id=excluded.provider_subscription_id;
 return jsonb_build_object('ok',true,'status',v_entitlement_status);
end; $function$;

CREATE OR REPLACE FUNCTION private.set_cn_payment_expiry()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.currency='CNY' and new.status='pending' and new.payment_expires_at is null then
    new.payment_expires_at := now()+interval '30 minutes';
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.sync_payment_entitlements()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_order public.service_orders%rowtype;
begin
  if new.refunded_amount is distinct from old.refunded_amount
     or new.status is distinct from old.status then
    select * into v_order
      from public.service_orders
      where id=new.order_id
      for update;

    if found then
      if new.refunded_amount >= new.amount and new.amount > 0 then
        update public.service_orders
          set status='refunded',updated_at=now()
          where id=new.order_id and status in ('paid','partially_refunded');

        update public.membership_subscriptions
          set status='cancelled',updated_at=now()
          where source_order_id=new.order_id and status in ('active','pending');

        update public.vpn_subscriptions
          set status='cancelled'
          where source_order_id=new.order_id and status in ('active','pending');
      elsif new.refunded_amount > 0 then
        update public.service_orders
          set status='partially_refunded',updated_at=now()
          where id=new.order_id and status='paid';
      end if;
    end if;
  end if;

  if new.disputed_amount is distinct from old.disputed_amount
     and new.disputed_amount > 0 then
    update public.membership_subscriptions
      set status='suspended',updated_at=now()
      where source_order_id=new.order_id and status='active';

    update public.vpn_subscriptions
      set status='suspended'
      where source_order_id=new.order_id and status='active';
  end if;

  return new;
end;
$function$;
revoke all on function private.process_cn_payment_success(text,text,text,text,text,numeric,text,text) from public,anon,authenticated,service_role;
revoke all on function private.process_stripe_subscription_event(text,text,text,bigint,text,timestamp with time zone,boolean,timestamp with time zone,text,text) from public,anon,authenticated,service_role;
revoke all on function private.process_stripe_subscription_event(text,text,text,bigint,text,timestamp with time zone,boolean,timestamp with time zone,text) from public,anon,authenticated,service_role;
revoke all on function private.set_cn_payment_expiry() from public,anon,authenticated,service_role;
revoke all on function private.sync_payment_entitlements() from public,anon,authenticated,service_role;
grant execute on function private.process_cn_payment_success(text,text,text,text,text,numeric,text,text) to service_role;
grant execute on function private.process_stripe_subscription_event(text,text,text,bigint,text,timestamp with time zone,boolean,timestamp with time zone,text,text) to service_role;
grant execute on function private.process_stripe_subscription_event(text,text,text,bigint,text,timestamp with time zone,boolean,timestamp with time zone,text) to service_role;

drop trigger if exists payment_transactions_sync_entitlements on private.payment_transactions;
create trigger payment_transactions_sync_entitlements after update of refunded_amount,disputed_amount,status on private.payment_transactions for each row execute function private.sync_payment_entitlements();
drop trigger if exists set_cn_payment_expiry_before_insert on public.service_orders;
create trigger set_cn_payment_expiry_before_insert before insert on public.service_orders for each row execute function private.set_cn_payment_expiry();
commit;