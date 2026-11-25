begin;
create schema if not exists private;
create table if not exists private."payment_refunds" (
  "id" uuid default gen_random_uuid() not null,
  "order_id" uuid not null,
  "transaction_id" uuid not null,
  "provider" text not null,
  "provider_refund_id" text,
  "status" text default 'requested'::text not null,
  "amount" numeric(20,6) not null,
  "currency" text not null,
  "reason" text,
  "provider_event_id" text,
  "requested_by" uuid,
  "requested_at" timestamp with time zone default now() not null,
  "completed_at" timestamp with time zone,
  "failure_code" text,
  "metadata" jsonb default '{}'::jsonb not null
);
create table if not exists private."payment_transactions" (
  "id" uuid default gen_random_uuid() not null,
  "order_id" uuid not null,
  "provider" text not null,
  "asset" text,
  "network" text,
  "provider_reference" text,
  "amount" numeric(12,2) not null,
  "currency" text not null,
  "status" text default 'created'::text not null,
  "verified_at" timestamp with time zone,
  "created_at" timestamp with time zone default now() not null,
  "metadata" jsonb default '{}'::jsonb not null,
  "refunded_amount" numeric(20,6) default 0 not null,
  "disputed_amount" numeric(20,6) default 0 not null,
  "stripe_payment_intent_id" text
);
create table if not exists private."payment_webhook_events" (
  "id" uuid default gen_random_uuid() not null,
  "provider" text not null,
  "event_id" text not null,
  "event_type" text not null,
  "payload_hash" text not null,
  "order_id" uuid,
  "processing_status" text default 'received'::text not null,
  "received_at" timestamp with time zone default now() not null,
  "processed_at" timestamp with time zone,
  "failure_code" text
);
create table if not exists private."provider_subscription_events" (
  "provider" text not null,
  "event_id" text not null,
  "event_type" text not null,
  "provider_subscription_id" text,
  "outcome" text not null,
  "created_at" timestamp with time zone default now() not null
);
create table if not exists private."provider_subscriptions" (
  "id" uuid default gen_random_uuid() not null,
  "provider" text not null,
  "provider_subscription_id" text not null,
  "user_id" uuid not null,
  "item_type" text not null,
  "entitlement_id" uuid not null,
  "status" text default 'incomplete'::text not null,
  "current_period_end" timestamp with time zone,
  "cancel_at_period_end" boolean default false not null,
  "canceled_at" timestamp with time zone,
  "last_invoice_id" text,
  "last_event_created_at" bigint,
  "metadata" jsonb default '{}'::jsonb not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table if not exists private."stripe_subscription_invoice_adjustment_events" (
  "id" uuid default gen_random_uuid() not null,
  "provider" text default 'stripe'::text not null,
  "event_id" text not null,
  "event_type" text not null,
  "object_id" text not null,
  "invoice_id" uuid not null,
  "created_at" timestamp with time zone default now() not null
);
create table if not exists private."stripe_subscription_invoice_disputes" (
  "id" uuid default gen_random_uuid() not null,
  "invoice_id" uuid not null,
  "provider" text default 'stripe'::text not null,
  "provider_dispute_id" text not null,
  "status" text not null,
  "amount" numeric(20,6) not null,
  "currency" text not null,
  "reason" text,
  "evidence_due_at" timestamp with time zone,
  "provider_event_id" text not null,
  "resolved_at" timestamp with time zone,
  "metadata" jsonb default '{}'::jsonb not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table if not exists private."stripe_subscription_invoice_events" (
  "id" uuid default gen_random_uuid() not null,
  "provider" text default 'stripe'::text not null,
  "event_id" text not null,
  "event_type" text not null,
  "provider_invoice_id" text not null,
  "event_created_at" bigint not null,
  "outcome" text default 'received'::text not null,
  "created_at" timestamp with time zone default now() not null
);
create table if not exists private."stripe_subscription_invoice_refunds" (
  "id" uuid default gen_random_uuid() not null,
  "invoice_id" uuid not null,
  "provider" text default 'stripe'::text not null,
  "provider_refund_id" text not null,
  "status" text not null,
  "amount" numeric(20,6) not null,
  "currency" text not null,
  "reason" text,
  "provider_event_id" text not null,
  "completed_at" timestamp with time zone,
  "failure_code" text,
  "metadata" jsonb default '{}'::jsonb not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table if not exists private."stripe_subscription_invoices" (
  "id" uuid default gen_random_uuid() not null,
  "provider" text default 'stripe'::text not null,
  "provider_invoice_id" text not null,
  "provider_subscription_id" text not null,
  "user_id" uuid not null,
  "item_type" text not null,
  "entitlement_id" uuid not null,
  "source_order_id" uuid,
  "payment_intent_id" text,
  "customer_id" text,
  "billing_reason" text,
  "status" text not null,
  "currency" text not null,
  "amount_due" numeric(20,6) default 0 not null,
  "amount_paid" numeric(20,6) default 0 not null,
  "period_start" timestamp with time zone,
  "period_end" timestamp with time zone,
  "paid_at" timestamp with time zone,
  "failed_at" timestamp with time zone,
  "last_event_created_at" bigint default 0 not null,
  "metadata" jsonb default '{}'::jsonb not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "payment_attempt_count" integer default 0 not null,
  "next_payment_attempt_at" timestamp with time zone,
  "grace_until" timestamp with time zone,
  "retry_state" text default 'none'::text not null
);
create table if not exists private."stripe_webhook_events" (
  "event_id" text not null,
  "event_type" text not null,
  "order_id" uuid,
  "outcome" text default 'received'::text not null,
  "created_at" timestamp with time zone default now() not null,
  "processed_at" timestamp with time zone
);
create table if not exists private."usdt_exchange_quotes" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "item_type" text not null,
  "item_id" uuid not null,
  "fiat_amount" numeric(20,8) not null,
  "fiat_currency" text not null,
  "usdt_amount" numeric(24,8) not null,
  "fiat_per_usdt" numeric(24,12) not null,
  "rate_source" text default 'coingecko'::text not null,
  "source_updated_at" timestamp with time zone,
  "quoted_at" timestamp with time zone default now() not null,
  "expires_at" timestamp with time zone not null,
  "created_at" timestamp with time zone default now() not null
);
create table if not exists private."user_roles" (
  "user_id" uuid not null,
  "role" text not null,
  "created_at" timestamp with time zone default now() not null
);
create table if not exists private."video_ad_events" (
  "id" bigint generated BY DEFAULT as identity not null,
  "config_id" uuid,
  "episode_id" uuid,
  "event_type" text not null,
  "provider" text default 'google_ima'::text not null,
  "occurred_at" timestamp with time zone default now() not null,
  "session_fingerprint" text,
  "error_code" text
);
commit;
