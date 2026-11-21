begin;
create table if not exists public."service_catalog" (
  "id" uuid default gen_random_uuid() not null,
  "slug" text not null,
  "title" text not null,
  "description" text,
  "category" text not null,
  "is_published" boolean default false not null,
  "sort_order" integer default 0 not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table if not exists public."service_orders" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "order_no" text not null,
  "item_type" text not null,
  "item_id" uuid,
  "amount" numeric not null,
  "currency" text default 'USD'::text not null,
  "status" text default 'pending'::text not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "payment_expires_at" timestamp with time zone,
  "payment_closed_at" timestamp with time zone
);
create table if not exists public."membership_subscriptions" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "plan_id" uuid not null,
  "source_order_id" uuid,
  "status" text default 'pending'::text not null,
  "starts_at" timestamp with time zone,
  "ends_at" timestamp with time zone,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table if not exists public."episode_promotions" (
  "id" uuid default gen_random_uuid() not null,
  "episode_id" uuid not null,
  "title" text not null,
  "description" text,
  "image_url" text,
  "target_url" text not null,
  "button_label" text default '立即了解'::text not null,
  "placement" text default 'below_video'::text not null,
  "affiliate_network" text,
  "campaign_code" text,
  "disclosure_text" text default '此内容包含推广链接；如通过链接购买或注册，本站可能获得推广佣金。'::text not null,
  "sort_order" integer default 0 not null,
  "is_active" boolean default false not null,
  "starts_at" timestamp with time zone,
  "ends_at" timestamp with time zone,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table if not exists public."manual_payment_settings" (
  "id" boolean default true not null,
  "alipay_qr_path" text,
  "wechat_qr_path" text,
  "alipay_enabled" boolean default false not null,
  "wechat_enabled" boolean default false not null,
  "instructions" text default '请扫码付款，并提交付款单号；管理员核实到账后开通服务。'::text not null,
  "updated_at" timestamp with time zone default now() not null,
  "updated_by" uuid
);
create table if not exists public."manual_payment_submissions" (
  "id" uuid default gen_random_uuid() not null,
  "order_id" uuid not null,
  "user_id" uuid not null,
  "method" text not null,
  "payer_reference" text not null,
  "proof_path" text,
  "status" text default 'submitted'::text not null,
  "admin_note" text,
  "reviewed_by" uuid,
  "reviewed_at" timestamp with time zone,
  "created_at" timestamp with time zone default now() not null
);
create table if not exists public."payment_methods" (
  "id" uuid default gen_random_uuid() not null,
  "code" text not null,
  "provider" text not null,
  "display_name" text not null,
  "asset" text,
  "network" text,
  "checkout_type" text not null,
  "is_enabled" boolean default false not null,
  "environment" text default 'test'::text not null,
  "sort_order" integer default 100 not null,
  "public_config" jsonb default '{}'::jsonb not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table if not exists public."refund_requests" (
  "id" uuid default gen_random_uuid() not null,
  "order_id" uuid not null,
  "user_id" uuid not null,
  "reason" text not null,
  "status" text default 'submitted'::text not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "requested_amount" numeric(20,6),
  "currency" text,
  "reviewed_by" uuid,
  "reviewed_at" timestamp with time zone,
  "admin_note" text,
  "payment_refund_id" uuid
);
create table if not exists public."user_notifications" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "category" text not null,
  "title" text not null,
  "body" text not null,
  "dedupe_key" text not null,
  "read_at" timestamp with time zone,
  "created_at" timestamp with time zone default now() not null
);
create table if not exists public."video_ad_configs" (
  "id" uuid default gen_random_uuid() not null,
  "episode_id" uuid,
  "slot_key" text not null,
  "ad_type" text not null,
  "ad_provider" text default 'google_ima'::text not null,
  "ad_tag_url" text,
  "midroll_offset_seconds" integer,
  "skip_after_seconds" integer,
  "frequency_cap_hours" integer,
  "members_exempt" boolean default true not null,
  "is_active" boolean default false not null,
  "starts_at" timestamp with time zone,
  "ends_at" timestamp with time zone,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table if not exists public."vpn_plans" (
  "id" uuid default gen_random_uuid() not null,
  "code" text not null,
  "name" text not null,
  "description" text,
  "price_amount" numeric(12,2) default 0 not null,
  "currency" text default 'USD'::text not null,
  "duration_days" integer not null,
  "device_limit" integer default 1 not null,
  "is_active" boolean default false not null,
  "created_at" timestamp with time zone default now() not null,
  "stripe_price_id" text,
  "billing_interval" text default 'month'::text not null
);
create table if not exists public."vpn_subscriptions" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "plan_id" uuid not null,
  "status" text default 'pending'::text not null,
  "starts_at" timestamp with time zone,
  "ends_at" timestamp with time zone,
  "provider_reference" text,
  "created_at" timestamp with time zone default now() not null,
  "source_order_id" uuid
);
create table if not exists public."vpn_device_bindings" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "subscription_id" uuid not null,
  "device_name" text not null,
  "platform" text not null,
  "fingerprint_hash" text not null,
  "status" text default 'active'::text not null,
  "first_seen_at" timestamp with time zone default now() not null,
  "last_seen_at" timestamp with time zone default now() not null,
  "revoked_at" timestamp with time zone,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table if not exists public."vpn_access_configs" (
  "id" uuid default gen_random_uuid() not null,
  "vpn_subscription_id" uuid not null,
  "user_id" uuid not null,
  "config_type" text not null,
  "label" text default 'VPN 配置'::text not null,
  "config_ciphertext" text not null,
  "config_iv" text not null,
  "status" text default 'active'::text not null,
  "expires_at" timestamp with time zone,
  "version" integer default 1 not null,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
commit;
