-- Harden provider subscription ledgers against accidental future API grants.
-- These tables currently have no anon/authenticated/service_role table ACL grants.
-- Stripe webhook processing uses SECURITY DEFINER RPC functions owned by postgres;
-- keep access mediated by those RPCs rather than granting direct table access.
-- Do not use FORCE ROW LEVEL SECURITY: the trusted SECURITY DEFINER routines must
-- continue to operate as the table owner.
ALTER TABLE private.provider_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.provider_subscription_events ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE private.provider_subscriptions IS
  'Private Stripe provider-subscription mapping. Access only through reviewed SECURITY DEFINER RPC functions; no direct client grants.';
COMMENT ON TABLE private.provider_subscription_events IS
  'Private Stripe provider-subscription event ledger. Access only through reviewed SECURITY DEFINER RPC functions; no direct client grants.';
