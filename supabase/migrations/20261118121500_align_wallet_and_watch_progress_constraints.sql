BEGIN;
ALTER TABLE public.crypto_wallet_addresses
  DROP CONSTRAINT IF EXISTS crypto_wallet_addresses_wallet_address_check,
  ADD CONSTRAINT crypto_wallet_addresses_active_requires_address CHECK (NOT is_active OR NULLIF(btrim(wallet_address), '') IS NOT NULL),
  ADD CONSTRAINT crypto_wallet_addresses_address_length CHECK (wallet_address IS NULL OR (length(btrim(wallet_address)) >= 20 AND length(btrim(wallet_address)) <= 128)),
  ADD CONSTRAINT crypto_wallet_addresses_provider_network_key UNIQUE (wallet_provider, network);
ALTER TABLE public.episode_watch_progress
  DROP CONSTRAINT IF EXISTS episode_watch_progress_episode_id_fkey,
  DROP CONSTRAINT IF EXISTS episode_watch_progress_user_id_fkey,
  ADD CONSTRAINT episode_watch_progress_episode_id_fkey FOREIGN KEY (episode_id) REFERENCES public.episodes(id) ON DELETE CASCADE,
  ADD CONSTRAINT episode_watch_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
COMMIT;
