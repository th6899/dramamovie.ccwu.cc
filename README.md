# CCWU Global Portal — source release 2.0.2

This repository contains the static frontend source recovered from the supplied CCWU Global v1.9.1 package, with a source-level QR picker accessibility/activation hardening and a visible build marker.

## Files
- `index.html`, `app.js`: public portal
- `admin.html`, `admin.js`: administration UI
- `player.html`, `player.js`: video player
- `payment-result.html`, `payment-result.js`: payment result page
- `styles.css`: shared styles
- `config.js`: Supabase project URL and publishable browser key

## Important deployment boundary
This repository is frontend source only. It does **not** include Supabase database migrations, Edge Functions, payment-provider secrets, webhook verification, or provider credentials. Do not treat Stripe, PayPal, Alipay, WeChat Pay, Binance Pay, or OKX Pay as live merely because a UI option exists. A real payment channel requires server-side order creation, signature verification/webhooks, idempotency, and reconciliation.

## QR picker
The QR controls are labels containing native `input[type=file]` elements. The file input is intentionally transparent and overlays the visible control; CSS explicitly keeps pointer events enabled on the input. The JS change handler validates PNG/JPEG/WebP and a 5 MB limit and previews the selected file. The existing save flow uploads to Supabase Storage bucket `ccwu-payment-qr` and persists paths in `manual_payment_settings` (the database schema and Storage policies must already exist).

## Configure
Edit `config.js` only with the Supabase project URL and a browser-safe publishable/anon key. Never put a service-role key or payment secret in frontend files.

## Local validation
Serve this directory over HTTP (ES modules do not work reliably from `file://`). Then open `/admin#payments` and inspect the browser console. Confirm the page footer says `Admin Build v2.0.2`. If the deployed footer shows another version, Cloudflare is serving a different artifact than this repository.

## Cloudflare Pages
This is a static site with no build command. The publish directory is the repository root. Connect the GitHub repository to the existing Pages project only after reviewing the branch and deployment environment. Use Preview first. Do not switch the production domain until the Preview artifact and backend flows have been verified.

## Scope / limitations
The original package did not contain the Supabase SQL migrations or backend functions. Those cannot safely be reconstructed from frontend code alone. Existing payment approvals must remain manual until server-side payment verification is implemented and tested.


## v2.0.2 admin login initialization hotfix

- `admin.html` now loads `admin-v2.0.1.js?v=2.0.2` with `type="module"`.
- The module imports `createClient` from `@supabase/supabase-js` and imports the public Supabase URL/key from `config.js`.
- The new entrypoint filename intentionally avoids reusing a potentially stale cached `admin.js`.
- On successful module evaluation, the browser console shows `[CCWU Admin] ES module 2.0.2 loaded` and `window.CCWU_ADMIN_MODULE_VERSION` is set to `2.0.2`.

Deploy the complete package contents together to an isolated test project first. Do not upload only the JavaScript file. Verify in DevTools Network that `admin.html`, `admin-v2.0.1.js`, and `config.js` all return HTTP 200, then hard-refresh. This package does not authorize or perform production deployment.


The v2.0.2 branch also corrects the malformed literal newline before the `createClient` import and updates the module cache-busting query so browsers request the corrected module. This remains a Preview-only candidate until Cloudflare deployment and browser login checks pass.
