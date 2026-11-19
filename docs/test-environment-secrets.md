# Test environment secret inventory

This document lists secret **names and purposes only**. Never put secret values in Git, issue comments, screenshots, or ChatGPT messages. Configure values directly in the Supabase Dashboard for the independent test project.

## Shared Supabase runtime variables

Supabase Edge Functions receive the project URL and service credentials from the runtime. The source also supports the current key aliases shown below:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEYS`
- `SUPABASE_ANON_KEY` or `SUPABASE_PUBLISHABLE_KEY`

Do not copy a service-role key into any browser asset. Do not create duplicate secrets unless the function runtime actually lacks the built-in variable.

## Required for test checkout and webhook verification

| Secret | Used by | Test-only requirement |
|---|---|---|
| `STRIPE_SECRET_KEY` | `create-checkout` | Stripe test-mode secret key; must be a test key, never a live key |
| `STRIPE_WEBHOOK_SECRET` | `stripe-webhook` | Signing secret from the Stripe test-mode webhook endpoint |
| `CCWU_EVENT_SIGNING_SECRET` | `get-episode-playback`, `track-episode-promotion`, `record-video-ad-events` | High-entropy random secret used to sign short-lived playback/promotion/ad-event tokens |
| `APP_ORIGIN` | `create-checkout` (required); `cn-payment` (optional CORS origin) | Required for Stripe checkout; set to the exact test branch Preview origin, e.g. `https://fix-portal-auth-errors-v2-0.ccwu-global-test.pages.dev`. The function rejects checkout if this value is absent and blocks known production hostnames |

Do not enable real payment methods merely because these secrets exist. Complete the test-mode checkout, webhook signature, duplicate-event, amount/currency mismatch, refund, dispute, and entitlement tests first.

## Alipay sandbox (optional; currently disabled)

Only configure these after a genuine Alipay sandbox merchant account is available:

- `ALIPAY_APP_ID`
- `ALIPAY_MERCHANT_PRIVATE_KEY`
- `ALIPAY_PUBLIC_KEY`
- `ALIPAY_GATEWAY` (must be the documented sandbox gateway for a test method)
- `ALIPAY_SELLER_ID` (optional)
- `ALIPAY_NOTIFY_URL` (optional; defaults to the test `cn-payment` function URL)

Keep `ALIPAY_LIVE_PAYMENTS_ENABLED` unset or explicitly false in the test project. The test payment method must remain disabled until the sandbox credential set is validated and the owner authorizes enabling that test method.

## WeChat Pay

WeChat Pay API v3 Native QR currently has no independent no-money sandbox path in this integration. Keep the WeChat Pay test method disabled. Do not configure live merchant keys in the test project or use live merchant endpoints for a test transaction.

The following are live-merchant configuration names only and must not be populated for routine test validation:

- `WECHATPAY_APP_ID`
- `WECHATPAY_MCHID`
- `WECHATPAY_MERCHANT_SERIAL_NO`
- `WECHATPAY_MERCHANT_PRIVATE_KEY`
- `WECHATPAY_PLATFORM_SERIAL`
- `WECHATPAY_PLATFORM_PUBLIC_KEY`
- `WECHATPAY_API_V3_KEY`
- `WECHATPAY_LIVE_PAYMENTS_ENABLED` (must remain unset or false outside a separately approved live release)

## Dashboard procedure

1. Open the Supabase Dashboard for the independent test project, not production.
2. Open **Edge Functions → Secrets**.
3. Add only the test secrets required for the next test being performed.
4. Do not send secret values to anyone; verify only the presence of the expected secret names.
5. Keep all payment methods disabled until the corresponding sandbox flow has been tested.
6. Never copy test secrets into production or production secrets into test.

## Free-plan storage limits

Supabase Free projects allow a maximum upload size of 50 MB per file and include 1 GB total Storage. The admin uploader therefore caps each video at 50 MB and uses resumable uploads for reliability; this is suitable for short test clips, not a full-length video library. Keep test media small to stay within the free quota.

## Current verified blockers

At the latest read-only audit, provider credentials were not configured, all payment methods were disabled, and no payment transactions existed. The test project's `cn-payment` Edge Function now rejects any enabled CNY payment method whose environment is not `test`; the admin console also blocks enabling live CNY methods and locks manual real-merchant QR toggles in this test project. The test project also still requires a dedicated staff account, a second ordinary test account, and an authorized media asset before authenticated admin, ownership-isolation, and playback acceptance tests can be completed.
