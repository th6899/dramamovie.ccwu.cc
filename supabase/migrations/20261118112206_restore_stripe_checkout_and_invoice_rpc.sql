begin;
CREATE OR REPLACE FUNCTION public.create_stripe_subscription_order(p_item_type text, p_item_id uuid, p_currency text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_amount numeric;
  v_currency text;
  v_title text;
  v_duration integer;
  v_devices integer;
  v_price text;
  v_interval text;
  v_order_id uuid;
  v_order_no text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING errcode = '42501';
  END IF;

  IF p_currency IS DISTINCT FROM 'USD' THEN
    RAISE EXCEPTION 'stripe_usd_only';
  END IF;

  IF p_item_type = 'membership' THEN
    SELECT price_amount, upper(currency), name, duration_days,
           NULL::integer, stripe_price_id, billing_interval
      INTO v_amount, v_currency, v_title, v_duration, v_devices, v_price, v_interval
      FROM public.membership_plans
     WHERE id = p_item_id AND is_active = true
     FOR SHARE;
  ELSIF p_item_type = 'vpn' THEN
    SELECT price_amount, upper(currency), name, duration_days,
           device_limit, stripe_price_id, billing_interval
      INTO v_amount, v_currency, v_title, v_duration, v_devices, v_price, v_interval
      FROM public.vpn_plans
     WHERE id = p_item_id AND is_active = true
     FOR SHARE;
  ELSE
    RAISE EXCEPTION 'unsupported_item_type';
  END IF;

  IF v_title IS NULL OR v_amount IS NULL OR v_amount <= 0
     OR v_duration IS NULL OR v_duration <= 0 THEN
    RAISE EXCEPTION 'plan_not_payable';
  END IF;

  IF v_currency IS DISTINCT FROM 'USD' THEN
    RAISE EXCEPTION 'plan_currency_mismatch';
  END IF;

  IF coalesce(v_price, '') !~ '^price_[A-Za-z0-9]+$' THEN
    RAISE EXCEPTION 'stripe_recurring_price_not_configured';
  END IF;

  v_order_no := 'CCWU-' || upper(substr(replace(pg_catalog.gen_random_uuid()::text, '-', ''), 1, 14));

  INSERT INTO public.service_orders(user_id, order_no, item_type, item_id, amount, currency, status)
  VALUES (v_user, v_order_no, p_item_type, p_item_id, v_amount, 'USD', 'pending')
  RETURNING id INTO v_order_id;

  INSERT INTO private.payment_transactions(order_id, provider, amount, currency, status, metadata)
  VALUES (
    v_order_id, 'card_psp', v_amount, 'USD', 'created',
    pg_catalog.jsonb_build_object(
      'plan_name', v_title,
      'duration_days', v_duration,
      'device_limit', v_devices,
      'stripe_price_id', v_price,
      'billing_interval', v_interval,
      'billing_mode', 'subscription'
    )
  );

  RETURN pg_catalog.jsonb_build_object(
    'order_id', v_order_id,
    'order_no', v_order_no,
    'title', v_title,
    'amount', v_amount,
    'currency', 'USD',
    'item_type', p_item_type,
    'item_id', p_item_id,
    'stripe_price_id', v_price,
    'billing_interval', v_interval
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.map_stripe_subscription_after_checkout(p_order_id uuid, p_session_id text, p_subscription_id text, p_customer_id text, p_period_end timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_order public.service_orders%rowtype; v_entitlement_id uuid; v_count integer;
begin
 if p_order_id is null or coalesce(p_session_id,'') !~ '^cs_test_[A-Za-z0-9]+$' or coalesce(p_subscription_id,'') !~ '^sub_[A-Za-z0-9]+$' then raise exception 'invalid_subscription_mapping_payload'; end if;
 select * into v_order from public.service_orders where id=p_order_id for update;
 if not found or v_order.status<>'paid' then raise exception 'paid_order_required'; end if;
 if not exists(select 1 from private.payment_transactions where order_id=p_order_id and provider='card_psp' and provider_reference=p_session_id and status='succeeded') then raise exception 'checkout_session_not_verified'; end if;
 if v_order.item_type='membership' then
  select id into v_entitlement_id from public.membership_subscriptions where source_order_id=p_order_id and user_id=v_order.user_id;
 elsif v_order.item_type='vpn' then
  select id into v_entitlement_id from public.vpn_subscriptions where source_order_id=p_order_id and user_id=v_order.user_id;
 else raise exception 'unsupported_subscription_item'; end if;
 if v_entitlement_id is null then raise exception 'fulfilled_entitlement_not_found'; end if;
 insert into private.provider_subscriptions(provider,provider_subscription_id,user_id,item_type,entitlement_id,status,current_period_end,metadata)
 values('stripe',p_subscription_id,v_order.user_id,v_order.item_type,v_entitlement_id,'active',p_period_end,jsonb_build_object('stripe_customer_id',p_customer_id,'source_order_id',p_order_id,'checkout_session_id',p_session_id))
 on conflict(provider,provider_subscription_id) do update set current_period_end=coalesce(excluded.current_period_end,private.provider_subscriptions.current_period_end),metadata=private.provider_subscriptions.metadata||excluded.metadata,updated_at=now()
 returning 1 into v_count;
 return jsonb_build_object('ok',true,'mapped',true,'item_type',v_order.item_type,'entitlement_id',v_entitlement_id);
end; $function$;

CREATE OR REPLACE FUNCTION public.mark_stripe_checkout_created(p_order_id uuid, p_session_id text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_count integer;
begin
  if p_session_id is null or p_session_id !~ '^cs_test_' then raise exception 'invalid_stripe_session'; end if;
  update private.payment_transactions
    set provider_reference = p_session_id, status = case when status = 'created' then 'pending' else status end
    where order_id = p_order_id and provider = 'card_psp' and status in ('created','pending','succeeded')
      and (provider_reference is null or provider_reference = p_session_id);
  get diagnostics v_count = row_count;
  if v_count <> 1 then return false; end if;
  update public.service_orders set status = 'pending', updated_at = now() where id = p_order_id and status = 'pending';
  return true;
end;
$function$;

CREATE OR REPLACE FUNCTION public.mark_stripe_checkout_failed(p_order_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_count integer;
begin
  update private.payment_transactions set status = 'failed'
    where order_id = p_order_id and provider = 'card_psp' and status in ('created','pending');
  get diagnostics v_count = row_count;
  update public.service_orders set status = 'failed', updated_at = now() where id = p_order_id and status = 'pending';
  return v_count = 1;
end;
$function$;

CREATE OR REPLACE FUNCTION public.process_stripe_checkout_event(p_event_id text, p_event_type text, p_order_id uuid, p_session_id text, p_payment_status text, p_amount numeric, p_currency text, p_payment_intent_id text, p_is_subscription boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_result jsonb; v_tx_id uuid; v_existing_pi text;
begin
 if p_payment_intent_id is not null and p_payment_intent_id !~ '^pi_[A-Za-z0-9]+$' then raise exception 'invalid_payment_intent_id'; end if;
 v_result:=public.process_stripe_checkout_event(p_event_id,p_event_type,p_order_id,p_session_id,p_payment_status,p_amount,p_currency);
 if coalesce((v_result->>'ok')::boolean,false) and (v_result->>'status'='paid' or coalesce((v_result->>'duplicate_payment')::boolean,false) or coalesce((v_result->>'duplicate')::boolean,false)) then
  if p_payment_intent_id is null and not p_is_subscription then raise exception 'missing_payment_intent_id'; end if;
  if p_payment_intent_id is not null then
   select t.id,t.stripe_payment_intent_id into v_tx_id,v_existing_pi from private.payment_transactions t where t.order_id=p_order_id and t.provider='card_psp' and t.provider_reference=p_session_id and t.status='succeeded' for update;
   if not found then raise exception 'payment_transaction_not_found_after_checkout'; end if;
   if v_existing_pi is not null and v_existing_pi<>p_payment_intent_id then raise exception 'payment_intent_mismatch'; end if;
   update private.payment_transactions set stripe_payment_intent_id=p_payment_intent_id where id=v_tx_id and (stripe_payment_intent_id is null or stripe_payment_intent_id=p_payment_intent_id);
  end if;
 end if;
 return v_result;
end; $function$;

CREATE OR REPLACE FUNCTION public.process_stripe_checkout_event(p_event_id text, p_event_type text, p_order_id uuid, p_session_id text, p_payment_status text, p_amount numeric, p_currency text, p_payment_intent_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_result jsonb;
  v_tx_id uuid;
  v_existing_pi text;
begin
  if p_payment_intent_id is not null and p_payment_intent_id !~ '^pi_[A-Za-z0-9]+$' then
    raise exception 'invalid_payment_intent_id';
  end if;

  v_result := public.process_stripe_checkout_event(
    p_event_id, p_event_type, p_order_id, p_session_id,
    p_payment_status, p_amount, p_currency
  );

  if coalesce((v_result->>'ok')::boolean, false)
     and (v_result->>'status' = 'paid'
       or coalesce((v_result->>'duplicate_payment')::boolean, false)
       or coalesce((v_result->>'duplicate')::boolean, false)) then
    if p_payment_intent_id is null then
      raise exception 'missing_payment_intent_id';
    end if;

    select t.id, t.stripe_payment_intent_id
      into v_tx_id, v_existing_pi
    from private.payment_transactions t
    where t.order_id = p_order_id
      and t.provider = 'card_psp'
      and t.provider_reference = p_session_id
      and t.status = 'succeeded'
    for update;

    if not found then
      raise exception 'payment_transaction_not_found_after_checkout';
    end if;

    if v_existing_pi is not null and v_existing_pi <> p_payment_intent_id then
      raise exception 'payment_intent_mismatch';
    end if;

    update private.payment_transactions
      set stripe_payment_intent_id = p_payment_intent_id
      where id = v_tx_id
        and (stripe_payment_intent_id is null or stripe_payment_intent_id = p_payment_intent_id);
  end if;

  return v_result;
end;
$function$;

CREATE OR REPLACE FUNCTION public.process_stripe_checkout_event(p_event_id text, p_event_type text, p_order_id uuid, p_session_id text, p_payment_status text, p_amount numeric, p_currency text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_inserted integer; v_tx record; v_duration integer; v_device_limit integer;
begin
  if p_event_id is null or p_event_id = '' or p_order_id is null then raise exception 'invalid_event_payload'; end if;
  if p_event_type not in ('checkout.session.completed','checkout.session.async_payment_succeeded',
    'checkout.session.async_payment_failed','checkout.session.expired') then raise exception 'unsupported_event_type'; end if;
  insert into private.stripe_webhook_events(event_id,event_type,order_id) values (p_event_id,p_event_type,p_order_id)
    on conflict (event_id) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then return pg_catalog.jsonb_build_object('ok',true,'duplicate',true); end if;
  select t.id as transaction_id,t.status as transaction_status,t.amount as expected_amount,
    t.currency as expected_currency,t.provider_reference,t.metadata,
    o.id as order_id,o.user_id,o.item_type,o.item_id,o.status as order_status
    into v_tx from private.payment_transactions t join public.service_orders o on o.id=t.order_id
    where t.order_id=p_order_id and t.provider='card_psp' for update of t,o;
  if not found then raise exception 'payment_transaction_not_found'; end if;
  if p_session_id is null or p_session_id !~ '^cs_test_' then raise exception 'invalid_checkout_session'; end if;
  if v_tx.provider_reference is not null and v_tx.provider_reference <> p_session_id then raise exception 'checkout_session_mismatch'; end if;
  if p_event_type in ('checkout.session.expired','checkout.session.async_payment_failed') then
    update private.payment_transactions set provider_reference=p_session_id,status='failed'
      where id=v_tx.transaction_id and status in ('created','pending');
    update public.service_orders set status=case when p_event_type='checkout.session.expired' then 'cancelled' else 'failed' end,
      updated_at=now() where id=p_order_id and status='pending';
    update private.stripe_webhook_events set outcome='failed_or_expired',processed_at=now() where event_id=p_event_id;
    return pg_catalog.jsonb_build_object('ok',true,'status','failed');
  end if;
  if coalesce(p_payment_status,'unpaid') <> 'paid' then
    update private.stripe_webhook_events set outcome='awaiting_payment',processed_at=now() where event_id=p_event_id;
    return pg_catalog.jsonb_build_object('ok',true,'status','pending');
  end if;
  if p_amount is null or p_amount <> v_tx.expected_amount or lower(coalesce(p_currency,'')) <> lower(v_tx.expected_currency) then
    update private.stripe_webhook_events set outcome='amount_or_currency_mismatch',processed_at=now() where event_id=p_event_id;
    return pg_catalog.jsonb_build_object('ok',false,'error','amount_or_currency_mismatch');
  end if;
  if v_tx.transaction_status='succeeded' or v_tx.order_status='paid' then
    update private.stripe_webhook_events set outcome='already_paid',processed_at=now() where event_id=p_event_id;
    return pg_catalog.jsonb_build_object('ok',true,'duplicate_payment',true);
  end if;
  if v_tx.order_status <> 'pending' or v_tx.transaction_status not in ('created','pending') then
    update private.stripe_webhook_events set outcome='order_not_payable',processed_at=now() where event_id=p_event_id;
    return pg_catalog.jsonb_build_object('ok',false,'error','order_not_payable');
  end if;
  update private.payment_transactions set provider_reference=p_session_id,status='succeeded',verified_at=now()
    where id=v_tx.transaction_id;
  update public.service_orders set status='paid',updated_at=now() where id=p_order_id and status='pending';
  v_duration := nullif(v_tx.metadata->>'duration_days','')::integer;
  v_device_limit := nullif(v_tx.metadata->>'device_limit','')::integer;
  if v_tx.item_type='membership' then
    insert into public.membership_subscriptions(user_id,plan_id,source_order_id,status,starts_at,ends_at)
      values (v_tx.user_id,v_tx.item_id,p_order_id,'active',now(),now()+make_interval(days=>v_duration))
      on conflict (source_order_id) do nothing;
  elsif v_tx.item_type='vpn' then
    insert into public.vpn_subscriptions(user_id,plan_id,source_order_id,status,starts_at,ends_at,provider_reference)
      values (v_tx.user_id,v_tx.item_id,p_order_id,'active',now(),now()+make_interval(days=>v_duration),'stripe:'||p_session_id)
      on conflict (source_order_id) do nothing;
  else raise exception 'unsupported_order_item_type';
  end if;
  update private.stripe_webhook_events set outcome='paid_and_fulfilled',processed_at=now() where event_id=p_event_id;
  return pg_catalog.jsonb_build_object('ok',true,'status','paid','order_id',p_order_id);
end;
$function$;

CREATE OR REPLACE FUNCTION public.process_stripe_refund_dispute_event(p_event_id text, p_event_type text, p_object_id text, p_payment_intent_id text, p_amount numeric, p_currency text, p_provider_status text, p_reason text DEFAULT NULL::text, p_evidence_due_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_tx record;
  v_refund_status text;
  v_dispute_status text;
  v_refunded numeric;
  v_disputed numeric;
  v_order_id uuid;
begin
  if p_event_id is null or length(trim(p_event_id)) = 0
     or p_object_id is null or length(trim(p_object_id)) = 0
     or p_payment_intent_id is null or p_payment_intent_id !~ '^pi_[A-Za-z0-9]+$'
     or p_amount is null or p_amount <= 0
     or p_currency is null or p_currency !~ '^[A-Z]{3}$' then
    raise exception 'invalid_provider_event_payload';
  end if;

  if p_event_type not in ('refund.updated','refund.created',
       'charge.dispute.created','charge.dispute.updated','charge.dispute.closed') then
    raise exception 'unsupported_provider_event_type';
  end if;

  select t.id,t.order_id,t.amount,t.currency,t.status,t.stripe_payment_intent_id
    into v_tx
  from private.payment_transactions t
  where t.provider='card_psp'
    and t.stripe_payment_intent_id=p_payment_intent_id
  for update;

  if not found then
    raise exception 'payment_intent_transaction_not_found';
  end if;
  v_order_id := v_tx.order_id;

  if upper(v_tx.currency) <> p_currency or p_amount > v_tx.amount then
    raise exception 'provider_amount_or_currency_mismatch';
  end if;
  if v_tx.status not in ('succeeded','refunded') then
    raise exception 'payment_transaction_not_captured';
  end if;

  insert into private.stripe_webhook_events(event_id,event_type,order_id)
  values(p_event_id,p_event_type,v_order_id)
  on conflict(event_id) do nothing;
  if not found then
    return pg_catalog.jsonb_build_object('ok',true,'duplicate_event',true);
  end if;

  if p_event_type in ('refund.updated','refund.created') then
    v_refund_status := case lower(coalesce(p_provider_status,''))
      when 'succeeded' then 'succeeded'
      when 'failed' then 'failed'
      when 'canceled' then 'cancelled'
      when 'cancelled' then 'cancelled'
      else 'pending'
    end;

    if exists(select 1 from private.payment_refunds r
      where r.provider='stripe' and r.provider_refund_id=p_object_id
        and r.transaction_id<>v_tx.id) then
      raise exception 'refund_id_transaction_mismatch';
    end if;

    update private.payment_refunds
      set status=v_refund_status,amount=p_amount,currency=p_currency,
          reason=coalesce(p_reason,reason),
          provider_event_id=p_event_id,
          completed_at=case when v_refund_status in ('succeeded','failed','cancelled') then now() else null end,
          failure_code=case when v_refund_status='failed' then p_reason else null end
      where provider='stripe' and provider_refund_id=p_object_id
        and transaction_id=v_tx.id;

    if not found then
      insert into private.payment_refunds(
        order_id,transaction_id,provider,provider_refund_id,status,amount,currency,
        reason,provider_event_id,completed_at,failure_code
      ) values (
        v_tx.order_id,v_tx.id,'stripe',p_object_id,v_refund_status,p_amount,p_currency,
        p_reason,p_event_id,
        case when v_refund_status in ('succeeded','failed','cancelled') then now() else null end,
        case when v_refund_status='failed' then p_reason else null end
      );
    end if;

    select coalesce(sum(r.amount),0) into v_refunded
      from private.payment_refunds r
      where r.transaction_id=v_tx.id and r.provider='stripe' and r.status='succeeded';

    if v_refunded > v_tx.amount then
      raise exception 'cumulative_refund_exceeds_captured_amount';
    end if;

    update private.payment_transactions
      set refunded_amount=v_refunded,
          status=case when v_refunded=v_tx.amount then 'refunded' else 'succeeded' end
      where id=v_tx.id;

    update private.stripe_webhook_events
      set outcome='refund_'||v_refund_status,processed_at=now()
      where event_id=p_event_id;

    return pg_catalog.jsonb_build_object('ok',true,'kind','refund',
      'status',v_refund_status,'refunded_amount',v_refunded,'order_id',v_order_id);
  end if;

  v_dispute_status := case lower(coalesce(p_provider_status,''))
    when 'needs_response' then 'needs_response'
    when 'under_review' then 'under_review'
    when 'won' then 'won'
    when 'lost' then 'lost'
    when 'warning_needs_response' then 'needs_response'
    when 'warning_under_review' then 'under_review'
    when 'warning_closed' then 'warning_closed'
    when 'charge_refunded' then 'withdrawn'
    when 'prevented' then 'withdrawn'
    else null
  end;
  if v_dispute_status is null then
    raise exception 'unsupported_dispute_status';
  end if;

  if exists(select 1 from private.payment_disputes d
    where d.provider='stripe' and d.provider_dispute_id=p_object_id
      and d.transaction_id<>v_tx.id) then
    raise exception 'dispute_id_transaction_mismatch';
  end if;

  update private.payment_disputes
    set status=v_dispute_status,amount=p_amount,currency=p_currency,
        reason=coalesce(p_reason,reason),
        evidence_due_at=coalesce(p_evidence_due_at,evidence_due_at),
        provider_event_id=p_event_id,
        resolved_at=case when v_dispute_status in ('won','lost','warning_closed','withdrawn') then now() else null end
    where provider='stripe' and provider_dispute_id=p_object_id
      and transaction_id=v_tx.id;

  if not found then
    insert into private.payment_disputes(
      order_id,transaction_id,provider,provider_dispute_id,status,amount,currency,
      reason,evidence_due_at,provider_event_id,resolved_at
    ) values (
      v_tx.order_id,v_tx.id,'stripe',p_object_id,v_dispute_status,p_amount,p_currency,
      p_reason,p_evidence_due_at,p_event_id,
      case when v_dispute_status in ('won','lost','warning_closed','withdrawn') then now() else null end
    );
  end if;

  select coalesce(sum(d.amount),0) into v_disputed
    from private.payment_disputes d
    where d.transaction_id=v_tx.id and d.provider='stripe'
      and d.status in ('needs_response','under_review');

  update private.payment_transactions
    set disputed_amount=v_disputed
    where id=v_tx.id;

  update private.stripe_webhook_events
    set outcome='dispute_'||v_dispute_status,processed_at=now()
    where event_id=p_event_id;

  return pg_catalog.jsonb_build_object('ok',true,'kind','dispute',
    'status',v_dispute_status,'disputed_amount',v_disputed,'order_id',v_order_id);
end;
$function$;

CREATE OR REPLACE FUNCTION public.process_stripe_subscription_invoice_adjustment_event(p_event_id text, p_event_type text, p_object_id text, p_payment_intent_id text, p_amount numeric, p_currency text, p_provider_status text, p_reason text DEFAULT NULL::text, p_evidence_due_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_invoice record;
 v_status text;
 v_total numeric;
begin
 if p_event_id is null or p_event_id !~ '^evt_[A-Za-z0-9]+$'
  or p_event_type not in ('refund.created','refund.updated','charge.dispute.created','charge.dispute.updated','charge.dispute.closed')
  or p_object_id is null or length(trim(p_object_id))=0
  or p_payment_intent_id is null or p_payment_intent_id !~ '^pi_[A-Za-z0-9]+$'
  or p_amount is null or p_amount<=0 or p_currency is null or p_currency !~ '^[A-Z]{3}$'
 then raise exception 'invalid_invoice_adjustment_payload'; end if;

 select i.* into v_invoice from private.stripe_subscription_invoices i
 where i.provider='stripe' and i.payment_intent_id=p_payment_intent_id
 for update;
 if not found then return pg_catalog.jsonb_build_object('ok',false,'reason','invoice_not_found'); end if;
 if upper(v_invoice.currency)<>p_currency or p_amount>v_invoice.amount_paid then
   raise exception 'invoice_adjustment_amount_or_currency_mismatch';
 end if;

 insert into private.stripe_subscription_invoice_adjustment_events(provider,event_id,event_type,object_id,invoice_id)
 values('stripe',p_event_id,p_event_type,p_object_id,v_invoice.id)
 on conflict(provider,event_id) do nothing;
 if not found then return pg_catalog.jsonb_build_object('ok',true,'duplicate_event',true); end if;

 if p_event_type in ('refund.created','refund.updated') then
   v_status:=case lower(coalesce(p_provider_status,'')) when 'succeeded' then 'succeeded'
     when 'failed' then 'failed' when 'canceled' then 'cancelled' when 'cancelled' then 'cancelled' else 'pending' end;
   insert into private.stripe_subscription_invoice_refunds(invoice_id,provider_refund_id,status,amount,currency,reason,provider_event_id,completed_at,failure_code)
   values(v_invoice.id,p_object_id,v_status,p_amount,p_currency,p_reason,p_event_id,
     case when v_status in ('succeeded','failed','cancelled') then now() else null end,
     case when v_status='failed' then p_reason else null end)
   on conflict(provider,provider_refund_id) do update set
     status=excluded.status,amount=excluded.amount,currency=excluded.currency,
     reason=coalesce(excluded.reason,private.stripe_subscription_invoice_refunds.reason),
     provider_event_id=excluded.provider_event_id,completed_at=excluded.completed_at,
     failure_code=excluded.failure_code,updated_at=now()
   returning amount into v_total;
   select coalesce(sum(r.amount),0) into v_total from private.stripe_subscription_invoice_refunds r
    where r.invoice_id=v_invoice.id and r.status='succeeded';
   if v_total>v_invoice.amount_paid then raise exception 'invoice_refunds_exceed_paid_amount'; end if;
   return pg_catalog.jsonb_build_object('ok',true,'kind','invoice_refund','status',v_status,'refunded_amount',v_total,'invoice_id',v_invoice.provider_invoice_id);
 end if;

 v_status:=case lower(coalesce(p_provider_status,'')) when 'needs_response' then 'needs_response'
  when 'warning_needs_response' then 'needs_response' when 'under_review' then 'under_review'
  when 'warning_under_review' then 'under_review' when 'won' then 'won' when 'lost' then 'lost'
  when 'warning_closed' then 'warning_closed' when 'charge_refunded' then 'withdrawn'
  when 'prevented' then 'withdrawn' else null end;
 if v_status is null then raise exception 'unsupported_invoice_dispute_status'; end if;
 insert into private.stripe_subscription_invoice_disputes(invoice_id,provider_dispute_id,status,amount,currency,reason,evidence_due_at,provider_event_id,resolved_at)
 values(v_invoice.id,p_object_id,v_status,p_amount,p_currency,p_reason,p_evidence_due_at,p_event_id,
   case when v_status in ('won','lost','warning_closed','withdrawn') then now() else null end)
 on conflict(provider,provider_dispute_id) do update set
  status=excluded.status,amount=excluded.amount,currency=excluded.currency,
  reason=coalesce(excluded.reason,private.stripe_subscription_invoice_disputes.reason),
  evidence_due_at=coalesce(excluded.evidence_due_at,private.stripe_subscription_invoice_disputes.evidence_due_at),
  provider_event_id=excluded.provider_event_id,resolved_at=excluded.resolved_at,updated_at=now();
 select coalesce(sum(d.amount),0) into v_total from private.stripe_subscription_invoice_disputes d
  where d.invoice_id=v_invoice.id and d.status in ('needs_response','under_review');
 return pg_catalog.jsonb_build_object('ok',true,'kind','invoice_dispute','status',v_status,'disputed_amount',v_total,'invoice_id',v_invoice.provider_invoice_id);
end;
$function$;

CREATE OR REPLACE FUNCTION public.process_stripe_subscription_invoice_event(p_event_id text, p_event_type text, p_event_created_at bigint, p_invoice_id text, p_subscription_id text, p_payment_intent_id text, p_customer_id text, p_currency text, p_amount_due numeric, p_amount_paid numeric, p_billing_reason text, p_period_start timestamp with time zone, p_period_end timestamp with time zone, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_sub record;
  v_order_id uuid;
  v_status text;
  v_attempt integer := coalesce((p_metadata->>'attempt_count')::integer,0);
  v_next_attempt timestamptz;
  v_grace_until timestamptz;
  v_retry_state text;
begin
  if p_event_id is null or p_event_id !~ '^evt_[A-Za-z0-9]+$'
     or p_event_type not in ('invoice.paid','invoice.payment_failed')
     or p_event_created_at is null or p_event_created_at < 1
     or p_invoice_id is null or p_invoice_id !~ '^in_[A-Za-z0-9]+$'
     or p_subscription_id is null or p_subscription_id !~ '^sub_[A-Za-z0-9]+$'
     or p_currency is null or p_currency !~ '^[A-Z]{3}$'
     or p_amount_due is null or p_amount_due < 0
     or p_amount_paid is null or p_amount_paid < 0
     or p_amount_paid > p_amount_due
     or v_attempt < 0 then
    raise exception 'invalid_subscription_invoice_event';
  end if;
  if p_payment_intent_id is not null and p_payment_intent_id !~ '^pi_[A-Za-z0-9]+$' then
    raise exception 'invalid_invoice_payment_intent';
  end if;
  select s.user_id,s.item_type,s.entitlement_id,s.provider_subscription_id
    into v_sub
  from private.provider_subscriptions s
  where s.provider='stripe' and s.provider_subscription_id=p_subscription_id
  for update;
  if not found then
    return jsonb_build_object('ok',false,'retryable',true,'reason','subscription_not_mapped');
  end if;
  if v_sub.item_type='vpn' then
    select x.source_order_id into v_order_id from public.vpn_subscriptions x
    where x.id=v_sub.entitlement_id and x.user_id=v_sub.user_id;
  else
    select x.source_order_id into v_order_id from public.membership_subscriptions x
    where x.id=v_sub.entitlement_id and x.user_id=v_sub.user_id;
  end if;

  v_status := case when p_event_type='invoice.paid' then 'paid' else 'payment_failed' end;
  v_next_attempt := case when p_metadata->>'next_payment_attempt' ~ '^[0-9]+$'
    then to_timestamp((p_metadata->>'next_payment_attempt')::bigint) else null end;
  v_grace_until := case when v_status='payment_failed' then to_timestamp(p_event_created_at)+interval '7 days' else null end;
  v_retry_state := case when v_status='paid' then 'recovered'
    when v_next_attempt is not null then 'retry_scheduled'
    when v_attempt >= 3 then 'exhausted' else 'grace_period' end;

  insert into private.stripe_subscription_invoice_events(provider,event_id,event_type,provider_invoice_id,event_created_at)
  values('stripe',p_event_id,p_event_type,p_invoice_id,p_event_created_at)
  on conflict(provider,event_id) do nothing;
  if not found then return jsonb_build_object('ok',true,'duplicate_event',true); end if;

  insert into private.stripe_subscription_invoices(
    provider_invoice_id,provider_subscription_id,user_id,item_type,entitlement_id,source_order_id,
    payment_intent_id,customer_id,billing_reason,status,currency,amount_due,amount_paid,
    period_start,period_end,paid_at,failed_at,last_event_created_at,metadata,
    payment_attempt_count,next_payment_attempt_at,grace_until,retry_state
  ) values (
    p_invoice_id,p_subscription_id,v_sub.user_id,v_sub.item_type,v_sub.entitlement_id,v_order_id,
    p_payment_intent_id,p_customer_id,p_billing_reason,v_status,p_currency,p_amount_due,p_amount_paid,
    p_period_start,p_period_end,
    case when v_status='paid' then to_timestamp(p_event_created_at) else null end,
    case when v_status='payment_failed' then to_timestamp(p_event_created_at) else null end,
    p_event_created_at,coalesce(p_metadata,'{}'::jsonb),
    v_attempt,v_next_attempt,v_grace_until,v_retry_state
  )
  on conflict(provider,provider_invoice_id) do update set
    payment_intent_id=coalesce(excluded.payment_intent_id,private.stripe_subscription_invoices.payment_intent_id),
    customer_id=coalesce(excluded.customer_id,private.stripe_subscription_invoices.customer_id),
    billing_reason=coalesce(excluded.billing_reason,private.stripe_subscription_invoices.billing_reason),
    currency=excluded.currency,amount_due=excluded.amount_due,
    amount_paid=case when excluded.status='paid' then excluded.amount_paid else private.stripe_subscription_invoices.amount_paid end,
    period_start=coalesce(excluded.period_start,private.stripe_subscription_invoices.period_start),
    period_end=coalesce(excluded.period_end,private.stripe_subscription_invoices.period_end),
    status=case when excluded.last_event_created_at >= private.stripe_subscription_invoices.last_event_created_at
      then excluded.status else private.stripe_subscription_invoices.status end,
    paid_at=coalesce(excluded.paid_at,private.stripe_subscription_invoices.paid_at),
    failed_at=case when excluded.status='payment_failed' and excluded.last_event_created_at >= private.stripe_subscription_invoices.last_event_created_at
      then excluded.failed_at else private.stripe_subscription_invoices.failed_at end,
    payment_attempt_count=greatest(private.stripe_subscription_invoices.payment_attempt_count,excluded.payment_attempt_count),
    next_payment_attempt_at=case when excluded.status='paid' then null else coalesce(excluded.next_payment_attempt_at,private.stripe_subscription_invoices.next_payment_attempt_at) end,
    grace_until=case when excluded.status='paid' then null else coalesce(excluded.grace_until,private.stripe_subscription_invoices.grace_until) end,
    retry_state=case when excluded.status='paid' then 'recovered'
      when excluded.last_event_created_at >= private.stripe_subscription_invoices.last_event_created_at then excluded.retry_state
      else private.stripe_subscription_invoices.retry_state end,
    last_event_created_at=greatest(private.stripe_subscription_invoices.last_event_created_at,excluded.last_event_created_at),
    metadata=private.stripe_subscription_invoices.metadata || excluded.metadata,
    updated_at=now();

  update private.stripe_subscription_invoice_events set outcome='recorded'
  where provider='stripe' and event_id=p_event_id;
  return jsonb_build_object('ok',true,'invoice_id',p_invoice_id,'status',v_status,'retry_state',v_retry_state,'grace_until',v_grace_until);
end;
$function$;

drop function if exists public.process_stripe_subscription_event(text,text,text,bigint,text,timestamptz,boolean,timestamptz,text);
create or replace function public.process_stripe_subscription_event(
 p_event_id text,p_event_type text,p_subscription_id text,p_event_created_at bigint,
 p_status text default null,p_period_end timestamptz default null,
 p_cancel_at_period_end boolean default null,p_canceled_at timestamptz default null,
 p_invoice_id text default null,p_payment_intent_id text default null
) returns jsonb language plpgsql security definer set search_path to '' as $function$
begin
 if coalesce(auth.jwt()->>'role','') <> 'service_role' then
  raise exception 'service_role_required' using errcode='42501';
 end if;
 return private.process_stripe_subscription_event(
  p_event_id,p_event_type,p_subscription_id,p_event_created_at,p_status,p_period_end,
  p_cancel_at_period_end,p_canceled_at,p_invoice_id,p_payment_intent_id
 );
end;
$function$;
revoke all on function public.create_stripe_subscription_order(text,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.create_stripe_subscription_order(text,uuid,text) to authenticated,service_role;
revoke all on function public.map_stripe_subscription_after_checkout(uuid,text,text,text,timestamp with time zone) from public,anon,authenticated,service_role;
grant execute on function public.map_stripe_subscription_after_checkout(uuid,text,text,text,timestamp with time zone) to service_role;
revoke all on function public.mark_stripe_checkout_created(uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.mark_stripe_checkout_created(uuid,text) to service_role;
revoke all on function public.mark_stripe_checkout_failed(uuid) from public,anon,authenticated,service_role;
grant execute on function public.mark_stripe_checkout_failed(uuid) to service_role;
revoke all on function public.process_stripe_checkout_event(text,text,uuid,text,text,numeric,text,text,boolean) from public,anon,authenticated,service_role;
grant execute on function public.process_stripe_checkout_event(text,text,uuid,text,text,numeric,text,text,boolean) to service_role;
revoke all on function public.process_stripe_checkout_event(text,text,uuid,text,text,numeric,text,text) from public,anon,authenticated,service_role;
grant execute on function public.process_stripe_checkout_event(text,text,uuid,text,text,numeric,text,text) to service_role;
revoke all on function public.process_stripe_checkout_event(text,text,uuid,text,text,numeric,text) from public,anon,authenticated,service_role;
grant execute on function public.process_stripe_checkout_event(text,text,uuid,text,text,numeric,text) to service_role;
revoke all on function public.process_stripe_refund_dispute_event(text,text,text,text,numeric,text,text,text,timestamp with time zone) from public,anon,authenticated,service_role;
grant execute on function public.process_stripe_refund_dispute_event(text,text,text,text,numeric,text,text,text,timestamp with time zone) to service_role;
revoke all on function public.process_stripe_subscription_invoice_adjustment_event(text,text,text,text,numeric,text,text,text,timestamp with time zone) from public,anon,authenticated,service_role;
grant execute on function public.process_stripe_subscription_invoice_adjustment_event(text,text,text,text,numeric,text,text,text,timestamp with time zone) to service_role;
revoke all on function public.process_stripe_subscription_invoice_event(text,text,bigint,text,text,text,text,text,numeric,numeric,text,timestamp with time zone,timestamp with time zone,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.process_stripe_subscription_invoice_event(text,text,bigint,text,text,text,text,text,numeric,numeric,text,timestamp with time zone,timestamp with time zone,jsonb) to service_role;
revoke all on function public.process_stripe_subscription_event(text,text,text,bigint,text,timestamptz,boolean,timestamptz,text,text) from public,anon,authenticated,service_role;
grant execute on function public.process_stripe_subscription_event(text,text,text,bigint,text,timestamptz,boolean,timestamptz,text,text) to service_role;
commit;