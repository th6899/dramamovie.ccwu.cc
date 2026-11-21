create or replace function private.record_video_ad_events(
  p_episode_id uuid,
  p_event_token_id uuid,
  p_allowed_config_ids uuid[],
  p_events jsonb
) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event jsonb;
  v_config_id uuid;
  v_event_type text;
  v_inserted integer := 0;
begin
  if p_episode_id is null or p_event_token_id is null
     or p_allowed_config_ids is null or pg_catalog.cardinality(p_allowed_config_ids) = 0
     or p_events is null or pg_catalog.jsonb_typeof(p_events) <> 'array'
     or pg_catalog.jsonb_array_length(p_events) < 1
     or pg_catalog.jsonb_array_length(p_events) > 30 then
    raise exception 'invalid_ad_event_batch' using errcode = '22023';
  end if;

  for v_event in select value from pg_catalog.jsonb_array_elements(p_events)
  loop
    v_config_id := (v_event->>'config_id')::uuid;
    v_event_type := v_event->>'event_type';
    if not (v_config_id = any(p_allowed_config_ids)) or
       v_event_type not in ('ad_request','impression','start','first_quartile','midpoint','third_quartile','complete','skip','click','error') then
      raise exception 'invalid_ad_event' using errcode = '22023';
    end if;

    insert into private.video_ad_events
      (config_id, episode_id, event_type, provider, occurred_at, session_fingerprint, error_code, event_token_id)
    values
      (v_config_id, p_episode_id, v_event_type, 'google_ima', pg_catalog.now(),
       left(coalesce(v_event->>'session_fingerprint',''), 128),
       left(coalesce(v_event->>'error_code',''), 128), p_event_token_id)
    on conflict (event_token_id, config_id, event_type)
      where event_token_id is not null and config_id is not null
      do nothing;
    if found then v_inserted := v_inserted + 1; end if;
  end loop;
  return v_inserted;
end;
$$;
revoke all on function private.record_video_ad_events(uuid,uuid,uuid[],jsonb) from public, anon, authenticated;
grant execute on function private.record_video_ad_events(uuid,uuid,uuid[],jsonb) to service_role;

create or replace function public.record_video_ad_events(
  p_episode_id uuid, p_event_token_id uuid, p_allowed_config_ids uuid[], p_events jsonb
) returns integer
language sql
security definer
set search_path = ''
as $$
  select private.record_video_ad_events(p_episode_id,p_event_token_id,p_allowed_config_ids,p_events);
$$;
revoke all on function public.record_video_ad_events(uuid,uuid,uuid[],jsonb) from public, anon, authenticated;
grant execute on function public.record_video_ad_events(uuid,uuid,uuid[],jsonb) to service_role;
