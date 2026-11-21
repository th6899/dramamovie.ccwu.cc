BEGIN;
-- The earlier baseline created this same logical unique key under a temporary name.
ALTER TABLE private.notification_delivery_queue
  DROP CONSTRAINT IF EXISTS notification_delivery_queue_user_dedupe_channel_key;
DO $constraints$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.affiliate_conversion_ledger'::regclass AND conname = 'affiliate_conversion_ledger_click_id_fkey') THEN
    ALTER TABLE private.affiliate_conversion_ledger ADD CONSTRAINT affiliate_conversion_ledger_click_id_fkey FOREIGN KEY (click_id) REFERENCES private.episode_promotion_clicks(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.affiliate_conversion_ledger'::regclass AND conname = 'affiliate_conversion_ledger_commission_amount_check') THEN
    ALTER TABLE private.affiliate_conversion_ledger ADD CONSTRAINT affiliate_conversion_ledger_commission_amount_check CHECK ((commission_amount >= (0)::numeric));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.affiliate_conversion_ledger'::regclass AND conname = 'affiliate_conversion_ledger_currency_check') THEN
    ALTER TABLE private.affiliate_conversion_ledger ADD CONSTRAINT affiliate_conversion_ledger_currency_check CHECK ((currency ~ '^[A-Z]{3,8}$'::text));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.affiliate_conversion_ledger'::regclass AND conname = 'affiliate_conversion_ledger_external_conversion_id_check') THEN
    ALTER TABLE private.affiliate_conversion_ledger ADD CONSTRAINT affiliate_conversion_ledger_external_conversion_id_check CHECK (((char_length(btrim(external_conversion_id)) >= 1) AND (char_length(btrim(external_conversion_id)) <= 180)));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.affiliate_conversion_ledger'::regclass AND conname = 'affiliate_conversion_ledger_metadata_check') THEN
    ALTER TABLE private.affiliate_conversion_ledger ADD CONSTRAINT affiliate_conversion_ledger_metadata_check CHECK ((jsonb_typeof(metadata) = 'object'::text));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.affiliate_conversion_ledger'::regclass AND conname = 'affiliate_conversion_ledger_network_check') THEN
    ALTER TABLE private.affiliate_conversion_ledger ADD CONSTRAINT affiliate_conversion_ledger_network_check CHECK (((char_length(btrim(network)) >= 1) AND (char_length(btrim(network)) <= 80)));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.affiliate_conversion_ledger'::regclass AND conname = 'affiliate_conversion_ledger_network_external_conversion_id_key') THEN
    ALTER TABLE private.affiliate_conversion_ledger ADD CONSTRAINT affiliate_conversion_ledger_network_external_conversion_id_key UNIQUE (network, external_conversion_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.affiliate_conversion_ledger'::regclass AND conname = 'affiliate_conversion_ledger_pkey') THEN
    ALTER TABLE private.affiliate_conversion_ledger ADD CONSTRAINT affiliate_conversion_ledger_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.affiliate_conversion_ledger'::regclass AND conname = 'affiliate_conversion_ledger_promotion_id_fkey') THEN
    ALTER TABLE private.affiliate_conversion_ledger ADD CONSTRAINT affiliate_conversion_ledger_promotion_id_fkey FOREIGN KEY (promotion_id) REFERENCES episode_promotions(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.affiliate_conversion_ledger'::regclass AND conname = 'affiliate_conversion_ledger_status_check') THEN
    ALTER TABLE private.affiliate_conversion_ledger ADD CONSTRAINT affiliate_conversion_ledger_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'paid'::text])));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.cn_payment_reconciliation_checks'::regclass AND conname = 'cn_payment_reconciliation_checks_amount_check') THEN
    ALTER TABLE private.cn_payment_reconciliation_checks ADD CONSTRAINT cn_payment_reconciliation_checks_amount_check CHECK ((amount >= (0)::numeric));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.cn_payment_reconciliation_checks'::regclass AND conname = 'cn_payment_reconciliation_checks_currency_check') THEN
    ALTER TABLE private.cn_payment_reconciliation_checks ADD CONSTRAINT cn_payment_reconciliation_checks_currency_check CHECK ((currency = 'CNY'::text));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.cn_payment_reconciliation_checks'::regclass AND conname = 'cn_payment_reconciliation_checks_order_id_fkey') THEN
    ALTER TABLE private.cn_payment_reconciliation_checks ADD CONSTRAINT cn_payment_reconciliation_checks_order_id_fkey FOREIGN KEY (order_id) REFERENCES service_orders(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.cn_payment_reconciliation_checks'::regclass AND conname = 'cn_payment_reconciliation_checks_outcome_check') THEN
    ALTER TABLE private.cn_payment_reconciliation_checks ADD CONSTRAINT cn_payment_reconciliation_checks_outcome_check CHECK ((outcome = ANY (ARRAY['settled'::text, 'closed'::text, 'pending'::text, 'mismatch'::text, 'ignored'::text])));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.cn_payment_reconciliation_checks'::regclass AND conname = 'cn_payment_reconciliation_checks_pkey') THEN
    ALTER TABLE private.cn_payment_reconciliation_checks ADD CONSTRAINT cn_payment_reconciliation_checks_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.cn_payment_reconciliation_checks'::regclass AND conname = 'cn_payment_reconciliation_checks_provider_check') THEN
    ALTER TABLE private.cn_payment_reconciliation_checks ADD CONSTRAINT cn_payment_reconciliation_checks_provider_check CHECK ((provider = ANY (ARRAY['alipay'::text, 'wechat_pay'::text])));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.cn_payment_reconciliation_checks'::regclass AND conname = 'cn_payment_reconciliation_checks_provider_state_check') THEN
    ALTER TABLE private.cn_payment_reconciliation_checks ADD CONSTRAINT cn_payment_reconciliation_checks_provider_state_check CHECK ((provider_state = ANY (ARRAY['SUCCESS'::text, 'TRADE_SUCCESS'::text, 'CLOSED'::text, 'TRADE_CLOSED'::text, 'NOTPAY'::text, 'USERPAYING'::text, 'PAYERROR'::text, 'REVOKED'::text, 'UNKNOWN'::text])));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.cn_payment_reconciliation_checks'::regclass AND conname = 'cn_payment_reconciliation_checks_response_hash_check') THEN
    ALTER TABLE private.cn_payment_reconciliation_checks ADD CONSTRAINT cn_payment_reconciliation_checks_response_hash_check CHECK ((response_hash ~ '^[a-f0-9]{64}$'::text));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.cn_refund_provider_events'::regclass AND conname = 'cn_refund_provider_events_payload_hash_check') THEN
    ALTER TABLE private.cn_refund_provider_events ADD CONSTRAINT cn_refund_provider_events_payload_hash_check CHECK ((payload_hash ~ '^[a-f0-9]{64}$'::text));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.cn_refund_provider_events'::regclass AND conname = 'cn_refund_provider_events_pkey') THEN
    ALTER TABLE private.cn_refund_provider_events ADD CONSTRAINT cn_refund_provider_events_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.cn_refund_provider_events'::regclass AND conname = 'cn_refund_provider_events_provider_check') THEN
    ALTER TABLE private.cn_refund_provider_events ADD CONSTRAINT cn_refund_provider_events_provider_check CHECK ((provider = ANY (ARRAY['alipay'::text, 'wechat_pay'::text])));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.cn_refund_provider_events'::regclass AND conname = 'cn_refund_provider_events_provider_provider_event_id_key') THEN
    ALTER TABLE private.cn_refund_provider_events ADD CONSTRAINT cn_refund_provider_events_provider_provider_event_id_key UNIQUE (provider, provider_event_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.cn_refund_provider_events'::regclass AND conname = 'cn_refund_provider_events_refund_id_fkey') THEN
    ALTER TABLE private.cn_refund_provider_events ADD CONSTRAINT cn_refund_provider_events_refund_id_fkey FOREIGN KEY (refund_id) REFERENCES private.payment_refunds(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.crypto_payment_events'::regclass AND conname = 'crypto_payment_events_pkey') THEN
    ALTER TABLE private.crypto_payment_events ADD CONSTRAINT crypto_payment_events_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.crypto_payment_events'::regclass AND conname = 'crypto_payment_events_provider_check') THEN
    ALTER TABLE private.crypto_payment_events ADD CONSTRAINT crypto_payment_events_provider_check CHECK ((provider = ANY (ARRAY['binance'::text, 'okx'::text, 'usdt_onchain'::text])));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.crypto_payment_events'::regclass AND conname = 'crypto_payment_events_provider_event_id_key') THEN
    ALTER TABLE private.crypto_payment_events ADD CONSTRAINT crypto_payment_events_provider_event_id_key UNIQUE (provider, event_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.crypto_payment_events'::regclass AND conname = 'crypto_payment_events_transaction_id_fkey') THEN
    ALTER TABLE private.crypto_payment_events ADD CONSTRAINT crypto_payment_events_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES private.payment_transactions(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.entitlement_admin_audit'::regclass AND conname = 'entitlement_admin_audit_action_check') THEN
    ALTER TABLE private.entitlement_admin_audit ADD CONSTRAINT entitlement_admin_audit_action_check CHECK ((action = ANY (ARRAY['manual_grant'::text, 'suspend'::text, 'reactivate'::text, 'cancel'::text])));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.entitlement_admin_audit'::regclass AND conname = 'entitlement_admin_audit_entitlement_kind_check') THEN
    ALTER TABLE private.entitlement_admin_audit ADD CONSTRAINT entitlement_admin_audit_entitlement_kind_check CHECK ((entitlement_kind = ANY (ARRAY['membership'::text, 'vpn'::text])));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.entitlement_admin_audit'::regclass AND conname = 'entitlement_admin_audit_pkey') THEN
    ALTER TABLE private.entitlement_admin_audit ADD CONSTRAINT entitlement_admin_audit_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.notification_delivery_attempts'::regclass AND conname = 'notification_delivery_attempts_delivery_id_fkey') THEN
    ALTER TABLE private.notification_delivery_attempts ADD CONSTRAINT notification_delivery_attempts_delivery_id_fkey FOREIGN KEY (delivery_id) REFERENCES private.notification_delivery_queue(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.notification_delivery_attempts'::regclass AND conname = 'notification_delivery_attempts_outcome_check') THEN
    ALTER TABLE private.notification_delivery_attempts ADD CONSTRAINT notification_delivery_attempts_outcome_check CHECK ((outcome = ANY (ARRAY['claimed'::text, 'sent'::text, 'retryable'::text, 'failed'::text, 'delivered'::text, 'bounced'::text, 'complained'::text, 'provider_event'::text])));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.notification_delivery_attempts'::regclass AND conname = 'notification_delivery_attempts_pkey') THEN
    ALTER TABLE private.notification_delivery_attempts ADD CONSTRAINT notification_delivery_attempts_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.notification_delivery_attempts'::regclass AND conname = 'notification_delivery_attempts_provider_event_id_key') THEN
    ALTER TABLE private.notification_delivery_attempts ADD CONSTRAINT notification_delivery_attempts_provider_event_id_key UNIQUE (provider_event_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.notification_delivery_queue'::regclass AND conname = 'notification_delivery_queue_attempt_count_check') THEN
    ALTER TABLE private.notification_delivery_queue ADD CONSTRAINT notification_delivery_queue_attempt_count_check CHECK ((attempt_count >= 0));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.notification_delivery_queue'::regclass AND conname = 'notification_delivery_queue_channel_check') THEN
    ALTER TABLE private.notification_delivery_queue ADD CONSTRAINT notification_delivery_queue_channel_check CHECK ((channel = 'email'::text));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.notification_delivery_queue'::regclass AND conname = 'notification_delivery_queue_dedupe_unique') THEN
    ALTER TABLE private.notification_delivery_queue ADD CONSTRAINT notification_delivery_queue_dedupe_unique UNIQUE (user_id, dedupe_key, channel);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.notification_delivery_queue'::regclass AND conname = 'notification_delivery_queue_event_type_check') THEN
    ALTER TABLE private.notification_delivery_queue ADD CONSTRAINT notification_delivery_queue_event_type_check CHECK ((event_type = ANY (ARRAY['payment.succeeded'::text, 'refund.succeeded'::text, 'refund.failed'::text, 'membership.activated'::text, 'membership.suspended'::text, 'membership.reactivated'::text, 'membership.cancelled'::text, 'vpn.activated'::text, 'vpn.suspended'::text, 'vpn.reactivated'::text, 'vpn.cancelled'::text])));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.notification_delivery_queue'::regclass AND conname = 'notification_delivery_queue_max_attempts_check') THEN
    ALTER TABLE private.notification_delivery_queue ADD CONSTRAINT notification_delivery_queue_max_attempts_check CHECK (((max_attempts >= 1) AND (max_attempts <= 10)));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.notification_delivery_queue'::regclass AND conname = 'notification_delivery_queue_payload_check') THEN
    ALTER TABLE private.notification_delivery_queue ADD CONSTRAINT notification_delivery_queue_payload_check CHECK ((jsonb_typeof(payload) = 'object'::text));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.notification_delivery_queue'::regclass AND conname = 'notification_delivery_queue_pkey') THEN
    ALTER TABLE private.notification_delivery_queue ADD CONSTRAINT notification_delivery_queue_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.notification_delivery_queue'::regclass AND conname = 'notification_delivery_queue_status_check') THEN
    ALTER TABLE private.notification_delivery_queue ADD CONSTRAINT notification_delivery_queue_status_check CHECK ((status = ANY (ARRAY['disabled'::text, 'queued'::text, 'sending'::text, 'sent'::text, 'retryable'::text, 'failed'::text])));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.notification_delivery_queue'::regclass AND conname = 'notification_delivery_queue_user_id_fkey') THEN
    ALTER TABLE private.notification_delivery_queue ADD CONSTRAINT notification_delivery_queue_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.notification_email_test_sends'::regclass AND conname = 'notification_email_test_sends_admin_user_id_fkey') THEN
    ALTER TABLE private.notification_email_test_sends ADD CONSTRAINT notification_email_test_sends_admin_user_id_fkey FOREIGN KEY (admin_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.notification_email_test_sends'::regclass AND conname = 'notification_email_test_sends_pkey') THEN
    ALTER TABLE private.notification_email_test_sends ADD CONSTRAINT notification_email_test_sends_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.notification_email_test_sends'::regclass AND conname = 'notification_email_test_sends_provider_message_id_key') THEN
    ALTER TABLE private.notification_email_test_sends ADD CONSTRAINT notification_email_test_sends_provider_message_id_key UNIQUE (provider_message_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.notification_email_test_sends'::regclass AND conname = 'notification_email_test_sends_recipient_hash_check') THEN
    ALTER TABLE private.notification_email_test_sends ADD CONSTRAINT notification_email_test_sends_recipient_hash_check CHECK ((recipient_hash ~ '^[0-9a-f]{64}$'::text));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.notification_email_test_sends'::regclass AND conname = 'notification_email_test_sends_status_check') THEN
    ALTER TABLE private.notification_email_test_sends ADD CONSTRAINT notification_email_test_sends_status_check CHECK ((status = ANY (ARRAY['claimed'::text, 'sent'::text, 'delivered'::text, 'bounced'::text, 'complained'::text, 'failed'::text])));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.payment_provider_credentials'::regclass AND conname = 'payment_provider_credentials_object') THEN
    ALTER TABLE private.payment_provider_credentials ADD CONSTRAINT payment_provider_credentials_object CHECK ((jsonb_typeof(credentials) = 'object'::text));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.payment_provider_credentials'::regclass AND conname = 'payment_provider_credentials_pkey') THEN
    ALTER TABLE private.payment_provider_credentials ADD CONSTRAINT payment_provider_credentials_pkey PRIMARY KEY (provider);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.payment_provider_credentials'::regclass AND conname = 'payment_provider_credentials_provider_check') THEN
    ALTER TABLE private.payment_provider_credentials ADD CONSTRAINT payment_provider_credentials_provider_check CHECK ((provider = ANY (ARRAY['binance'::text, 'okx'::text, 'usdt_onchain'::text])));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.usdt_exchange_quotes'::regclass AND conname = 'usdt_exchange_quotes_fiat_amount_check') THEN
    ALTER TABLE private.usdt_exchange_quotes ADD CONSTRAINT usdt_exchange_quotes_fiat_amount_check CHECK ((fiat_amount > (0)::numeric));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.usdt_exchange_quotes'::regclass AND conname = 'usdt_exchange_quotes_fiat_currency_check') THEN
    ALTER TABLE private.usdt_exchange_quotes ADD CONSTRAINT usdt_exchange_quotes_fiat_currency_check CHECK ((fiat_currency ~ '^[A-Z]{3}$'::text));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.usdt_exchange_quotes'::regclass AND conname = 'usdt_exchange_quotes_fiat_per_usdt_check') THEN
    ALTER TABLE private.usdt_exchange_quotes ADD CONSTRAINT usdt_exchange_quotes_fiat_per_usdt_check CHECK ((fiat_per_usdt > (0)::numeric));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.usdt_exchange_quotes'::regclass AND conname = 'usdt_exchange_quotes_item_type_check') THEN
    ALTER TABLE private.usdt_exchange_quotes ADD CONSTRAINT usdt_exchange_quotes_item_type_check CHECK ((item_type = ANY (ARRAY['membership'::text, 'vpn'::text])));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.usdt_exchange_quotes'::regclass AND conname = 'usdt_exchange_quotes_pkey') THEN
    ALTER TABLE private.usdt_exchange_quotes ADD CONSTRAINT usdt_exchange_quotes_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.usdt_exchange_quotes'::regclass AND conname = 'usdt_exchange_quotes_usdt_amount_check') THEN
    ALTER TABLE private.usdt_exchange_quotes ADD CONSTRAINT usdt_exchange_quotes_usdt_amount_check CHECK ((usdt_amount > (0)::numeric));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.usdt_exchange_quotes'::regclass AND conname = 'usdt_exchange_quotes_user_id_fkey') THEN
    ALTER TABLE private.usdt_exchange_quotes ADD CONSTRAINT usdt_exchange_quotes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.usdt_exchange_quotes'::regclass AND conname = 'usdt_quote_expiry_after_quote') THEN
    ALTER TABLE private.usdt_exchange_quotes ADD CONSTRAINT usdt_quote_expiry_after_quote CHECK ((expires_at > quoted_at));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.user_roles'::regclass AND conname = 'user_roles_pkey') THEN
    ALTER TABLE private.user_roles ADD CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.user_roles'::regclass AND conname = 'user_roles_role_check') THEN
    ALTER TABLE private.user_roles ADD CONSTRAINT user_roles_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'editor'::text, 'support'::text])));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.user_roles'::regclass AND conname = 'user_roles_user_id_fkey') THEN
    ALTER TABLE private.user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.video_ad_events'::regclass AND conname = 'video_ad_events_config_id_fkey') THEN
    ALTER TABLE private.video_ad_events ADD CONSTRAINT video_ad_events_config_id_fkey FOREIGN KEY (config_id) REFERENCES video_ad_configs(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.video_ad_events'::regclass AND conname = 'video_ad_events_episode_id_fkey') THEN
    ALTER TABLE private.video_ad_events ADD CONSTRAINT video_ad_events_episode_id_fkey FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.video_ad_events'::regclass AND conname = 'video_ad_events_event_type_check') THEN
    ALTER TABLE private.video_ad_events ADD CONSTRAINT video_ad_events_event_type_check CHECK ((event_type = ANY (ARRAY['ad_request'::text, 'impression'::text, 'start'::text, 'first_quartile'::text, 'midpoint'::text, 'third_quartile'::text, 'complete'::text, 'skip'::text, 'click'::text, 'error'::text])));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'private.video_ad_events'::regclass AND conname = 'video_ad_events_pkey') THEN
    ALTER TABLE private.video_ad_events ADD CONSTRAINT video_ad_events_pkey PRIMARY KEY (id);
  END IF;
END;
$constraints$;
COMMIT;
