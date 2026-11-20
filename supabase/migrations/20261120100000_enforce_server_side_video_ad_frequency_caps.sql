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

create or replace function public.get_eligible_video_ad_config_ids(
  p_episode_id uuid,
  p_viewer_id uuid,
  p_viewer_session_id uuid,
  p_config_ids uuid[]
)
returns uuid[]
language sql
security definer
set search_path = ''
as $$
  select coalesce(pg_catalog.array_agg(c.id order by c.slot_key), '{}'::uuid[])
  from public.video_ad_configs c
  where c.id = any(coalesce(p_config_ids, '{}'::uuid[]))
    and c.is_active = true
    and (c.episode_id is null or c.episode_id = p_episode_id)
    and (
      coalesce(c.frequency_cap_hours, 0) <= 0
      or not exists (
        select 1
        from private.video_ad_events e
        where e.config_id = c.id
          and e.event_type = 'impression'
          and e.occurred_at >= pg_catalog.now()
            - pg_catalog.make_interval(hours => c.frequency_cap_hours)
          and (
            (p_viewer_id is not null and e.viewer_id = p_viewer_id)
            or
            (p_viewer_id is null and p_viewer_session_id is not null
              and e.viewer_session_id = p_viewer_session_id)
          )
      )
    );
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

    -- Serialize impression writes for the same viewer/config pair. This closes
    -- concurrent ingestion races; the eligibility RPC remains the pre-delivery check.
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
