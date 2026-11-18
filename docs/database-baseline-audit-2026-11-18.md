# CCWU database baseline audit

Date: 2026-11-18

## Scope and safety boundary

This is a catalog-only comparison of the CCWU-Global production project (`zkvfsuhlcrafgdbyxevr`) and the CCWU-Drama test project (`uvtzhzgirgwjzsmcdgej`). No row data was copied. No DDL was applied to either database during this audit.

The test database password reset restored SQL connectivity. Both projects remain on their existing Free project setup; no paid branch or Pro upgrade was used.

## Catalog summary

| Catalog item | CCWU-Global production | CCWU-Drama test |
|---|---:|---:|
| Public base tables | 23 | 9 |
| Private base tables | 28 | 0 |
| Public RPC functions | 50+ | 3 |
| Public/private functions (catalog total) | 73 | Not yet fully inventoried |
| Non-internal triggers (public/private) | 11 | Not yet fully inventoried |
| RLS policies (public/private) | 87 | Not yet fully inventoried |
| Extensions | pg_cron, pg_stat_statements, pgcrypto, plpgsql, supabase_vault, uuid-ossp | Not yet fully inventoried |
| Deployed Edge Functions | 27+ | 0 |

Production public tables:
`ai_tool_catalog`, `crypto_wallet_addresses`, `dramas`, `episode_promotions`, `episode_watch_progress`, `episodes`, `manual_payment_settings`, `manual_payment_submissions`, `membership_plans`, `membership_subscriptions`, `payment_methods`, `profiles`, `refund_requests`, `service_catalog`, `service_orders`, `subtitle_tracks`, `tutorials`, `user_notifications`, `video_ad_configs`, `vpn_access_configs`, `vpn_device_bindings`, `vpn_plans`, `vpn_subscriptions`.

Test public tables:
`dramas`, `email_service_orders`, `email_service_products`, `episodes`, `homepage_sections`, `membership_plans`, `profiles`, `site_settings`, `subtitle_tracks`.

The test project has no private base tables. It is not a structurally equivalent test replica.

## Important incompatible shared tables

The five shared table names are not schema-compatible:

- `dramas`: production uses `title` and `poster_path`; test uses `title_zh`, `title_en`, and `poster_url`. Test `slug` is nullable while production requires it.
- `episodes`: production has `season_number` and `video_path`; test uses `video_provider` and `video_asset_id`. Test title nullability and default values differ.
- `membership_plans`: production uses `price_amount`, `duration_days`, `code`, `is_active`, `stripe_price_id`, and `billing_interval`; test uses `amount_minor`, `interval`, `provider_price_id`, and `is_enabled`. Currency and pricing units must be mapped deliberately.
- `profiles`: production uses `display_name`; test has `role` and `username` and does not have the production display-name field.
- `subtitle_tracks`: production uses `storage_path`; test uses `file_url`, `status`, and `reviewed_by`.

These are semantic differences, not just missing columns. A blind `CREATE TABLE IF NOT EXISTS`, rename, or copy would leave the application with inconsistent assumptions and could lose existing test content.

## Safe reconstruction sequence

1. Preserve all existing test tables and rows. Do not reset or drop the test database.
2. Inventory every production table's columns, constraints, indexes, grants, RLS flags and policies in bounded per-table batches.
3. Inventory required enums/domains, extensions, functions, triggers and storage dependencies.
4. Create a reviewed additive compatibility migration for shared tables. Any ambiguous content mapping (for example, video asset IDs versus storage paths, or billing intervals versus fixed duration days) must remain unmapped until its runtime semantics are confirmed.
5. Create missing public tables and private ledgers in foreign-key dependency order, without production rows or secrets.
6. Port only required functions and triggers after reviewing their full definitions and security properties.
7. Recreate least-privilege grants and RLS policies; do not copy production user identities, payment records, API credentials, or VPN configurations.
8. Deploy test-only Edge Functions and configure test secrets through Supabase Edge Function secrets.
9. Verify schema parity, RLS/advisors, RPC signatures, Edge Function status and end-to-end test-mode payment lifecycles.

## Explicitly deferred

- No production database writes or policy changes.
- No application of the Stripe RPC, grace-period or RLS migrations to either database.
- No live payment, provider enablement, domain change or production deployment.
- No paid Supabase plan, paid branch, read replica or new paid resource.

## Current blocker

The repository has no authoritative full-history Supabase migration baseline. The production catalog is therefore the current reference for schema extraction, but it must be converted into reviewed, deterministic migrations before any test schema changes are applied.


## Existing test-project RLS baseline

All nine existing public test tables currently have RLS enabled. The catalog lists 17 policies:
- `dramas`, `episodes`, `homepage_sections`, `membership_plans`, and `subtitle_tracks` each have admin-management and public-read policies.
- `profiles` has own-row insert/update/read policies plus an admin-read policy.
- `email_service_orders` has an owner-only SELECT policy.
- `email_service_products` has a public SELECT policy restricted to active products.
- `site_settings` has an admin-management policy.

This is a useful baseline but not yet a security sign-off. The referenced `is_ccwu_admin()` function, grants, and policy dependencies still need review. The test policies must be preserved and reconciled rather than blindly overwritten by production policy definitions.


## Test-project authorization finding and mitigation

A review of the test project's `profiles` policies and grants found a privilege-escalation path: authenticated users had table-level INSERT and UPDATE on `profiles`, while the own-row policies allowed them to write their own row. Since `is_ccwu_admin()` derives admin status from `profiles.role = 'admin'`, a user could potentially self-assign the admin role.

Mitigation was applied only to the CCWU-Drama test database in migration `prevent_profile_role_self_escalation` and committed as `supabase/migrations/20261118093537_prevent_profile_role_self_escalation.sql`:
- Revoke table-level INSERT and UPDATE from `anon` and `authenticated`.
- Grant authenticated users column-level INSERT only on `id, username, avatar_url`.
- Grant authenticated users column-level UPDATE only on `username, avatar_url`.
- Leave privileged role changes to trusted database/service-role administration. The existing auth-user trigger creates profiles with the default `viewer` role.

Post-migration catalog verification confirms:
- `authenticated` has no table-level INSERT or UPDATE.
- `authenticated` cannot INSERT or UPDATE `role`.
- `authenticated` retains INSERT on `id, username, avatar_url` and UPDATE on `username, avatar_url`.
- `anon` has no INSERT/UPDATE rights.
- `postgres` and `service_role` retain their existing privileged access.

This closes the direct self-service role-write route in the test project. The same grant/policy pattern must be audited in production separately; no production change was made.


## Additive portal compatibility migration applied to test

A second test-only migration, `portal_schema_compatibility_columns`, was applied to CCWU-Drama and committed as `supabase/migrations/20261118093725_portal_schema_compatibility_columns.sql`.

It preserves the existing test-specific fields and adds portal-compatible fields to the five shared tables. Existing drama title text is backfilled from the Chinese title (or English title fallback); the poster path is copied only when a poster URL exists. Membership pricing is mapped from minor units to major units, and the monthly/yearly interval is mapped to 30/365 days. No production records were copied.

Post-migration checks confirmed the expected new columns and constraints are present. The existing drama row now has a non-null title. The test membership-plans table was empty at migration time, so no plan rows or Stripe price IDs were created. `episodes.video_path` and `subtitle_tracks.storage_path` were deliberately left NULL because a provider asset ID or arbitrary file URL cannot safely be assumed to be a Supabase Storage path.

This is only a compatibility layer; missing public/private tables, RPCs, triggers, grants, Edge Functions and storage dependencies still need to be reconstructed.


## Test SECURITY DEFINER RPC exposure hardening

The test-project security advisor initially reported that the two auth-trigger functions and `is_ccwu_admin()` were executable by anon and authenticated users. A test-only migration, `restrict_test_security_definer_rpcs`, was applied and committed as `supabase/migrations/20261118093900_restrict_test_security_definer_rpcs.sql`.

- Revoked RPC execution on `handle_new_user()` and `handle_new_ccwu_profile()` from PUBLIC, anon, authenticated and service_role. They remain trigger-only.
- Restricted `is_ccwu_admin()` to authenticated/service_role. Authenticated execution is still needed by the admin-only RLS policies and the `is_staff()` compatibility RPC.
- Removed calls to the admin helper from anon-facing published-content read policies. Authenticated admins retain full access through the separate admin-management policies.
- Re-ran the Supabase security advisor: the anon-executable SECURITY DEFINER findings are gone. One warning remains for authenticated execution of `is_ccwu_admin()`, which is intentional for admin RLS evaluation. Leaked-password protection remains disabled and requires an Auth dashboard setting change.


## Migration-history alignment

The four test-only migrations were applied through Supabase's migration tool. Their committed filenames have been aligned to the exact versions recorded in the CCWU-Drama migration history (`20261118093537`, `20261118093725`, `20261118093813`, `20261118093900`). This avoids duplicate re-application of those four changes by the CLI.

Do not run a blanket `supabase db push` from this branch yet: the older Stripe RPC, grace-period and provider-ledger RLS migrations are intentionally staged source-only and depend on the full production schema baseline, which is not present in CCWU-Drama. They must not be applied ahead of that baseline.


## Production SECURITY DEFINER review

The production security advisor reports 22 public SECURITY DEFINER RPCs executable by `authenticated`. A catalog/source review of all 22 definitions found:
- All 13 `admin_*` functions and the manual-payment approval/admin billing functions contain explicit authenticated admin-role checks (via `private.user_roles` or `public.current_staff_role()`).
- Customer-facing order creation functions require `auth.uid()` and derive the order owner from that identity rather than accepting a caller-supplied owner.
- Customer billing/order lookup functions scope records to the current user's identity.
- Refund submission locks and verifies an order belonging to `auth.uid()`, then derives the payment transaction from that order.
- The inspected definitions use an empty search_path.

This static review did not find a missing top-level authentication/authorization check among the 22 functions. It does not replace role-based integration tests, and the advisor warning remains because the functions are intentionally callable through RPC by authenticated users. No production permissions or function definitions were changed.

The test project's remaining authenticated `is_ccwu_admin()` advisor warning is also intentional for its authenticated admin policies; anon execution has been revoked. Leaked-password protection is an Auth dashboard setting and remains disabled pending configuration.


## Follow-up test reconstruction status — 2026-11-18

The catalog counts in the opening section describe the initial state before reconstruction. Current CCWU-Drama test state: 27 public tables, 28 private tables, 34 public/private functions, and 12 non-internal triggers. CCWU-Global production remains unchanged.

### Verified parity for the portal/payment surface

- All 244 production public-table columns are present in test with matching data types, nullability and defaults. Test retains additional legacy/test-only columns and tables; these were not removed.
- All 86 production public RLS policies match in test field-by-field (roles, commands, USING and WITH CHECK expressions). Eight additional policies remain for test-only tables.
- The 141 columns across the payment, provider-subscription, webhook and Stripe invoice ledgers match production in type, nullability and defaults.
- Relevant payment/invoice constraints and indexes were compared. Missing amount/status/provider checks, foreign keys, unique keys and idempotency/performance indexes were added. Remaining name differences are semantically equivalent test-only duplicates.
- Provider subscription ledgers have RLS enabled and no direct table grants to anon, authenticated or service_role; trusted operations use reviewed SECURITY DEFINER RPCs.
- Payment orders, payment transactions, payment/refund/dispute ledgers, provider-subscription ledgers, invoice ledgers, notifications and delivery queues remain empty. No production rows or credentials were copied.

### Stripe and payment RPC reconstruction

- Rebuilt the private CNY payment-success handler, Stripe subscription-event handlers, payment-entitlement synchronization, CNY expiry trigger, business-notification triggers and Stripe webhook-event mirror.
- Restored the public Stripe Checkout/order, subscription mapping, invoice, refund and dispute RPCs required by the deployed production webhook code.
- The public create_stripe_subscription_order RPC is callable by authenticated users and derives the owner from auth.uid(); it validates USD-only plans, active status, amount, duration and Stripe recurring Price ID. Provider event handlers and checkout state transitions are restricted to service_role; anonymous execution is denied.
- Applied Stripe invoice grace-period synchronization to the test project. A follow-up guard prevents a late invoice.paid event from reactivating a provider subscription already marked canceled or expired.
- The legacy public admin helper is now a SECURITY INVOKER wrapper over a private SECURITY DEFINER role check; the old public SECURITY DEFINER warning has been removed.

### Security and deployment boundary

- Security advisor currently reports 27 private tables with RLS enabled and no policies (INFO; direct client access is denied), one intentional authenticated SECURITY DEFINER warning for the user-facing order-creation RPC, and disabled leaked-password protection. Enable leaked-password protection in the Supabase Auth dashboard before production release.
- The test project still has zero deployed Edge Functions. Production Edge Function source has been inspected, but no production or test Edge Function was deployed in this round.
- No Stripe secrets, webhook secrets, Alipay/WeChat credentials, live payments, production writes, production deployments, paid Supabase resources or paid branches were used.

### Migration-source status

- The CCWU-Drama migration history now contains 37 applied migrations, and the branch contains a matching SQL source file for all 37 versions.
- The 17 early migration files (20261118105215 through 20261118111258) were reconstructed from the current test database catalog and object definitions to restore a complete migration history. Their source versions are committed, but a clean-room rebuild on a separate project has not yet been run; treat that as the next verification gate.
- No source-only migration remains in the branch. Do not run a production migration push, merge this PR, or deploy production until the reconstructed migration chain is validated on a disposable free test environment, test Edge Functions are deployed with test-only secrets, and authenticated checkout/webhook lifecycle tests pass.

## Additional payment and deployment findings — 2026-11-18

### Native CNY QR payment

- Restored the production CNY payment RPC surface in test: `create_cn_payment_order`, `attach_cn_payment_session`, `get_my_cn_payment_order`, `process_cn_payment_success`, and `record_cn_payment_reconciliation`.
- Extended the test `get_my_cn_payment_order` result to return the stored QR code and provider session ID so a customer can recover a pending payment after refreshing.
- Seeded two test-only payment method rows: Alipay/CNY/test and WeChat Pay/CNY/test. Both are disabled; no credentials were copied.
- Added and deployed test Edge Function `cn-payment`. It creates authenticated CNY orders, signs Alipay RSA2 sandbox requests, verifies Alipay response/notification signatures, verifies WeChat Pay API v3 RSA-SHA256 response/callback signatures, decrypts callback resources with AES-256-GCM, and calls the idempotent settlement RPC.
- The function generates QR SVG on the server; payment tokens are not sent to a third-party QR service.
- Alipay production gateway use requires the explicit `ALIPAY_LIVE_PAYMENTS_ENABLED=true` gate. WeChat API v3 Native has no independent zero-funds sandbox in this integration; test environment calls are rejected. Live WeChat Native requires `WECHATPAY_LIVE_PAYMENTS_ENABLED=true`.
- Added a staff-only payment-secret readiness response and admin controls. These expose only boolean readiness, never secret values.
- No payment method is enabled and no payment credentials were configured or tested. No payment was created or settled.

### Test/production site separation

- Browser inspection of the existing `ccwu-global-test.pages.dev` deployment showed a ¥19.90 membership plan, while the CCWU-Drama test database currently has zero membership plans. The branch preview URL returned “Nothing is here yet”. This is evidence that the existing Pages deployment is stale or still points at production data; no sign-in, order, or payment action was performed.
- The repository's prior `config.js` hard-coded the CCWU-Global production Supabase project. The branch now selects CCWU-Drama test Supabase for `*.ccwu-global-test.pages.dev` and local development, selects CCWU-Global production only for the known production hostnames, and fails closed on unknown hostnames.
- Do not use the currently deployed `ccwu-global-test.pages.dev` page for testing until Cloudflare Pages has deployed this branch and its runtime config has been verified against the test project.
- TinyFish's saved browser profile is signed in to GitHub only, not Cloudflare. Cloudflare dashboard settings were not changed.

### Current verification boundary

- Current test migration history: 42 applied versions, with 42 matching migration SQL files in the branch; no missing or extra migration files.
- Current test Edge Functions: `create-checkout`, `stripe-webhook`, `get-episode-playback`, and `cn-payment`.
- Test payment methods remain disabled; test membership_plans and vpn_plans remain empty. The test project has one Auth user, no staff-role rows, and that user is not an admin. The admin payment approval workflow therefore remains correctly inaccessible to that account.
- No Alipay sandbox checkout, WeChat payment, callback, refund, or end-to-end entitlement test has been run.
- The 17 reconstructed early migration files still require a clean-room rebuild on a disposable free test environment. Do not reset the current test database to attempt this; it contains existing test content.
