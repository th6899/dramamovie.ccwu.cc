begin;

-- The deployed webhook passes p_payment_intent_id, but the public RPC wrapper
-- still exposes the older 9-argument signature. Replace it with the 10-arg
-- service-role-only wrapper expected by stripe-webhook.
drop function if exists public.process_stripe_subscription_event(
  text, text, text, bigint, text, timestamptz, boolean, timestamptz, text
);

create function public.process_stripe_subscription_event(
  p_event_id text,
  p_event_type text,
  p_subscription_id text,
  p_event_created_at bigint,
  p_status text default null,
  p_period_end timestamptz default null,
  p_cancel_at_period_end boolean default null,
  p_canceled_at timestamptz default null,
  p_invoice_id text default null,
  p_payment_intent_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if coalesce(auth.jwt()->>'role', '') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;

  return private.process_stripe_subscription_event(
    p_event_id,
    p_event_type,
    p_subscription_id,
    p_event_created_at,
    p_status,
    p_period_end,
    p_cancel_at_period_end,
    p_canceled_at,
    p_invoice_id,
    p_payment_intent_id
  );
end;
$function$;

revoke all on function public.process_stripe_subscription_event(
  text, text, text, bigint, text, timestamptz, boolean, timestamptz, text, text
) from public, anon, authenticated;
grant execute on function public.process_stripe_subscription_event(
  text, text, text, bigint, text, timestamptz, boolean, timestamptz, text, text
) to service_role;

commit;
