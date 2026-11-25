do $migration$
declare
  r record;
  v_definition text;
  v_old_membership text := $old$ends_at=case when v_entitlement_status='active' and v_latest_invoice_status='payment_failed' and v_grace_until>now() then greatest(coalesce(p_period_end,ends_at),v_grace_until) else coalesce(p_period_end,ends_at) end$old$;
  v_new_membership text := $new$ends_at=case when p_event_type='customer.subscription.updated' and coalesce(p_period_end,v_sub.current_period_end)<=now() and v_entitlement_status='active' and v_latest_invoice_status='payment_failed' and v_grace_until>now() then greatest(coalesce(p_period_end,ends_at),v_grace_until) else coalesce(p_period_end,ends_at) end$new$;
  v_old_vpn text := 'ends_at=coalesce(p_period_end,ends_at)';
  v_new_vpn text := $vpn$ends_at=case when p_event_type='customer.subscription.updated' and coalesce(p_period_end,v_sub.current_period_end)<=now() and v_entitlement_status='active' and v_latest_invoice_status='payment_failed' and v_grace_until>now() then greatest(coalesce(p_period_end,ends_at),v_grace_until) else coalesce(p_period_end,ends_at) end$vpn$;
begin
  for r in
    select p.oid, p.oid::regprocedure as signature
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='private' and p.proname='process_stripe_subscription_event' and p.prokind='f'
  loop
    v_definition := pg_get_functiondef(r.oid);
    if position(v_old_membership in v_definition)=0 then
      raise exception 'Expected membership ends_at expression not found in %', r.signature;
    end if;
    v_definition := replace(v_definition,v_old_membership,v_new_membership);
    if position(v_old_vpn in v_definition)=0 then
      raise exception 'Expected VPN ends_at expression not found in %', r.signature;
    end if;
    v_definition := replace(v_definition,v_old_vpn,v_new_vpn);
    execute v_definition;
  end loop;
end
$migration$;