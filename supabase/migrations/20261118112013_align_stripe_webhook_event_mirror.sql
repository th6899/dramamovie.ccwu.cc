begin;
CREATE OR REPLACE FUNCTION private.mirror_legacy_stripe_webhook_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_status text := 'received';
  v_failure text := null;
begin
  if tg_op = 'UPDATE' then
    if new.outcome is distinct from old.outcome then
      v_status := case
        when new.outcome = 'received' then 'received'
        when new.outcome = 'awaiting_payment' then 'processed'
        else 'processed'
      end;
      if new.outcome in ('failed_or_expired','amount_or_currency_mismatch','order_not_payable') then
        v_failure := new.outcome;
      end if;
      update private.payment_webhook_events
         set processing_status = v_status,
             processed_at = coalesce(new.processed_at, now()),
             failure_code = v_failure,
             order_id = coalesce(new.order_id, order_id)
       where provider = 'stripe' and event_id = new.event_id;
    end if;
    return new;
  end if;

  insert into private.payment_webhook_events
    (provider, event_id, event_type, payload_hash, order_id, processing_status)
  values
    ('stripe', new.event_id, new.event_type,
     pg_catalog.md5(concat_ws('|', new.event_id, new.event_type, coalesce(new.order_id::text,''))),
     new.order_id, 'received')
  on conflict (provider, event_id) do nothing;

  return new;
end;
$function$;
revoke all on function private.mirror_legacy_stripe_webhook_event() from public,anon,authenticated,service_role;

drop trigger if exists stripe_webhook_events_mirror_insert on private.stripe_webhook_events;
create trigger stripe_webhook_events_mirror_insert after insert on private.stripe_webhook_events for each row execute function private.mirror_legacy_stripe_webhook_event();
drop trigger if exists stripe_webhook_events_mirror_update on private.stripe_webhook_events;
create trigger stripe_webhook_events_mirror_update after update of outcome,processed_at on private.stripe_webhook_events for each row execute function private.mirror_legacy_stripe_webhook_event();
commit;