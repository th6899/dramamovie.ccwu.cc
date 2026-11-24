alter table public.episodes
  add column if not exists free_trial_seconds integer not null default 0;

alter table public.episodes
  drop constraint if exists episodes_free_trial_seconds_check;

alter table public.episodes
  add constraint episodes_free_trial_seconds_check
  check (free_trial_seconds in (0, 60));
