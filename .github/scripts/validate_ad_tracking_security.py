#!/usr/bin/env python3
"""Validate signed promotion and video-ad event ingestion boundaries."""
from pathlib import Path

def read(path: str) -> str:
    p = Path(path)
    if not p.is_file():
        raise SystemExit(f"missing required source: {path}")
    return p.read_text(encoding="utf-8")

playback = read("supabase/functions/get-episode-playback/index.ts")
promotion = read("supabase/functions/track-episode-promotion/index.ts")
ad_events = read("supabase/functions/record-video-ad-events/index.ts")
migration = read("supabase/migrations/20261119040808_add_signed_episode_promotion_and_ima_event_ingestion.sql").lower()
rpc_migration = read("supabase/migrations/20261119040820_expose_service_only_promotion_and_ad_event_rpcs.sql").lower()

checks = {
    "playback signs ad-event tokens with a server secret of minimum length": 'eventSecret.length>=32' in playback and 'name:"HMAC",hash:"SHA-256"' in playback,
    "ad-event token binds episode, allowed config IDs, expiry and nonce": all(x in playback for x in ('type:"ad_events"', "episode_id:episodeId", "config_ids:eventConfigIds", "nonce:eventNonce")),
    "ad-event endpoint limits token and event batch sizes": "token.length > 8192" in ad_events and "body.events.length > 30" in ad_events,
    "ad-event endpoint validates HMAC, expiry and token type": all(x in ad_events for x in ("crypto.subtle.verify", "payload.exp < Math.floor(Date.now() / 1000)", 'payload.type !== "ad_events"')),
    "ad-event endpoint restricts config IDs to signed token contents": "payload.config_ids.includes(event.config_id)" in ad_events,
    "ad-event endpoint allowlists IMA event types": all(x in ad_events for x in ('"ad_request"', '"first_quartile"', '"midpoint"', '"third_quartile"', '"complete"', '"error"')),
    "ad-event writes use service-role RPC": 'admin.rpc("record_video_ad_events"' in ad_events,
    "promotion token is HMAC-verified and expires": all(x in promotion for x in ("crypto.subtle.verify", "payload.exp < Math.floor(Date.now() / 1000)", 'payload.type !== "promotion_click"')),
    "promotion token binds promotion, episode and nonce UUIDs": all(x in promotion for x in ("payload.promotion_id", "payload.episode_id", "payload.nonce")),
    "promotion redirect rejects unsafe schemes, credentials, local hosts and IPs": all(x in promotion for x in ('destination.protocol !== "https:"', "destination.username", "host === \"localhost\"", "isIp")),
    "promotion click write uses a service-role-only RPC": 'admin.rpc("record_episode_promotion_click"' in promotion,
    "promotion clicks are deduplicated by signed nonce": "episode_promotion_clicks_click_nonce_uidx" in migration and "on conflict(click_nonce)" in migration,
    "ad events are deduplicated per token/config/event type": "video_ad_events_token_config_type_uidx" in migration and "on conflict(event_token_id,config_id,event_type)" in migration,
    "private promotion and ad-event RPCs are not executable by browser roles": all(x in migration for x in ("revoke all on function private.record_episode_promotion_click", "grant execute on function private.record_episode_promotion_click", "revoke all on function private.record_video_ad_events", "grant execute on function private.record_video_ad_events")),
    "public tracking RPC wrappers remain service-role-only": all(x in rpc_migration for x in ("revoke all on function public.record_episode_promotion_click", "grant execute on function public.record_episode_promotion_click", "revoke all on function public.record_video_ad_events", "grant execute on function public.record_video_ad_events")),
}
failed = [name for name, passed in checks.items() if not passed]
for name, passed in checks.items():
    print(f'{"PASS" if passed else "FAIL"}: {name}')
if failed:
    raise SystemExit("Ad/promotion tracking security contract failed: " + "; ".join(failed))
print(f"All {len(checks)} ad/promotion tracking security contracts passed.")
