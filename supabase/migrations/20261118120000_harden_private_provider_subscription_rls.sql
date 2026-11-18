-- Harden provider subscription ledgers against accidental future API grants.
-- Trusted Stripe processing runs through reviewed SECURITY DEFINER RPC functions.
begin;
alter table private.provider_subscriptions enable row level security;
alter table private.provider_subscription_events enable row level security;
revoke all on table private.provider_subscriptions from public,anon,authenticated,service_role;
revoke all on table private.provider_subscription_events from public,anon,authenticated,service_role;
comment on table private.provider_subscriptions is
  'Private Stripe provider-subscription mapping. Access only through reviewed SECURITY DEFINER RPC functions; no direct client grants.';
comment on table private.provider_subscription_events is
  'Private Stripe provider-subscription event ledger. Access only through reviewed SECURITY DEFINER RPC functions; no direct client grants.';
commit;
