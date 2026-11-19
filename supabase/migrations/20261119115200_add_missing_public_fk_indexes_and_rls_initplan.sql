-- Add covering indexes for foreign keys identified by Supabase Performance Advisor.
CREATE INDEX IF NOT EXISTS dramas_created_by_idx
  ON public.dramas (created_by);

CREATE INDEX IF NOT EXISTS email_service_orders_product_id_idx
  ON public.email_service_orders (product_id);

CREATE INDEX IF NOT EXISTS email_service_orders_user_id_idx
  ON public.email_service_orders (user_id);

CREATE INDEX IF NOT EXISTS manual_payment_settings_updated_by_idx
  ON public.manual_payment_settings (updated_by);

CREATE INDEX IF NOT EXISTS subtitle_tracks_reviewed_by_idx
  ON public.subtitle_tracks (reviewed_by);

-- Evaluate auth.uid() once per statement rather than once per candidate row.
DROP POLICY IF EXISTS "Users can view their own email orders"
  ON public.email_service_orders;

CREATE POLICY "Users can view their own email orders"
  ON public.email_service_orders
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);
