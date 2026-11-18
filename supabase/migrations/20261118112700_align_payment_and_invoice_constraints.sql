begin;
alter table private.payment_disputes
 add constraint payment_disputes_amount_check check (amount > 0),
 add constraint payment_disputes_currency_check check (currency ~ '^[A-Z]{3}$'),
 add constraint payment_disputes_provider_check check (provider in ('stripe','paypal','adyen','alipay','wechat_pay')),
 add constraint payment_disputes_provider_provider_dispute_id_key unique (provider,provider_dispute_id),
 add constraint payment_disputes_status_check check (status in ('needs_response','under_review','won','lost','warning_closed','withdrawn'));
alter table private.payment_refunds
 add constraint payment_refunds_amount_check check (amount > 0),
 add constraint payment_refunds_currency_check check (currency ~ '^[A-Z]{3}$'),
 add constraint payment_refunds_provider_check check (provider in ('stripe','paypal','adyen','alipay','wechat_pay')),
 add constraint payment_refunds_provider_refund_id_nonempty check (provider_refund_id is null or length(trim(provider_refund_id)) > 0),
 add constraint payment_refunds_requested_by_fkey foreign key (requested_by) references auth.users(id) on delete set null,
 add constraint payment_refunds_status_check check (status in ('requested','pending','succeeded','failed','cancelled'));
alter table private.payment_transactions
 add constraint payment_transactions_amount_check check (amount >= 0),
 add constraint payment_transactions_disputed_amount_nonnegative check (disputed_amount >= 0 and disputed_amount <= amount),
 add constraint payment_transactions_provider_check check (provider in ('alipay','wechat_pay','card_psp','okx','binance','usdt_onchain','manual')),
 add constraint payment_transactions_refunded_amount_nonnegative check (refunded_amount >= 0 and refunded_amount <= amount),
 add constraint payment_transactions_status_check check (status in ('created','pending','succeeded','failed','refunded'));
alter table private.payment_webhook_events
 add constraint payment_webhook_events_order_id_fkey foreign key (order_id) references public.service_orders(id) on delete set null,
 add constraint payment_webhook_events_processing_status_check check (processing_status in ('received','processing','processed','ignored','failed')),
 add constraint payment_webhook_events_provider_check check (provider in ('alipay','wechat_pay','stripe','paypal','adyen','crypto'));
alter table private.provider_subscriptions
 add constraint provider_subscriptions_item_type_check check (item_type in ('membership','vpn')),
 add constraint provider_subscriptions_item_type_entitlement_id_key unique (item_type,entitlement_id),
 add constraint provider_subscriptions_provider_check check (provider='stripe'),
 add constraint provider_subscriptions_status_check check (status in ('incomplete','trialing','active','past_due','canceled','unpaid','expired')),
 add constraint provider_subscriptions_user_id_fkey foreign key (user_id) references auth.users(id) on delete restrict;
alter table private.stripe_subscription_invoice_adjustment_events
 add constraint stripe_subscription_invoice_adjustment_events_event_type_check check (event_type in ('refund.created','refund.updated','charge.dispute.created','charge.dispute.updated','charge.dispute.closed')),
 add constraint stripe_subscription_invoice_adjustment_events_provider_check check (provider='stripe');
alter table private.stripe_subscription_invoice_adjustment_events drop constraint if exists stripe_subscription_invoice_adjustment_events_invoice_id_fkey;
alter table private.stripe_subscription_invoice_adjustment_events
 add constraint stripe_subscription_invoice_adjustment_events_invoice_id_fkey foreign key (invoice_id) references private.stripe_subscription_invoices(id) on delete restrict;
alter table private.stripe_subscription_invoice_disputes
 add constraint stripe_subscription_invoice_disputes_amount_check check (amount > 0),
 add constraint stripe_subscription_invoice_disputes_currency_check check (currency ~ '^[A-Z]{3}$'),
 add constraint stripe_subscription_invoice_disputes_provider_check check (provider='stripe'),
 add constraint stripe_subscription_invoice_disputes_status_check check (status in ('needs_response','under_review','won','lost','warning_closed','withdrawn'));
alter table private.stripe_subscription_invoice_disputes drop constraint if exists stripe_subscription_invoice_disputes_invoice_id_fkey;
alter table private.stripe_subscription_invoice_disputes
 add constraint stripe_subscription_invoice_disputes_invoice_id_fkey foreign key (invoice_id) references private.stripe_subscription_invoices(id) on delete restrict;
alter table private.stripe_subscription_invoice_events
 add constraint stripe_subscription_invoice_events_event_type_check check (event_type in ('invoice.paid','invoice.payment_failed')),
 add constraint stripe_subscription_invoice_events_provider_check check (provider='stripe');
alter table private.stripe_subscription_invoice_refunds
 add constraint stripe_subscription_invoice_refunds_amount_check check (amount > 0),
 add constraint stripe_subscription_invoice_refunds_currency_check check (currency ~ '^[A-Z]{3}$'),
 add constraint stripe_subscription_invoice_refunds_provider_check check (provider='stripe'),
 add constraint stripe_subscription_invoice_refunds_status_check check (status in ('pending','succeeded','failed','cancelled'));
alter table private.stripe_subscription_invoice_refunds drop constraint if exists stripe_subscription_invoice_refunds_invoice_id_fkey;
alter table private.stripe_subscription_invoice_refunds
 add constraint stripe_subscription_invoice_refunds_invoice_id_fkey foreign key (invoice_id) references private.stripe_subscription_invoices(id) on delete restrict;
alter table private.stripe_subscription_invoices
 add constraint stripe_subscription_invoices_amount_due_check check (amount_due >= 0),
 add constraint stripe_subscription_invoices_amount_paid_check check (amount_paid >= 0),
 add constraint stripe_subscription_invoices_check check (amount_paid <= amount_due or amount_due=0),
 add constraint stripe_subscription_invoices_currency_check check (currency ~ '^[A-Z]{3}$'),
 add constraint stripe_subscription_invoices_item_type_check check (item_type in ('membership','vpn')),
 add constraint stripe_subscription_invoices_payment_attempt_count_check check (payment_attempt_count >= 0),
 add constraint stripe_subscription_invoices_provider_check check (provider='stripe'),
 add constraint stripe_subscription_invoices_retry_state_check check (retry_state in ('none','retry_scheduled','grace_period','recovered','exhausted')),
 add constraint stripe_subscription_invoices_source_order_id_fkey foreign key (source_order_id) references public.service_orders(id) on delete restrict,
 add constraint stripe_subscription_invoices_status_check check (status in ('draft','open','paid','payment_failed','void','uncollectible','unknown')),
 add constraint stripe_subscription_invoices_user_id_fkey foreign key (user_id) references auth.users(id) on delete restrict;
alter table public.membership_plans
 add constraint membership_plans_billing_interval_check check (billing_interval in ('month','year')),
 add constraint membership_plans_code_key unique (code),
 add constraint membership_plans_duration_days_check check (duration_days > 0),
 add constraint membership_plans_price_amount_check check (price_amount >= 0);
alter table public.membership_subscriptions
 add constraint membership_subscription_dates_check check (ends_at is null or starts_at is null or ends_at > starts_at);
alter table public.service_orders drop constraint if exists service_orders_user_id_fkey;
alter table public.service_orders
 add constraint service_orders_user_id_fkey foreign key (user_id) references auth.users(id) on delete restrict;
commit;