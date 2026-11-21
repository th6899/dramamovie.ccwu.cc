alter table private.episode_promotion_clicks add column if not exists click_nonce uuid;
create unique index if not exists episode_promotion_clicks_click_nonce_uidx on private.episode_promotion_clicks (click_nonce) where click_nonce is not null;
alter table private.video_ad_events add column if not exists event_token_id uuid;
create unique index if not exists video_ad_events_token_config_type_uidx on private.video_ad_events (event_token_id, config_id, event_type) where event_token_id is not null and config_id is not null;

create or replace function private.record_episode_promotion_click(p_promotion_id uuid,p_episode_id uuid,p_click_nonce uuid,p_referrer_domain text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare v_target_url text;
begin
 if p_click_nonce is null then raise exception 'invalid_click_token' using errcode='22023'; end if;
 select ep.target_url into v_target_url from public.episode_promotions ep
 where ep.id=p_promotion_id and ep.episode_id=p_episode_id and ep.is_active=true
 and (ep.starts_at is null or ep.starts_at<=pg_catalog.now())
 and (ep.ends_at is null or ep.ends_at>pg_catalog.now()) limit 1;
 if v_target_url is null then return null; end if;
 insert into private.episode_promotion_clicks(promotion_id,episode_id,clicked_at,referrer_domain,click_nonce)
 values(p_promotion_id,p_episode_id,pg_catalog.now(),
 case when p_referrer_domain ~ '^[a-zA-Z0-9.-]{1,253}$' then pg_catalog.lower(p_referrer_domain) else null end,p_click_nonce)
 on conflict(click_nonce) where click_nonce is not null do nothing;
 return v_target_url;
end; $$;
revoke all on function private.record_episode_promotion_click(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function private.record_episode_promotion_click(uuid,uuid,uuid,text) to service_role;

create or replace function private.record_video_ad_events(p_episode_id uuid,p_event_token_id uuid,p_allowed_config_ids uuid[],p_events jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_event jsonb; v_config_id uuid; v_event_type text; v_inserted integer:=0;
begin
 if p_episode_id is null or p_event_token_id is null or p_allowed_config_ids is null
 or pg_catalog.cardinality(p_allowed_config_ids)=0 or p_events is null
 or pg_catalog.jsonb_typeof(p_events)<>'array' or pg_catalog.jsonb_array_length(p_events)<1
 or pg_catalog.jsonb_array_length(p_events)>30 then
 raise exception 'invalid_ad_event_batch' using errcode='22023'; end if;
 for v_event in select value from pg_catalog.jsonb_array_elements(p_events) loop
  v_config_id:=(v_event->>'config_id')::uuid; v_event_type:=v_event->>'event_type';
  if not (v_config_id=any(p_allowed_config_ids)) or v_event_type not in ('ad_request','impression','start','first_quartile','midpoint','third_quartile','complete','skip','click','error') then
   raise exception 'invalid_ad_event' using errcode='22023'; end if;
  insert into private.video_ad_events(config_id,episode_id,event_type,provider,occurred_at,session_fingerprint,error_code,event_token_id)
  values(v_config_id,p_episode_id,v_event_type,'google_ima',pg_catalog.now(),
  left(coalesce(v_event->>'session_fingerprint',''),128),left(coalesce(v_event->>'error_code',''),128),p_event_token_id)
  on conflict(event_token_id,config_id,event_type) where event_token_id is not null and config_id is not null do nothing;
  if found then v_inserted:=v_inserted+1; end if;
 end loop; return v_inserted;
end; $$;
revoke all on function private.record_video_ad_events(uuid,uuid,uuid[],jsonb) from public,anon,authenticated;
grant execute on function private.record_video_ad_events(uuid,uuid,uuid[],jsonb) to service_role;
