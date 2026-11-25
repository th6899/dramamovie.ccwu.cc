begin;
alter table public.dramas alter column slug set not null;
alter table public.episodes alter column title set not null;
alter table public.episodes alter column is_free set default false;
alter table public.membership_plans add column if not exists description text;
alter table public.membership_plans alter column code set not null;
alter table public.membership_plans alter column duration_days drop default;
alter table public.subtitle_tracks alter column storage_path set not null;
commit;