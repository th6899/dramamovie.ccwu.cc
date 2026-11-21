create or replace function public.record_episode_promotion_click(p_promotion_id uuid,p_episode_id uuid,p_click_nonce uuid,p_referrer_domain text default null)
returns text language sql security definer set search_path = '' as $$
 select private.record_episode_promotion_click(p_promotion_id,p_episode_id,p_click_nonce,p_referrer_domain);
$$;
revoke all on function public.record_episode_promotion_click(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.record_episode_promotion_click(uuid,uuid,uuid,text) to service_role;
create or replace function public.record_video_ad_events(p_episode_id uuid,p_event_token_id uuid,p_allowed_config_ids uuid[],p_events jsonb)
returns integer language sql security definer set search_path = '' as $$
 select private.record_video_ad_events(p_episode_id,p_event_token_id,p_allowed_config_ids,p_events);
$$;
revoke all on function public.record_video_ad_events(uuid,uuid,uuid[],jsonb) from public,anon,authenticated;
grant execute on function public.record_video_ad_events(uuid,uuid,uuid[],jsonb) to service_role;
