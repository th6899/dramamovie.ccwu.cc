# Episode promotion and Google IMA event tracking

## Scope
This integration is deployed only to the CCWU-Drama test project. It records episode promotion clicks and client-reported Google IMA lifecycle events. It does not verify affiliate-network conversions or establish payable advertising impressions.

## Required test secret
Set a dedicated secret in **Supabase Dashboard → CCWU-Drama → Edge Functions → Secrets**:

- Name: `CCWU_EVENT_SIGNING_SECRET`
- Value: generate a random value of at least 32 bytes (for example, run `openssl rand -hex 32` locally).

Do not put this value in GitHub, browser JavaScript, SQL, or chat. The playback function signs short-lived tokens with this secret; the tracking functions verify them. If the secret is absent, promotion links fall back to their HTTPS destination and ad-event tokens are omitted. The tracking endpoints fail closed.

## Promotion click flow
1. `get-episode-playback` selects active promotions for the requested published episode.
2. It signs a token containing promotion ID, episode ID, expiry (24 hours), and a random nonce.
3. The player opens `track-episode-promotion?token=...`.
4. The endpoint verifies the HMAC and expiry, re-reads the active promotion target from the database, records the click through a service-role-only RPC, and redirects only to an HTTPS URL.
5. A partial unique index on the nonce prevents the same signed click token from incrementing the click ledger more than once.

## IMA event flow
1. Playback signs an event token containing episode ID, the permitted ad-config IDs, a four-hour expiry, and a random token ID.
2. The player submits Google IMA lifecycle events to `record-video-ad-events`.
3. The endpoint verifies the token and validates each config ID and event type.
4. A service-role-only RPC inserts events into `private.video_ad_events`.
5. A unique key on token ID + config ID + event type makes event ingestion idempotent.

## Trust and payout limitations
IMA events originate in the browser and are therefore **analytics signals, not proof of billable impressions**. Do not use these rows alone for advertiser invoices, revenue share, or payouts. Those require provider-side reporting or signed server-to-server verification.

The `private.affiliate_conversion_ledger` is not yet wired to a provider postback. Affiliate commissions remain disabled until the selected network's callback signature, conversion-ID idempotency, amount/currency validation, and reversal/refund handling are implemented and tested.

## Validation status
- Test database migration versions: 53.
- RPC execute grants: denied to `anon` and `authenticated`; granted to `service_role`.
- Test Edge Functions deployed: `track-episode-promotion` v3, `record-video-ad-events` v2, `get-episode-playback` v4.
- No click or ad-event rows have been generated; test content and the signing secret are not configured.
- Production database, production Edge Functions, and production domains were not changed.
