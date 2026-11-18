begin;
create table if not exists public."ai_tool_catalog" (
  "id" uuid default gen_random_uuid() not null,
  "slug" text not null,
  "name" text not null,
  "category" text not null,
  "description" text not null,
  "official_url" text not null,
  "pricing_model" text default 'freemium'::text not null,
  "tags" text[] default '{}'::text[] not null,
  "sort_order" integer default 100 not null,
  "is_active" boolean default false not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table if not exists public."crypto_wallet_addresses" (
  "id" uuid default gen_random_uuid() not null,
  "wallet_provider" text not null,
  "asset" text default 'USDT'::text not null,
  "network" text not null,
  "wallet_address" text,
  "label" text default 'USDT 收款地址'::text not null,
  "instructions" text default ''::text not null,
  "is_active" boolean default false not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table if not exists public."tutorials" (
  "id" uuid default gen_random_uuid() not null,
  "slug" text not null,
  "title" text not null,
  "summary" text,
  "body_md" text,
  "category" text default 'general'::text not null,
  "resource_path" text,
  "status" text default 'draft'::text not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table if not exists public."episode_watch_progress" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "episode_id" uuid not null,
  "position_seconds" integer default 0 not null,
  "duration_seconds" integer,
  "completed_at" timestamp with time zone,
  "last_watched_at" timestamp with time zone default now() not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
commit;
