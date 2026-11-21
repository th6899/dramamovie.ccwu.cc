-- The webhook currently invokes the 9-argument overload. Keep that RPC compatible,
-- but never leave an expired paid-through period active after subscription.updated.
create or replace function private.process_stripe_subscription_event(
 p_event_id text, p_event_type text, p_subscription_id text, p_event_created_at bigint,
 p_status text default null::text, p_period_end timestamptz default null::timestamptz,
 p_cancel_at_period_end boolean default null::boolean, p_canceled_at timestamptz default null::timestamptz,
 p_invoice_id text default null::text
) returns jsonb
language plpgsql security definer set search_path to ''
as $function$
declare v_sub private.provider_subscriptions%rowtype; v_entitlement_status text; v_grace_until timestamptz; v_latest_invoice_status text;
begin
 if coalesce(p_event_id,'') !~ '^evt_[A-Za-z0-9]+$'
  or coalesce(p_subscription_id,'') !~ '^sub_[A-Za-z0-9]+$'
  or p_event_type not in ('invoice.paid','invoice.payment_failed','customer.subscription.updated','customer.subscription.deleted')
  or p_event_created_at is null then raise exception 'invalid_subscription_event'; end if;
 select * into v_sub from private.provider_subscriptions
  where provider='stripe' and provider_subscription_id=p_subscription_id for update;
 if not found then
  insert into private.provider_subscription_events(provider,event_id,event_type,provider_subscription_id,outcome)
  values('stripe',p_event_id,p_event_type,p_subscription_id,'unmapped') on conflict do nothing;
  return jsonb_build_object('ok',false,'reason','subscription_not_mapped');
 end if;
 if exists(select 1 from private.provider_subscription_events where provider='stripe' and event_id=p_event_id and outcome<>'unmapped')
 then return jsonb_build_object('ok',true,'duplicate',true); end if;
 if v_sub.last_event_created_at is not null and p_event_created_at < v_sub.last_event_created_at then
  insert into private.provider_subscription_events(provider,event_id,event_type,provider_subscription_id,outcome)
  values('stripe',p_event_id,p_event_type,p_subscription_id,'stale')
  on conflict(provider,event_id) do update set outcome='stale';
  return jsonb_build_object('ok',true,'stale',true);
 end if;
 if p_event_type='invoice.paid' then
  -- Invoice lifecycle RPC + grace trigger own invoice entitlement changes.
  if v_sub.status in ('canceled','expired') then
   update private.provider_subscriptions set current_period_end=coalesce(p_period_end,current_period_end),
    last_invoice_id=coalesce(p_invoice_id,last_invoice_id),last_event_created_at=p_event_created_at,updated_at=now()
   where id=v_sub.id;
   v_entitlement_status:=null;
  else
   update private.provider_subscriptions set status='active',current_period_end=coalesce(p_period_end,current_period_end),
    last_invoice_id=coalesce(p_invoice_id,last_invoice_id),last_event_created_at=p_event_created_at,updated_at=now()
   where id=v_sub.id;
   v_entitlement_status:='active';
  end if;
 elsif p_event_type='invoice.payment_failed' then
  update private.provider_subscriptions set status='past_due',last_invoice_id=coalesce(p_invoice_id,last_invoice_id),
   last_event_created_at=p_event_created_at,updated_at=now() where id=v_sub.id;
  v_entitlement_status:=null;
 elsif p_event_type='customer.subscription.updated' then
  update private.provider_subscriptions set
   status=case when p_status in ('active','trialing','past_due','unpaid','canceled','incomplete') then p_status else status end,
   current_period_end=coalesce(p_period_end,current_period_end),
   cancel_at_period_end=coalesce(p_cancel_at_period_end,cancel_at_period_end),
   canceled_at=coalesce(p_canceled_at,canceled_at),last_event_created_at=p_event_created_at,updated_at=now()
  where id=v_sub.id;
  v_entitlement_status:=case
   when coalesce(p_status,v_sub.status) in ('active','trialing','past_due','canceled','unpaid')
    and coalesce(p_period_end,v_sub.current_period_end)>now() then 'active'
   when coalesce(p_status,v_sub.status) in ('active','trialing','past_due','canceled','unpaid')
    and coalesce(p_period_end,v_sub.current_period_end)<=now() then case when v_latest_invoice_status='payment_failed' and v_grace_until>now() then 'active' else 'expired' end
   when coalesce(p_status,v_sub.status) in ('incomplete') then null
   else null end;
 elsif p_event_type='customer.subscription.deleted' then
  update private.provider_subscriptions set status='canceled',cancel_at_period_end=false,
   canceled_at=coalesce(p_canceled_at,now()),current_period_end=coalesce(p_period_end,current_period_end),
   last_event_created_at=p_event_created_at,updated_at=now() where id=v_sub.id;
  v_entitlement_status:=case when coalesce(p_period_end,v_sub.current_period_end)>now() then 'active' else 'expired' end;
 end if;
 if v_entitlement_status is not null then
  if v_sub.item_type='membership' then
   update public.membership_subscriptions set status=v_entitlement_status,
    ends_at=case when v_entitlement_status='active' and v_latest_invoice_status='payment_failed' and v_grace_until>now() then greatest(coalesce(p_period_end,ends_at),v_grace_until) else coalesce(p_period_end,ends_at) end,updated_at=now() where id=v_sub.entitlement_id;
  else
   update public.vpn_subscriptions set status=v_entitlement_status,
    ends_at=coalesce(p_period_end,ends_at) where id=v_sub.entitlement_id;
  end if;
 end if;
 insert into private.provider_subscription_events(provider,event_id,event_type,provider_subscription_id,outcome)
 values('stripe',p_event_id,p_event_type,p_subscription_id,'processed')
 on conflict(provider,event_id) do update set outcome='processed',provider_subscription_id=excluded.provider_subscription_id;
 return jsonb_build_object('ok',true,'status',v_entitlement_status);
end;
$function$;
create or replace function private.process_stripe_subscription_event(
  p_event_id text,
  p_event_type text,
  p_subscription_id text,
  p_event_created_at bigint,
  p_status text,
  p_period_end timestamptz,
  p_cancel_at_period_end boolean,
  p_canceled_at timestamptz,
  p_invoice_id text,
  p_payment_intent_id text
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_sub private.provider_subscriptions%rowtype;
  v_entitlement_status text;
  v_grace_until timestamptz;
  v_latest_invoice_status text;
  v_order_id uuid;
begin
  if coalesce(p_event_id,'') !~ '^evt_[A-Za-z0-9]+$'
    or coalesce(p_subscription_id,'') !~ '^sub_[A-Za-z0-9]+$'
    or p_event_type not in ('invoice.paid','invoice.payment_failed','customer.subscription.updated','customer.subscription.deleted')
    or p_event_created_at is null then
    raise exception 'invalid_subscription_event';
  end if;
  if p_payment_intent_id is not null and p_payment_intent_id !~ '^pi_[A-Za-z0-9]+$' then
    raise exception 'invalid_payment_intent_id';
  end if;

  select * into v_sub
  from private.provider_subscriptions
  where provider='stripe' and provider_subscription_id=p_subscription_id
  for update;

  if not found then
    insert into private.provider_subscription_events(provider,event_id,event_type,provider_subscription_id,outcome)
    values('stripe',p_event_id,p_event_type,p_subscription_id,'unmapped')
    on conflict do nothing;
    return jsonb_build_object('ok',false,'reason','subscription_not_mapped');
  end if;
  select i.status, i.grace_until into v_latest_invoice_status, v_grace_until
  from private.stripe_subscription_invoices i
  where i.provider='stripe' and i.provider_subscription_id=p_subscription_id
  order by i.last_event_created_at desc, i.updated_at desc limit 1;

  if exists (
    select 1 from private.provider_subscription_events
    where provider='stripe' and event_id=p_event_id and outcome<>'unmapped'
  ) then
    return jsonb_build_object('ok',true,'duplicate',true);
  end if;

  if v_sub.last_event_created_at is not null and p_event_created_at<v_sub.last_event_created_at then
    insert into private.provider_subscription_events(provider,event_id,event_type,provider_subscription_id,outcome)
    values('stripe',p_event_id,p_event_type,p_subscription_id,'stale')
    on conflict(provider,event_id) do update set outcome='stale';
    return jsonb_build_object('ok',true,'stale',true);
  end if;

  if p_event_type='invoice.paid' then
    if v_sub.status in ('canceled','expired') then
      update private.provider_subscriptions
      set current_period_end=coalesce(p_period_end,current_period_end),
          last_invoice_id=coalesce(p_invoice_id,last_invoice_id),
          last_event_created_at=p_event_created_at,updated_at=now()
      where id=v_sub.id;
      v_entitlement_status:=null;
    else
      update private.provider_subscriptions
      set status='active',current_period_end=coalesce(p_period_end,current_period_end),
          last_invoice_id=coalesce(p_invoice_id,last_invoice_id),
          last_event_created_at=p_event_created_at,updated_at=now()
      where id=v_sub.id;
      v_entitlement_status:='active';
    end if;

    if p_payment_intent_id is not null
      and coalesce(v_sub.metadata->>'source_order_id','') ~ '^[0-9a-fA-F-]{36}$' then
      v_order_id:=(v_sub.metadata->>'source_order_id')::uuid;
      update private.payment_transactions
      set stripe_payment_intent_id=p_payment_intent_id
      where order_id=v_order_id and provider='card_psp' and status='succeeded'
        and (stripe_payment_intent_id is null or stripe_payment_intent_id=p_payment_intent_id);
    end if;
  elsif p_event_type='invoice.payment_failed' then
    update private.provider_subscriptions
    set status='past_due',last_invoice_id=coalesce(p_invoice_id,last_invoice_id),
        last_event_created_at=p_event_created_at,updated_at=now()
    where id=v_sub.id;
    v_entitlement_status:=null;
  elsif p_event_type='customer.subscription.updated' then
    update private.provider_subscriptions
    set status=case when p_status in ('active','trialing','past_due','unpaid','canceled','incomplete') then p_status else status end,
        current_period_end=coalesce(p_period_end,current_period_end),
        cancel_at_period_end=coalesce(p_cancel_at_period_end,cancel_at_period_end),
        canceled_at=coalesce(p_canceled_at,canceled_at),
        last_event_created_at=p_event_created_at,updated_at=now()
    where id=v_sub.id;

    v_entitlement_status:=case
      when coalesce(p_status,v_sub.status) in ('active','trialing','past_due','canceled','unpaid')
        and coalesce(p_period_end,v_sub.current_period_end)>now() then 'active'
      when coalesce(p_status,v_sub.status) in ('active','trialing','past_due','canceled','unpaid')
        and coalesce(p_period_end,v_sub.current_period_end)<=now() then case when v_latest_invoice_status='payment_failed' and v_grace_until>now() then 'active' else 'expired' end
      else null
    end;
  elsif p_event_type='customer.subscription.deleted' then
    update private.provider_subscriptions
    set status='canceled',cancel_at_period_end=false,
        canceled_at=coalesce(p_canceled_at,now()),
        current_period_end=coalesce(p_period_end,current_period_end),
        last_event_created_at=p_event_created_at,updated_at=now()
    where id=v_sub.id;
    v_entitlement_status:=case
      when coalesce(p_period_end,v_sub.current_period_end)>now() then 'active'
      else 'expired'
    end;
  end if;

  if v_entitlement_status is not null then
    if v_sub.item_type='membership' then
      update public.membership_subscriptions
      set status=v_entitlement_status,ends_at=case when v_entitlement_status='active' and v_latest_invoice_status='payment_failed' and v_grace_until>now() then greatest(coalesce(p_period_end,ends_at),v_grace_until) else coalesce(p_period_end,ends_at) end,updated_at=now()
      where id=v_sub.entitlement_id;
    else
      update public.vpn_subscriptions
      set status=v_entitlement_status,ends_at=coalesce(p_period_end,ends_at)
      where id=v_sub.entitlement_id;
    end if;
  end if;

  insert into private.provider_subscription_events(provider,event_id,event_type,provider_subscription_id,outcome)
  values('stripe',p_event_id,p_event_type,p_subscription_id,'processed')
  on conflict(provider,event_id) do update
  set outcome='processed',provider_subscription_id=excluded.provider_subscription_id;

  return jsonb_build_object('ok',true,'status',v_entitlement_status);
end;
$function$;
