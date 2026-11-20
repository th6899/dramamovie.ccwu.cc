begin;

create or replace function public.create_cn_payment_order(
  p_item_type text,
  p_item_id uuid,
  p_provider text,
  p_request_key text
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
  v_order_id uuid;
  v_order_no text;
  v_tx_id uuid;
  v_method record;
  v_existing record;
begin
  if v_user is null then
    raise exception 'authentication_required';
  end if;
  if p_provider not in ('alipay','wechat_pay') then
    raise exception 'unsupported_cn_provider';
  end if;
  if coalesce(p_request_key,'') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}
  end if;

  select o.id,o.order_no,o.amount,o.currency,o.status,o.item_type,o.item_id
    into v_existing
    from public.service_orders o
    join private.payment_transactions t on t.order_id=o.id
   where o.user_id=v_user
     and t.provider=p_provider
     and t.metadata->>'request_key'=p_request_key
   limit 1;

  if found then
    if v_existing.item_type is distinct from p_item_type
       or v_existing.item_id is distinct from p_item_id then
      raise exception 'request_key_conflict';
    end if;
    return jsonb_build_object(
      'order_id',v_existing.id,'order_no',v_existing.order_no,
      'amount',v_existing.amount,'currency',v_existing.currency,
      'status',v_existing.status,'duplicate',true
    );
  end if;

  select * into v_method
    from public.payment_methods
   where provider=p_provider and asset='CNY' and is_enabled=true
   order by sort_order
   limit 1;
  if not found then
    raise exception 'payment_channel_unavailable';
  end if;

  if p_item_type='membership' then
    select price_amount,upper(currency),name,duration_days,null::integer
      into v_amount,v_currency,v_title,v_duration,v_devices
      from public.membership_plans
     where id=p_item_id and is_active
     for share;
  elsif p_item_type='vpn' then
    select price_amount,upper(currency),name,duration_days,device_limit
      into v_amount,v_currency,v_title,v_duration,v_devices
      from public.vpn_plans
     where id=p_item_id and is_active
     for share;
  else
    raise exception 'unsupported_item_type';
  end if;

  if v_title is null or v_amount is null or v_amount<=0
     or v_duration is null or v_duration<=0 then
    raise exception 'plan_not_payable';
  end if;
  if v_currency<>'CNY' then
    raise exception 'cn_payment_requires_cny_plan';
  end if;

  v_order_no := 'CCWU-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,14));
  insert into public.service_orders(user_id,order_no,item_type,item_id,amount,currency,status)
  values(v_user,v_order_no,p_item_type,p_item_id,v_amount,'CNY','pending')
  returning id into v_order_id;

  insert into private.payment_transactions(order_id,provider,asset,amount,currency,status,metadata)
  values(v_order_id,p_provider,'CNY',v_amount,'CNY','created',
    jsonb_build_object(
      'plan_name',v_title,'duration_days',v_duration,'device_limit',v_devices,
      'request_key',p_request_key,'payment_method_code',v_method.code
    ))
  returning id into v_tx_id;

  return jsonb_build_object(
    'order_id',v_order_id,'order_no',v_order_no,'transaction_id',v_tx_id,
    'title',v_title,'amount',v_amount,'currency','CNY',
    'item_type',p_item_type,'item_id',p_item_id,
    'environment',v_method.environment,'duplicate',false
  );
exception when unique_violation then
  select o.id,o.order_no,o.amount,o.currency,o.status,o.item_type,o.item_id
    into v_existing
    from public.service_orders o
    join private.payment_transactions t on t.order_id=o.id
   where o.user_id=v_user
     and t.provider=p_provider
     and t.metadata->>'request_key'=p_request_key
   limit 1;
  if found then
    if v_existing.item_type is distinct from p_item_type
       or v_existing.item_id is distinct from p_item_id then
      raise exception 'request_key_conflict';
    end if;
    return jsonb_build_object(
      'order_id',v_existing.id,'order_no',v_existing.order_no,
      'amount',v_existing.amount,'currency',v_existing.currency,
      'status',v_existing.status,'duplicate',true
    );
  end if;
  raise;
end;
$function$;

commit;
 then
    raise exception 'invalid_request_key';
  end if;

  select o.id,o.order_no,o.amount,o.currency,o.status,o.item_type,o.item_id
    into v_existing
    from public.service_orders o
    join private.payment_transactions t on t.order_id=o.id
   where o.user_id=v_user
     and t.provider=p_provider
     and t.metadata->>'request_key'=p_request_key
   limit 1;

  if found then
    if v_existing.item_type is distinct from p_item_type
       or v_existing.item_id is distinct from p_item_id then
      raise exception 'request_key_conflict';
    end if;
    return jsonb_build_object(
      'order_id',v_existing.id,'order_no',v_existing.order_no,
      'amount',v_existing.amount,'currency',v_existing.currency,
      'status',v_existing.status,'duplicate',true
    );
  end if;

  select * into v_method
    from public.payment_methods
   where provider=p_provider and asset='CNY' and is_enabled=true
   order by sort_order
   limit 1;
  if not found then
    raise exception 'payment_channel_unavailable';
  end if;

  if p_item_type='membership' then
    select price_amount,upper(currency),name,duration_days,null::integer
      into v_amount,v_currency,v_title,v_duration,v_devices
      from public.membership_plans
     where id=p_item_id and is_active
     for share;
  elsif p_item_type='vpn' then
    select price_amount,upper(currency),name,duration_days,device_limit
      into v_amount,v_currency,v_title,v_duration,v_devices
      from public.vpn_plans
     where id=p_item_id and is_active
     for share;
  else
    raise exception 'unsupported_item_type';
  end if;

  if v_title is null or v_amount is null or v_amount<=0
     or v_duration is null or v_duration<=0 then
    raise exception 'plan_not_payable';
  end if;
  if v_currency<>'CNY' then
    raise exception 'cn_payment_requires_cny_plan';
  end if;

  v_order_no := 'CCWU-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,14));
  insert into public.service_orders(user_id,order_no,item_type,item_id,amount,currency,status)
  values(v_user,v_order_no,p_item_type,p_item_id,v_amount,'CNY','pending')
  returning id into v_order_id;

  insert into private.payment_transactions(order_id,provider,asset,amount,currency,status,metadata)
  values(v_order_id,p_provider,'CNY',v_amount,'CNY','created',
    jsonb_build_object(
      'plan_name',v_title,'duration_days',v_duration,'device_limit',v_devices,
      'request_key',p_request_key,'payment_method_code',v_method.code
    ))
  returning id into v_tx_id;

  return jsonb_build_object(
    'order_id',v_order_id,'order_no',v_order_no,'transaction_id',v_tx_id,
    'title',v_title,'amount',v_amount,'currency','CNY',
    'item_type',p_item_type,'item_id',p_item_id,
    'environment',v_method.environment,'duplicate',false
  );
exception when unique_violation then
  select o.id,o.order_no,o.amount,o.currency,o.status,o.item_type,o.item_id
    into v_existing
    from public.service_orders o
    join private.payment_transactions t on t.order_id=o.id
   where o.user_id=v_user
     and t.provider=p_provider
     and t.metadata->>'request_key'=p_request_key
   limit 1;
  if found then
    if v_existing.item_type is distinct from p_item_type
       or v_existing.item_id is distinct from p_item_id then
      raise exception 'request_key_conflict';
    end if;
    return jsonb_build_object(
      'order_id',v_existing.id,'order_no',v_existing.order_no,
      'amount',v_existing.amount,'currency',v_existing.currency,
      'status',v_existing.status,'duplicate',true
    );
  end if;
  raise;
end;
$function$;

commit;
 then
    raise exception 'invalid_request_key';
  end if;

  select o.id,o.order_no,o.amount,o.currency,o.status,o.item_type,o.item_id
    into v_existing
    from public.service_orders o
    join private.payment_transactions t on t.order_id=o.id
   where o.user_id=v_user
     and t.provider=p_provider
     and t.metadata->>'request_key'=p_request_key
   limit 1;

  if found then
    if v_existing.item_type is distinct from p_item_type
       or v_existing.item_id is distinct from p_item_id then
      raise exception 'request_key_conflict';
    end if;
    return jsonb_build_object(
      'order_id',v_existing.id,'order_no',v_existing.order_no,
      'amount',v_existing.amount,'currency',v_existing.currency,
      'status',v_existing.status,'duplicate',true
    );
  end if;

  select * into v_method
    from public.payment_methods
   where provider=p_provider and asset='CNY' and is_enabled=true
   order by sort_order
   limit 1;
  if not found then
    raise exception 'payment_channel_unavailable';
  end if;

  if p_item_type='membership' then
    select price_amount,upper(currency),name,duration_days,null::integer
      into v_amount,v_currency,v_title,v_duration,v_devices
      from public.membership_plans
     where id=p_item_id and is_active
     for share;
  elsif p_item_type='vpn' then
    select price_amount,upper(currency),name,duration_days,device_limit
      into v_amount,v_currency,v_title,v_duration,v_devices
      from public.vpn_plans
     where id=p_item_id and is_active
     for share;
  else
    raise exception 'unsupported_item_type';
  end if;

  if v_title is null or v_amount is null or v_amount<=0
     or v_duration is null or v_duration<=0 then
    raise exception 'plan_not_payable';
  end if;
  if v_currency<>'CNY' then
    raise exception 'cn_payment_requires_cny_plan';
  end if;

  v_order_no := 'CCWU-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,14));
  insert into public.service_orders(user_id,order_no,item_type,item_id,amount,currency,status)
  values(v_user,v_order_no,p_item_type,p_item_id,v_amount,'CNY','pending')
  returning id into v_order_id;

  insert into private.payment_transactions(order_id,provider,asset,amount,currency,status,metadata)
  values(v_order_id,p_provider,'CNY',v_amount,'CNY','created',
    jsonb_build_object(
      'plan_name',v_title,'duration_days',v_duration,'device_limit',v_devices,
      'request_key',p_request_key,'payment_method_code',v_method.code
    ))
  returning id into v_tx_id;

  return jsonb_build_object(
    'order_id',v_order_id,'order_no',v_order_no,'transaction_id',v_tx_id,
    'title',v_title,'amount',v_amount,'currency','CNY',
    'item_type',p_item_type,'item_id',p_item_id,
    'environment',v_method.environment,'duplicate',false
  );
exception when unique_violation then
  select o.id,o.order_no,o.amount,o.currency,o.status,o.item_type,o.item_id
    into v_existing
    from public.service_orders o
    join private.payment_transactions t on t.order_id=o.id
   where o.user_id=v_user
     and t.provider=p_provider
     and t.metadata->>'request_key'=p_request_key
   limit 1;
  if found then
    if v_existing.item_type is distinct from p_item_type
       or v_existing.item_id is distinct from p_item_id then
      raise exception 'request_key_conflict';
    end if;
    return jsonb_build_object(
      'order_id',v_existing.id,'order_no',v_existing.order_no,
      'amount',v_existing.amount,'currency',v_existing.currency,
      'status',v_existing.status,'duplicate',true
    );
  end if;
  raise;
end;
$function$;

commit;
 then
    raise exception 'invalid_request_key';
  end if;

  select o.id,o.order_no,o.amount,o.currency,o.status,o.item_type,o.item_id
    into v_existing
    from public.service_orders o
    join private.payment_transactions t on t.order_id=o.id
   where o.user_id=v_user
     and t.provider=p_provider
     and t.metadata->>'request_key'=p_request_key
   limit 1;

  if found then
    if v_existing.item_type is distinct from p_item_type
       or v_existing.item_id is distinct from p_item_id then
      raise exception 'request_key_conflict';
    end if;
    return jsonb_build_object(
      'order_id',v_existing.id,'order_no',v_existing.order_no,
      'amount',v_existing.amount,'currency',v_existing.currency,
      'status',v_existing.status,'duplicate',true
    );
  end if;

  select * into v_method
    from public.payment_methods
   where provider=p_provider and asset='CNY' and is_enabled=true
   order by sort_order
   limit 1;
  if not found then
    raise exception 'payment_channel_unavailable';
  end if;

  if p_item_type='membership' then
    select price_amount,upper(currency),name,duration_days,null::integer
      into v_amount,v_currency,v_title,v_duration,v_devices
      from public.membership_plans
     where id=p_item_id and is_active
     for share;
  elsif p_item_type='vpn' then
    select price_amount,upper(currency),name,duration_days,device_limit
      into v_amount,v_currency,v_title,v_duration,v_devices
      from public.vpn_plans
     where id=p_item_id and is_active
     for share;
  else
    raise exception 'unsupported_item_type';
  end if;

  if v_title is null or v_amount is null or v_amount<=0
     or v_duration is null or v_duration<=0 then
    raise exception 'plan_not_payable';
  end if;
  if v_currency<>'CNY' then
    raise exception 'cn_payment_requires_cny_plan';
  end if;

  v_order_no := 'CCWU-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,14));
  insert into public.service_orders(user_id,order_no,item_type,item_id,amount,currency,status)
  values(v_user,v_order_no,p_item_type,p_item_id,v_amount,'CNY','pending')
  returning id into v_order_id;

  insert into private.payment_transactions(order_id,provider,asset,amount,currency,status,metadata)
  values(v_order_id,p_provider,'CNY',v_amount,'CNY','created',
    jsonb_build_object(
      'plan_name',v_title,'duration_days',v_duration,'device_limit',v_devices,
      'request_key',p_request_key,'payment_method_code',v_method.code
    ))
  returning id into v_tx_id;

  return jsonb_build_object(
    'order_id',v_order_id,'order_no',v_order_no,'transaction_id',v_tx_id,
    'title',v_title,'amount',v_amount,'currency','CNY',
    'item_type',p_item_type,'item_id',p_item_id,
    'environment',v_method.environment,'duplicate',false
  );
exception when unique_violation then
  select o.id,o.order_no,o.amount,o.currency,o.status,o.item_type,o.item_id
    into v_existing
    from public.service_orders o
    join private.payment_transactions t on t.order_id=o.id
   where o.user_id=v_user
     and t.provider=p_provider
     and t.metadata->>'request_key'=p_request_key
   limit 1;
  if found then
    if v_existing.item_type is distinct from p_item_type
       or v_existing.item_id is distinct from p_item_id then
      raise exception 'request_key_conflict';
    end if;
    return jsonb_build_object(
      'order_id',v_existing.id,'order_no',v_existing.order_no,
      'amount',v_existing.amount,'currency',v_existing.currency,
      'status',v_existing.status,'duplicate',true
    );
  end if;
  raise;
end;
$function$;

commit;
