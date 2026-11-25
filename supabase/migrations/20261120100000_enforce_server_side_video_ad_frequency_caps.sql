-- Server-side ad frequency caps. Viewer identity is either an authenticated UUID
-- or a persistent, random browser session identifier (not an IP/device fingerprint).
alter table private.video_ad_events
  add column if not exists viewer_id uuid,
  add column if not exists viewer_session_id uuid;

create index if not exists video_ad_events_frequency_user_idx
  on private.video_ad_events (config_id, viewer_id, occurred_at desc)
  where event_type = 'impression' and viewer_id is not null;
create index if not exists video_ad_events_frequency_session_idx
  on private.video_ad_events (config_id, viewer_session_id, occurred_at desc)
  where event_type = 'impression' and viewer_session_id is not null;

-- Short-lived reservations close the gap between parallel playback eligibility
-- checks and the later IMA impression callback. A reservation expires quickly
-- if the browser never starts the ad; it is released when an impression lands.
create table if not exists private.video_ad_frequency_reservations (
  config_id uuid not null references public.video_ad_configs(id) on delete cascade,
  viewer_identity text not null,
  reserved_until timestamptz not null,
  created_at timestamptz not null default pg_catalog.now(),
  primary key (config_id, viewer_identity)
);
create index if not exists video_ad_frequency_reservations_expiry_idx
  on private.video_ad_frequency_reservations (reserved_until);
revoke all on table private.video_ad_frequency_reservations from public, anon, authenticated;

create or replace function public.get_eligible_video_ad_config_ids(
  p_episode_id uuid,
  p_viewer_id uuid,
  p_viewer_session_id uuid,
  p_config_ids uuid[]
)
returns uuid[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_config public.video_ad_configs%rowtype;
  v_identity text;
  v_eligible uuid[] := '{}'::uuid[];
  v_reserved integer;
begin
  if p_episode_id is null or (p_viewer_id is null and p_viewer_session_id is null) then
    return v_eligible;
  end if;
  v_identity := case when p_viewer_id is not null
    then 'user:' || p_viewer_id::text
    else 'session:' || p_viewer_session_id::text end;

  for v_config in
    select c.*
    from public.video_ad_configs c
    where c.id = any(coalesce(p_config_ids, '{}'::uuid[]))
      and c.is_active = true
      and (c.episode_id is null or c.episode_id = p_episode_id)
    order by c.id
  loop
    -- Uncapped inventory does not need a reservation.
    if coalesce(v_config.frequency_cap_hours, 0) <= 0 then
      v_eligible := pg_catalog.array_append(v_eligible, v_config.id);
      continue;
    end if;

    -- Same viewer/config requests serialize before checking impressions and
    -- creating a reservation, so concurrent tabs cannot both receive the slot.
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(v_config.id::text || ':' || v_identity, 0)
    );

    if exists (
      select 1 from private.video_ad_events e
      where e.config_id = v_config.id
        and e.event_type = 'impression'
        and e.occurred_at >= pg_catalog.now()
          - pg_catalog.make_interval(hours => v_config.frequency_cap_hours)
        and (
          (p_viewer_id is not null and e.viewer_id = p_viewer_id)
          or (p_viewer_id is null and e.viewer_session_id = p_viewer_session_id)
        )
    ) then
      continue;
    end if;

    delete from private.video_ad_frequency_reservations r
    where r.config_id = v_config.id
      and r.viewer_identity = v_identity
      and r.reserved_until <= pg_catalog.now();

    insert into private.video_ad_frequency_reservations(config_id, viewer_identity, reserved_until)
    values(v_config.id, v_identity, pg_catalog.now() + interval '2 minutes')
    on conflict(config_id, viewer_identity) do nothing;
    get diagnostics v_reserved = row_count;
    if v_reserved = 1 then
      v_eligible := pg_catalog.array_append(v_eligible, v_config.id);
    end if;
  end loop;
  return v_eligible;
end;
$$;
revoke all on function public.get_eligible_video_ad_config_ids(uuid,uuid,uuid,uuid[]) from public, anon, authenticated;
grant execute on function public.get_eligible_video_ad_config_ids(uuid,uuid,uuid,uuid[]) to service_role;

create or replace function public.record_video_ad_events_v2(
  p_episode_id uuid,
  p_event_token_id uuid,
  p_allowed_config_ids uuid[],
  p_viewer_id uuid,
  p_viewer_session_id uuid,
  p_events jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event jsonb;
  v_config_id uuid;
  v_event_type text;
  v_inserted integer := 0;
  v_frequency_cap_hours integer;
begin
  if p_episode_id is null or p_event_token_id is null
    or p_allowed_config_ids is null or pg_catalog.cardinality(p_allowed_config_ids) = 0
    or (p_viewer_id is null and p_viewer_session_id is null)
    or p_events is null or pg_catalog.jsonb_typeof(p_events) <> 'array'
    or pg_catalog.jsonb_array_length(p_events) < 1
    or pg_catalog.jsonb_array_length(p_events) > 30 then
    raise exception 'invalid_ad_event_batch' using errcode = '22023';
  end if;

  for v_event in select value from pg_catalog.jsonb_array_elements(p_events) loop
    v_config_id := (v_event->>'config_id')::uuid;
    v_event_type := v_event->>'event_type';
    if not (v_config_id = any(p_allowed_config_ids))
      or v_event_type not in ('ad_request','impression','start','first_quartile','midpoint','third_quartile','complete','skip','click','error') then
      raise exception 'invalid_ad_event' using errcode = '22023';
    end if;

    -- Serialize impression writes for the same viewer/config pair and release
    -- the matching short-lived playback reservation when an impression lands.
    if v_event_type = 'impression' then
      perform pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(
          v_config_id::text || ':' || coalesce(p_viewer_id::text, p_viewer_session_id::text), 0
        )
      );
      select c.frequency_cap_hours into v_frequency_cap_hours
      from public.video_ad_configs c
      where c.id = v_config_id;

      if coalesce(v_frequency_cap_hours, 0) > 0 and exists (
        select 1
        from private.video_ad_events e
        where e.config_id = v_config_id
          and e.event_type = 'impression'
          and e.occurred_at >= pg_catalog.now()
            - pg_catalog.make_interval(hours => v_frequency_cap_hours)
          and (
            (p_viewer_id is not null and e.viewer_id = p_viewer_id)
            or
            (p_viewer_id is null and e.viewer_session_id = p_viewer_session_id)
          )
      ) then
        continue;
      end if;
    end if;

    if v_event_type = 'impression' then
      delete from private.video_ad_frequency_reservations
      where config_id = v_config_id
        and viewer_identity = case when p_viewer_id is not null
          then 'user:' || p_viewer_id::text
          else 'session:' || p_viewer_session_id::text end;
    end if;

    insert into private.video_ad_events(
      config_id, episode_id, event_type, provider, occurred_at,
      session_fingerprint, error_code, event_token_id, viewer_id, viewer_session_id
    )
    values(
      v_config_id, p_episode_id, v_event_type, 'google_ima', pg_catalog.now(),
      p_viewer_session_id::text, left(coalesce(v_event->>'error_code',''),128),
      p_event_token_id, p_viewer_id, p_viewer_session_id
    )
    on conflict(event_token_id, config_id, event_type)
      where event_token_id is not null and config_id is not null
    do nothing;
    if found then v_inserted := v_inserted + 1; end if;
  end loop;
  return v_inserted;
end;
$$;
revoke all on function public.record_video_ad_events_v2(uuid,uuid,uuid[],uuid,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.record_video_ad_events_v2(uuid,uuid,uuid[],uuid,uuid,jsonb) to service_role;
