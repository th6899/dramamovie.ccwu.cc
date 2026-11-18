begin;

-- Keep paid-through access during Stripe's configured seven-day retry grace
-- period. The invoice RPC remains the sole writer of invoice state; this
-- trigger synchronizes that state to the associated entitlement.
create or replace function private.sync_stripe_invoice_entitlement_grace()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if tg_op = 'UPDATE'
     and new.last_event_created_at <= old.last_event_created_at then
    return new;
  end if;

  if new.status = 'payment_failed' and new.grace_until is not null then
    if new.item_type = 'membership' then
      update public.membership_subscriptions
         set ends_at = greatest(coalesce(ends_at, new.grace_until), new.grace_until),
             updated_at = now()
       where id = new.entitlement_id
         and user_id = new.user_id
         and status in ('active','past_due');
    elsif new.item_type = 'vpn' then
      update public.vpn_subscriptions
         set ends_at = greatest(coalesce(ends_at, new.grace_until), new.grace_until)
       where id = new.entitlement_id
         and user_id = new.user_id
         and status in ('active','past_due');
    end if;
  elsif new.status = 'paid' and new.period_end is not null then
    if new.item_type = 'membership' then
      update public.membership_subscriptions
         set status = 'active', ends_at = new.period_end, updated_at = now()
       where id = new.entitlement_id
         and user_id = new.user_id
         and status in ('active','past_due','expired');
    elsif new.item_type = 'vpn' then
      update public.vpn_subscriptions
         set status = 'active', ends_at = new.period_end
       where id = new.entitlement_id
         and user_id = new.user_id
         and status in ('active','past_due','expired');
    end if;
  end if;

  return new;
end;
$function$;

revoke all on function private.sync_stripe_invoice_entitlement_grace()
  from public, anon, authenticated;

drop trigger if exists trg_sync_stripe_invoice_entitlement_grace
  on private.stripe_subscription_invoices;

create trigger trg_sync_stripe_invoice_entitlement_grace
after insert or update
on private.stripe_subscription_invoices
for each row
execute function private.sync_stripe_invoice_entitlement_grace();

-- Expire Stripe entitlements only after the later of paid-through time and
-- the latest failed invoice's seven-day grace deadline.
create or replace function private.expire_paid_through_subscriptions()
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_count integer := 0;
  v_rows integer;
begin
  update public.membership_subscriptions s
     set status = 'expired', updated_at = now()
    from private.provider_subscriptions p
    left join lateral (
      select i.status, i.grace_until
        from private.stripe_subscription_invoices i
       where i.provider = 'stripe'
         and i.provider_subscription_id = p.provider_subscription_id
       order by i.last_event_created_at desc, i.updated_at desc
       limit 1
    ) latest on true
   where p.item_type = 'membership'
     and p.entitlement_id = s.id
     and p.status in ('active','past_due','canceled','unpaid')
     and p.current_period_end is not null
     and (case when latest.status = 'payment_failed'
               then greatest(p.current_period_end, coalesce(latest.grace_until, p.current_period_end))
               else p.current_period_end end) <= now()
     and s.status in ('active','suspended','past_due');
  get diagnostics v_rows = row_count;
  v_count := v_count + v_rows;

  update public.vpn_subscriptions s
     set status = 'expired'
    from private.provider_subscriptions p
    left join lateral (
      select i.status, i.grace_until
        from private.stripe_subscription_invoices i
       where i.provider = 'stripe'
         and i.provider_subscription_id = p.provider_subscription_id
       order by i.last_event_created_at desc, i.updated_at desc
       limit 1
    ) latest on true
   where p.item_type = 'vpn'
     and p.entitlement_id = s.id
     and p.status in ('active','past_due','canceled','unpaid')
     and p.current_period_end is not null
     and (case when latest.status = 'payment_failed'
               then greatest(p.current_period_end, coalesce(latest.grace_until, p.current_period_end))
               else p.current_period_end end) <= now()
     and s.status in ('active','suspended','past_due');
  get diagnostics v_rows = row_count;
  v_count := v_count + v_rows;

  update private.provider_subscriptions p
     set status = 'expired', updated_at = now()
   where p.status in ('active','past_due','canceled','unpaid')
     and p.current_period_end is not null
     and (case when (
       select i.status
         from private.stripe_subscription_invoices i
        where i.provider = 'stripe'
          and i.provider_subscription_id = p.provider_subscription_id
        order by i.last_event_created_at desc, i.updated_at desc
        limit 1
     ) = 'payment_failed'
     then greatest(p.current_period_end, coalesce((
       select i.grace_until
         from private.stripe_subscription_invoices i
        where i.provider = 'stripe'
          and i.provider_subscription_id = p.provider_subscription_id
        order by i.last_event_created_at desc, i.updated_at desc
        limit 1
     ), p.current_period_end))
     else p.current_period_end end) <= now();

  return v_count;
end;
$function$;

commit;
