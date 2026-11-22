alter table public.episodes add column if not exists description text;
alter table public.service_catalog add column if not exists video_path text;
alter table public.service_catalog add column if not exists file_path text;
alter table public.tutorials add column if not exists video_path text;
alter table public.tutorials add column if not exists file_path text;

create table if not exists public.adsense_settings (
  id boolean primary key default true check (id = true),
  publisher_id text,
  ad_slot text,
  is_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
alter table public.adsense_settings enable row level security;
drop policy if exists "Staff manage AdSense settings" on public.adsense_settings;
create policy "Staff manage AdSense settings" on public.adsense_settings
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('ccwu-catalog-assets','ccwu-catalog-assets',false,52428800,
  array['video/mp4','video/webm','application/pdf','text/plain','application/zip','image/png','image/jpeg','image/webp'])
on conflict (id) do update set file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "Staff upload catalog assets" on storage.objects;
create policy "Staff upload catalog assets" on storage.objects
  for insert to authenticated with check (bucket_id='ccwu-catalog-assets' and public.is_staff());
drop policy if exists "Staff read catalog assets" on storage.objects;
create policy "Staff read catalog assets" on storage.objects
  for select to authenticated using (bucket_id='ccwu-catalog-assets' and public.is_staff());
drop policy if exists "Staff update catalog assets" on storage.objects;
create policy "Staff update catalog assets" on storage.objects
  for update to authenticated using (bucket_id='ccwu-catalog-assets' and public.is_staff()) with check (bucket_id='ccwu-catalog-assets' and public.is_staff());
