begin;

create unique index if not exists payment_transactions_card_psp_request_key_uidx
  on private.payment_transactions ((metadata->>'request_key'))
  where provider='card_psp' and metadata ? 'request_key';

create or replace function public.create_stripe_subscription_order_idempotent(
  p_item_type text,
  p_item_id uuid,
  p_currency text,
  p_request_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
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
  v_existing record;
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if p_request_key is null then
    raise exception 'invalid_request_key' using errcode = '22023';
  end if;
  if p_currency is distinct from 'USD' then
    raise exception 'stripe_usd_only';
  end if;

  select o.id,o.order_no,o.amount,o.currency,o.item_type,o.item_id,o.status,
         t.metadata->>'stripe_price_id' as stripe_price_id,
         t.metadata->>'billing_interval' as billing_interval
    into v_existing
    from public.service_orders o
    join private.payment_transactions t on t.order_id=o.id
   where o.user_id=v_user and t.provider='card_psp'
     and t.metadata->>'request_key'=p_request_key::text
   for update of o,t;

  if found then
    if v_existing.item_type is distinct from p_item_type
       or v_existing.item_id is distinct from p_item_id
       or v_existing.currency is distinct from p_currency then
      raise exception 'request_key_conflict';
    end if;
    if v_existing.status is distinct from 'pending' then
      raise exception 'order_not_pending';
    end if;
    return pg_catalog.jsonb_build_object(
      'order_id',v_existing.id,'order_no',v_existing.order_no,
      'title','Existing checkout','amount',v_existing.amount,
      'currency',v_existing.currency,'item_type',v_existing.item_type,
      'item_id',v_existing.item_id,'stripe_price_id',v_existing.stripe_price_id,
      'billing_interval',v_existing.billing_interval,'duplicate',true
    );
  end if;

  if p_item_type='membership' then
    select price_amount,upper(currency),name,duration_days,
           null::integer,stripe_price_id,billing_interval
      into v_amount,v_currency,v_title,v_duration,v_devices,v_price,v_interval
      from public.membership_plans
     where id=p_item_id and is_active=true
     for share;
  elsif p_item_type='vpn' then
    select price_amount,upper(currency),name,duration_days,
           device_limit,stripe_price_id,billing_interval
      into v_amount,v_currency,v_title,v_duration,v_devices,v_price,v_interval
      from public.vpn_plans
     where id=p_item_id and is_active=true
     for share;
  else
    raise exception 'unsupported_item_type';
  end if;

  if v_title is null or v_amount is null or v_amount<=0
     or v_duration is null or v_duration<=0 then
    raise exception 'plan_not_payable';
  end if;
  if v_currency is distinct from 'USD' then
    raise exception 'plan_currency_mismatch';
  end if;
  if coalesce(v_price,'') !~ '^price_[A-Za-z0-9]+$' then
    raise exception 'stripe_recurring_price_not_configured';
  end if;

  v_order_no:='CCWU-'||upper(substr(replace(pg_catalog.gen_random_uuid()::text,'-',''),1,14));
  insert into public.service_orders(user_id,order_no,item_type,item_id,amount,currency,status)
  values(v_user,v_order_no,p_item_type,p_item_id,v_amount,'USD','pending')
  returning id into v_order_id;

  insert into private.payment_transactions(order_id,provider,amount,currency,status,metadata)
  values(v_order_id,'card_psp',v_amount,'USD','created',
    pg_catalog.jsonb_build_object(
      'plan_name',v_title,'duration_days',v_duration,'device_limit',v_devices,
      'stripe_price_id',v_price,'billing_interval',v_interval,
      'billing_mode','subscription','request_key',p_request_key::text
    ));

  return pg_catalog.jsonb_build_object(
    'order_id',v_order_id,'order_no',v_order_no,'title',v_title,
    'amount',v_amount,'currency','USD','item_type',p_item_type,
    'item_id',p_item_id,'stripe_price_id',v_price,
    'billing_interval',v_interval,'duplicate',false
  );
exception when unique_violation then
  select o.id,o.order_no,o.amount,o.currency,o.item_type,o.item_id,o.status,
         t.metadata->>'stripe_price_id' as stripe_price_id,
         t.metadata->>'billing_interval' as billing_interval
    into v_existing
    from public.service_orders o
    join private.payment_transactions t on t.order_id=o.id
   where o.user_id=v_user and t.provider='card_psp'
     and t.metadata->>'request_key'=p_request_key::text
   limit 1;
  if found then
    if v_existing.item_type is distinct from p_item_type
       or v_existing.item_id is distinct from p_item_id
       or v_existing.currency is distinct from p_currency then
      raise exception 'request_key_conflict';
    end if;
    if v_existing.status is distinct from 'pending' then
      raise exception 'order_not_pending';
    end if;
    return pg_catalog.jsonb_build_object(
      'order_id',v_existing.id,'order_no',v_existing.order_no,
      'title','Existing checkout','amount',v_existing.amount,
      'currency',v_existing.currency,'item_type',v_existing.item_type,
      'item_id',v_existing.item_id,'stripe_price_id',v_existing.stripe_price_id,
      'billing_interval',v_existing.billing_interval,'duplicate',true
    );
  end if;
  raise;
end;
$function$;

revoke all on function public.create_stripe_subscription_order_idempotent(text,uuid,text,uuid)
  from public,anon,authenticated,service_role;
grant execute on function public.create_stripe_subscription_order_idempotent(text,uuid,text,uuid)
  to authenticated,service_role;

commit;
