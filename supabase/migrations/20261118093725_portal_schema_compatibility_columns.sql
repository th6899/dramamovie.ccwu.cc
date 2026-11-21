begin;

-- Additive compatibility layer for the current portal's production schema.
-- Preserve the existing test-only columns and rows; do not rename or drop fields.

alter table public.dramas
  add column if not exists title text,
  add column if not exists poster_path text,
  add column if not exists release_year integer;

update public.dramas
   set title = coalesce(title, nullif(title_zh, ''), nullif(title_en, '')),
       poster_path = coalesce(poster_path, poster_url)
 where title is null or poster_path is null;

do $$
begin
  if exists (select 1 from public.dramas where title is null) then
    raise exception 'Cannot make dramas.title required: existing rows have no title mapping';
  end if;
end $$;

alter table public.dramas alter column title set not null;

alter table public.episodes
  add column if not exists season_number integer not null default 1,
  add column if not exists video_path text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.membership_plans
  add column if not exists code text,
  add column if not exists price_amount numeric(12,2) not null default 0,
  add column if not exists duration_days integer not null default 30,
  add column if not exists is_active boolean not null default false,
  add column if not exists stripe_price_id text,
  add column if not exists billing_interval text not null default 'month';

update public.membership_plans
   set price_amount = coalesce(price_amount, amount_minor::numeric / 100),
       duration_days = coalesce(duration_days, case when interval = 'year' then 365 else 30 end),
       is_active = coalesce(is_active, is_enabled),
       stripe_price_id = coalesce(stripe_price_id, provider_price_id),
       billing_interval = coalesce(billing_interval, interval);

alter table public.profiles
  add column if not exists display_name text,
  add column if not exists updated_at timestamptz not null default now();

update public.profiles
   set display_name = coalesce(display_name, username)
 where display_name is null;

alter table public.subtitle_tracks
  add column if not exists storage_path text;

commit;
