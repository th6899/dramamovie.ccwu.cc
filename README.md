# CCWU Global Portal — source release 2.0.5

This repository contains the CCWU Global static portal, administration interface, video player, customer account dashboard, Supabase migrations, and server-side Edge Functions.

## Application components

- `index.html`, `app.js`: public portal and membership/VPN catalogue
- `admin.html`, `admin-v2.0.1.js`: staff administration interface, resumable video upload, subtitle conversion, explicit publishing, ads/promotions, plan and payment configuration
- `player.html`, `player.js`: episode player, entitlement checks, signed playback, subtitles and ad-event tracking
- `payment-result.html`, `payment-result.js`: authenticated checkout return and order-status page
- `account.html`, `account.js`: owner-scoped profile, subscription and order dashboard
- `config.js`: fail-closed host-based Supabase project selection and browser-safe publishable keys
- `_headers`: baseline security headers for Cloudflare Pages static hosting
- `supabase/migrations/`: versioned schema, RLS, storage policies, payment and entitlement functions
- `types/database.types.ts`: generated TypeScript contract snapshot for the test database
- `supabase/functions/`: six server-side functions — `create-checkout`, `stripe-webhook`, `get-episode-playback`, `cn-payment`, `track-episode-promotion`, and `record-video-ad-events`
- `.github/workflows/ci.yml`: frontend, security-contract, Deno type and migration-source checks

## Environment isolation

The test and production environments are intentionally separate.

- Test Pages project: `ccwu-global-test`
- Test Supabase project: `uvtzhzgirgwjzsmcdgej`
- Production Supabase project: `zkvfsuhlcrafgdbyxevr`
- Test hostnames under `*.ccwu-global-test.pages.dev` resolve to the test Supabase project.
- Known production hostnames resolve to the production Supabase project.
- Unknown hostnames fail closed rather than selecting a backend implicitly.

All development, schema changes, function deployments and test data belong in the independent test environment. The production database and website have not been modified. Do not merge the test branch, deploy to production, or change production data/configuration as part of routine validation.

## Payments

- USD recurring membership/VPN plans use Stripe Price IDs, an authenticated owner-scoped idempotent order RPC, server-side Price validation, and a Stripe test-mode key requirement.
- CNY Alipay/WeChat order creation uses owner-scoped idempotency keys; reusing a key for a different item is rejected.
- Stripe webhook events require timestamped HMAC signatures; Alipay callbacks require RSA2 verification; WeChat Pay callbacks require serial/timestamp/RSA verification and AES-GCM resource decryption.
- Provider settlement and reconciliation RPCs remain service-role-only.
- Alipay, WeChat Pay and manual QR collection remain disabled in the test project until valid sandbox configuration is supplied. The test project hard-blocks live CNY provider calls.
- Never treat a visible UI option or a created order as proof that a payment provider is live.
- Never put Stripe secret keys, webhook signing secrets, Alipay/WeChat merchant private keys, or Supabase service-role credentials in browser-delivered files or chat.

## Security and operations

- All 27 public business tables have RLS enabled. Private payment ledgers and audit tables remain default-deny and are not opened with permissive policies merely to silence advisor notices.
- Staff roles are stored server-side in the private role table; browser profile metadata is not an authorization source.
- Customer profile reads are owner-only. Customers can update only their own display name; order/subscription reads are owner-scoped.
- Customer UPDATE attempts against their own membership and VPN subscription rows are denied by RLS.
- Payment approval is restricted to the admin role. Payment settlement, provider-session attachment and reconciliation are server-side.
- Private video and subtitle objects require staff access for upload; playback checks published content and membership entitlement, then issues short-lived signed URLs.
- Admin content workflow uploads posters to the public poster bucket, videos to private storage using TUS resumable uploads, and WebVTT subtitles to private storage. SRT files are converted to WebVTT before upload; arbitrary TXT and raw SRT objects are rejected. Publishing is explicit; database guards require referenced media objects to exist.
- Free Supabase projects cap each file at 50 MB and include 1 GB total Storage. Both the admin uploader and private Storage bucket enforce the 50 MB per-file limit; use short authorized test clips and monitor total storage/egress.
- New membership/VPN plan forms default to inactive drafts, including after form reset. Test plans must not be activated until the owner approves the product details and test-only payment configuration.

## Current test-environment verification

- **74 source migrations match all 74 applied test database versions**, with no missing or extra versions. Latest applied migration: `20261120062700_harden_cn_payment_request_key_conflicts`.
- All six deployed test Edge Functions are ACTIVE and match their branch entrypoint source byte-for-byte: `create-checkout` v4, `stripe-webhook` v3, `get-episode-playback` v6, `cn-payment` v7, `track-episode-promotion` v4, and `record-video-ad-events` v3.
- The `create-checkout` v4 function was redeployed to the test Supabase project and now keeps database error details in server logs rather than returning them to browser clients.
- GitHub Actions has passed frontend/security contracts, all six Deno type checks, and migration integrity on recent branch heads. Check the current [branch workflow runs](https://github.com/th6899/dramamovie.ccwu.cc/actions/workflows/ci.yml?query=branch%3Afix%2Fportal-auth-errors-v2.0.3) for the latest run.
- The test project has a designated admin account and a confirmed ordinary customer account with no staff role. Rollback-only authenticated-customer fixtures verified own profile/orders/membership/VPN visibility of 1/2/1/1 and other-user visibility of 0/0/0/0.
- Rollback-only authenticated-customer UPDATE attempts against their own membership and VPN subscription each affected zero rows. Stripe and CNY same-key retry tests returned the same order ID with `duplicate=true`; changed item IDs were rejected with `request_key_conflict`. All test fixtures were rolled back and a follow-up query confirmed no fixture rows remained.
- Current catalogue: one inactive CNY membership plan, zero VPN plans, zero enabled payment methods and no manual QR settings. No plan/pricing assumptions or real payment methods have been invented.
- Video/subtitle buckets are private; video upload is limited to 50 MiB and subtitle storage is WebVTT-only. No authorized test video/subtitle asset has been supplied, so real upload/playback E2E remains blocked.
- Supabase Health Advisor currently reports no lints. Security Advisor still reports five authenticated SECURITY DEFINER RPCs (reviewed for empty search_path, identity/role checks and grants), 27 intentional private-schema RLS-without-policy INFO findings, and leaked-password protection disabled. The legacy Auth profile trigger `handle_new_ccwu_profile()` was also hardened to use an empty `search_path`; its trigger and postgres-only EXECUTE ACL remain intact.
- **Latest Cloudflare Pages Preview deployment provenance is not yet verified.** GitHub CI success is not proof that Cloudflare deployed the latest branch commit.

These checks do not constitute full end-to-end acceptance. Auth leaked-password protection, authorized media playback, Stripe/Alipay sandbox lifecycle tests, Google IMA test-tag verification, VPN provider integration, and Cloudflare Preview provenance remain explicit release gates.

## Remaining test release gates

See the [test acceptance matrix](docs/test-acceptance-matrix.md) for verified checks and owner-controlled end-to-end blockers.

See [Test environment secret inventory](docs/test-environment-secrets.md) for exact test-only Edge Function secret names and safe Dashboard configuration. Secret values must never be committed or pasted into chat.

1. Enable Supabase leaked-password protection in the test Auth settings.
2. Upload an authorized test video/subtitle asset and complete signed playback validation.
3. Configure Stripe test-mode products/prices and webhook secrets, then complete checkout, renewal/failure, refund and dispute sandbox tests.
4. Configure genuine Alipay sandbox credentials and verify signed callbacks and reconciliation. WeChat Pay's Native API v3 flow has no independent no-money sandbox and remains disabled.
5. Supply an authorized Google IMA test tag and published test episode.
6. Supply VPN provider test credentials and a provisioning contract.
7. Verify the latest Cloudflare Pages Preview deployment and its source commit using read-only deployment provenance.

A clean-room database rebuild and all positive-path authorization tests must pass before considering a production release. Production deployment and PR merge require separate explicit authorization.

## Cloudflare Pages deployment

The site is static. Use the repository root as the publish directory and leave the build command empty. Validate a Preview deployment first. Do not attach or switch production domains during test validation.

## Local checks

Run from the repository root:

```bash
node --input-type=module --check < app.js
node --input-type=module --check < admin-v2.0.1.js
node --input-type=module --check < config.js
node --input-type=module --check < player.js
node --input-type=module --check < payment-result.js
node --input-type=module --check < account.js
python3 .github/scripts/validate_portal.py
python3 .github/scripts/validate_plan_checkout.py
python3 .github/scripts/validate_database_types.py
python3 .github/scripts/validate_dom_contract.py
python3 .github/scripts/validate_admin_contract.py
python3 .github/scripts/validate_cn_payment_contract.py
python3 .github/scripts/validate_frontend_db_contract.py
python3 .github/scripts/validate_account_contract.py
python3 .github/scripts/validate_media_admin_contract.py
python3 .github/scripts/validate_playback_security_contract.py
python3 .github/scripts/validate_financial_write_security.py
python3 .github/scripts/validate_manual_payment_approval.py
python3 .github/scripts/validate_payment_proof_storage.py
python3 .github/scripts/validate_financial_rpc_contracts.py
python3 .github/scripts/validate_payment_edge_security.py
python3 .github/scripts/validate_ad_tracking_security.py
python3 .github/scripts/validate_owner_rls_contracts.py
python3 .github/scripts/validate_migrations.py
```

The Edge Function checks use Deno 2:

```bash
deno check --no-lock supabase/functions/create-checkout/index.ts
deno check --no-lock supabase/functions/stripe-webhook/index.ts
deno check --no-lock supabase/functions/get-episode-playback/index.ts
deno check --no-lock supabase/functions/cn-payment/index.ts
deno check --no-lock supabase/functions/track-episode-promotion/index.ts
deno check --no-lock supabase/functions/record-video-ad-events/index.ts
```
