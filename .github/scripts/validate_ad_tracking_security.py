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
    "ad-event token binds episode, allowed config IDs, expiry and nonce": all(x in playback for x in ('type:"ad_events"', "episode_id:episodeId", "config_ids:eligibleConfigIds", "nonce:eventNonce")),
    "ad-event endpoint limits token and event batch sizes": "token.length > 8192" in ad_events and "body.events.length > 30" in ad_events,
    "ad-event endpoint validates HMAC, expiry and token type": all(x in ad_events for x in ("crypto.subtle.verify", "payload.exp < Math.floor(Date.now() / 1000)", 'payload.type !== "ad_events"')),
    "ad-event endpoint restricts config IDs to signed token contents": "payload.config_ids.includes(event.config_id)" in ad_events,
    "ad-event endpoint allowlists IMA event types": all(x in ad_events for x in ('"ad_request"', '"first_quartile"', '"midpoint"', '"third_quartile"', '"complete"', '"error"')),
    "ad-event writes use service-role RPC": 'admin.rpc("record_video_ad_events_v2"' in ad_events,
    "playback requires a persistent opaque viewer session ID": "viewer_session_id" in playback and "INVALID_EPISODE_OR_VIEWER_SESSION" in playback,
    "media and signed event endpoints validate canonical UUID shape": all("[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}" in source for source in (playback, ad_events, promotion)) and all("^[0-9a-f-]{36}$" not in source for source in (playback, ad_events, promotion)),
    "playback filters ad slots through the server-side frequency-cap RPC": 'admin.rpc("get_eligible_video_ad_config_ids"' in playback and "eligibleSlots" in playback,
    "playback fails closed when signed impression tracking is unavailable": "ad_slots:adEventToken?eligibleSlots:[]" in playback,
    "signed ad-event token binds authenticated and anonymous viewer identities": all(x in playback for x in ("viewer_id:userId", "viewer_session_id:viewerSessionId")),
    "ad-event ingestion writes using signed viewer identity, not event-supplied identity": 'admin.rpc("record_video_ad_events_v2"' in ad_events and "p_viewer_session_id: payload.viewer_session_id" in ad_events,
    "anonymous viewer session persists across episodes where browser storage is available": "localStorage.getItem(key)" in read("player.js") and "localStorage.setItem(key, created)" in read("player.js"),
    "frequency-cap migration adds viewer indexes and service-role-only RPCs": all(x in read("supabase/migrations/20261120100000_enforce_server_side_video_ad_frequency_caps.sql").lower() for x in ("viewer_id", "viewer_session_id", "get_eligible_video_ad_config_ids", "record_video_ad_events_v2", "to service_role")),
    "impression writes serialize and recheck cap within the event transaction": all(x in read("supabase/migrations/20261120100000_enforce_server_side_video_ad_frequency_caps.sql") for x in ("pg_advisory_xact_lock", "hashtextextended", "v_frequency_cap_hours", "continue;")),

    "CNY payment order creation requires a caller-supplied UUID idempotency key": 'const requestKey = (body as Record<string, unknown>).request_key;' in read("supabase/functions/cn-payment/index.ts") and "!validUuid(requestKey)" in read("supabase/functions/cn-payment/index.ts") and "crypto.randomUUID()" not in read("supabase/functions/cn-payment/index.ts").split("async function handleCreate", 1)[1].split("async function handleAlipayNotify", 1)[0],
    "IMA callbacks and ad-tracking events ignore stale manager requests": all(x in read("player.js") for x in ("adRequestSequence", "activeAdRequestId", "adsLoader.requestAds(request, requestId)", "event.getUserRequestContext?.()", "requestId !== activeAdRequestId", "attachImaTracking(adsManager, slot, requestId)", "function attachImaTracking(manager, slot, requestId)", "resumeContent(requestId)")) and "if (requestId !== activeAdRequestId || !activeAdRequest) return;" in read("player.js"),
    "IMA loader errors are matched to their originating request context": all(x in read("player.js") for x in ("activeLoaderErrorHandler = (event)", "event.getUserRequestContext?.()", "errorRequestId !== requestId", "adsLoader.removeEventListener(google.ima.AdErrorEvent.Type.AD_ERROR, activeLoaderErrorHandler)", "adsLoader.addEventListener(google.ima.AdErrorEvent.Type.AD_ERROR, activeLoaderErrorHandler)")),
    "post-roll completion and IMA-unavailable fallback do not restart the ended episode": 'activeSlot?.ad_type !== "postroll" && !video.ended' in read("player.js") and 'slot?.ad_type !== "postroll" && !video.ended' in read("player.js") and "activeSlot = null;" in read("player.js"),
    "player retains queued ad events until ingestion succeeds": "adEventQueue.slice(0, 30)" in read("player.js") and "adEventQueue.splice(0, batch.length)" in read("player.js") and "if (error) throw error" in read("player.js"),
    "player serializes event batches and retries failed ingestion": "adEventFlushInFlight" in read("player.js") and "adEventRetryTimer" in read("player.js") and "adEventQueue.splice(0, 30)" not in read("player.js"),
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
