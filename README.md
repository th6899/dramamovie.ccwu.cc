# CCWU Global Portal — source release 2.0.4

This repository contains the CCWU Global static portal, administration interface, video player, payment-result page, Supabase database migrations, and server-side Edge Functions.

## Application components

- `index.html`, `app.js`: public portal and membership catalogue
- `admin.html`, `admin-v2.0.1.js`: staff administration interface (ES module; cache-busted v2.0.4 entrypoint with resumable video upload, poster/subtitle upload, and explicit publish/unpublish controls)
- `player.html`, `player.js`: episode player and signed playback flow
- `payment-result.html`, `payment-result.js`: checkout return/status page
- `account.html`, `account.js`: authenticated customer dashboard for profile, subscriptions, and order history
- `config.js`: host-based Supabase project selection and browser-safe publishable key
- `_headers`: baseline security headers for Cloudflare Pages static hosting
- `supabase/migrations/`: versioned database schema, RLS, storage policies, payment and entitlement functions
- `types/database.types.ts`: generated TypeScript contract snapshot from the independent test database's exposed public schema and RPCs
- `supabase/functions/`: six server-side functions: `create-checkout`, `stripe-webhook`, `get-episode-playback`, `cn-payment`, `track-episode-promotion`, and `record-video-ad-events`
- `.github/workflows/ci.yml`: frontend, Edge Function, plan/checkout, generated database-type, deployment-isolation, and migration-source checks

## Environment isolation

The test and production environments are intentionally separate.

- Test Pages project: `ccwu-global-test`
- Test Supabase project: `uvtzhzgirgwjzsmcdgej`
- Production Supabase project: `zkvfsuhlcrafgdbyxevr`
- Test hostnames under `*.ccwu-global-test.pages.dev` resolve to the test Supabase project.
- Known production hostnames resolve to the production Supabase project.
- Unknown hostnames fail closed rather than selecting a backend implicitly.

All development, schema changes, function deployments, and test data belong in the independent test environment. Do not merge the test branch, deploy to production, or change production data/configuration as part of routine validation.

## Payments

- USD recurring membership/VPN plans use Stripe Price IDs and server-side checkout validation.
- CNY payment order creation is implemented in the `cn-payment` Edge Function and database RPCs.
- Alipay and WeChat Pay remain disabled until merchant credentials, callback verification, and reconciliation have been configured and tested.
- Manual QR payments remain disabled until the merchant configures the QR assets and settings.
- Never treat a visible UI option or a created order as proof that a payment provider is live.
- Never put Stripe secret keys, webhook signing secrets, Alipay/WeChat merchant private keys, or Supabase service-role credentials in browser-delivered files or chat.

## Security and operations

- Public-schema tables have RLS enabled. Private payment ledgers are not exposed as public tables.
- Staff roles are stored server-side in the private role table; browser profile metadata is not an authorization source.
- Payment approval is restricted to the admin role. Customer order and subscription reads are ownership-scoped.
- Private video and subtitle objects require staff access for upload; playback is issued through the server-side playback function.
- Admin content workflow uploads posters to the public poster bucket, videos to private storage using TUS resumable uploads, and VTT/SRT/TXT subtitles to private storage. Publishing is explicit; database guards require the poster/video object to exist and the parent drama to be published first.
- Free Supabase projects cap each file at 50 MB and include 1 GB total Storage. The admin video uploader enforces the 50 MB per-file limit; use short test clips and monitor total storage/egress.
- The CI workflow checks browser JavaScript syntax, environment isolation, public bundle secret patterns, plan/Stripe checkout contracts, Deno types, admin media upload/publish contracts, and migration naming/version integrity.

## Current test-preview verification

The following are verified for the current test branch snapshot:

- 55 migration files exist in source and all 55 corresponding versions are applied to the test database.
- All six tracked Edge Functions are active in the test project and their deployed source matches the branch source.
- The test Pages preview deployment for commit `9528a2bbaa007812867520dae1c96bf664606400` completed successfully.
- Latest GitHub Actions run #250 (`44489977689`) for commit `1c1c854e787a1a09ab8b339ed49b46b168764cae` passed all three jobs.
- The public homepage, membership route, account page, admin login shell, player page, and payment-result page rendered in a read-only browser smoke test without visible JavaScript errors.
- The latest public test preview serves the v2.0.4 admin page and its cache-busted ES module, including TUS video upload, the Free-plan 50 MB limit, and explicit drama/episode publish controls; no admin sign-in or write test was performed.
- The independent test preview resolves to the test Supabase project. No active plans, staff test account, published media, or payment methods are configured yet.

These checks do not constitute full end-to-end acceptance. The test database currently has no active membership/VPN plans, no staff test account, no published media asset, and no enabled payment methods. Authenticated admin workflows, two-user ownership/IDOR cases, media playback, and provider sandbox callbacks therefore remain unverified.

## Remaining test release gates

See the [test acceptance matrix](docs/test-acceptance-matrix.md) for verified checks and owner-controlled end-to-end blockers.

See [Test environment secret inventory](docs/test-environment-secrets.md) for the exact test-only Edge Function secret names and safe Dashboard configuration procedure. Secret values must never be committed or pasted into chat.

1. Configure only the required test-only Edge Function secrets directly in the Supabase test project dashboard.
2. Enable Supabase leaked-password protection in the test Auth settings.
3. Have the owner create/authorize a dedicated test staff account and a second ordinary test account; do not promote or create staff users automatically.
4. Upload a real, authorized test media asset and verify signed video/subtitle playback.
5. Configure Stripe test-mode products/prices and webhook secrets, then complete checkout, renewal/failure, refund, and dispute sandbox tests.
6. Configure Alipay/WeChat sandbox or merchant test credentials and verify signed callbacks and reconciliation before enabling either channel.

A clean-room database rebuild and all positive-path authorization tests must pass before considering a production release. Production deployment and PR merge require separate explicit authorization.

## Cloudflare Pages deployment

The site is static. Use the repository root as the publish directory and leave the build command empty. Validate the Preview deployment first. Do not attach or switch production domains during test validation.

## Local checks

Run the following checks from the repository root:

```bash
node --input-type=module --check < app.js
node --input-type=module --check < admin-v2.0.1.js
node --input-type=module --check < config.js
node --input-type=module --check < player.js
node --input-type=module --check < payment-result.js
node --input-type=module --check < account.js
python3 .github/scripts/validate_portal.py
python3 .github/scripts/validate_plan_checkout.py
python3 .github/scripts/validate_migrations.py
python3 .github/scripts/validate_database_types.py
python3 .github/scripts/validate_dom_contract.py
python3 .github/scripts/validate_admin_contract.py
python3 .github/scripts/validate_cn_payment_contract.py
python3 .github/scripts/validate_frontend_db_contract.py
python3 .github/scripts/validate_account_contract.py
python3 .github/scripts/validate_media_admin_contract.py
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
