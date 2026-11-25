-- TEST hardening: prevent direct table access while preserving the
-- postgres-owned SECURITY DEFINER RPC path. No client policies are intended.
ALTER TABLE private.video_ad_frequency_reservations
  ENABLE ROW LEVEL SECURITY;

-- Do not FORCE RLS: the two SECURITY DEFINER RPCs are owned by postgres,
-- which must retain owner access for atomic reservation and event processing.
