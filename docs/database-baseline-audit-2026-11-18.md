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

Mitigation was applied only to the CCWU-Drama test database in migration `prevent_profile_role_self_escalation` and committed as `supabase/migrations/20261118130000_prevent_profile_role_self_escalation.sql`:
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

A second test-only migration, `portal_schema_compatibility_columns`, was applied to CCWU-Drama and committed as `supabase/migrations/20261118140000_portal_schema_compatibility_columns.sql`.

It preserves the existing test-specific fields and adds portal-compatible fields to the five shared tables. Existing drama title text is backfilled from the Chinese title (or English title fallback); the poster path is copied only when a poster URL exists. Membership pricing is mapped from minor units to major units, and the monthly/yearly interval is mapped to 30/365 days. No production records were copied.

Post-migration checks confirmed the expected new columns and constraints are present. The existing drama row now has a non-null title. The test membership-plans table was empty at migration time, so no plan rows or Stripe price IDs were created. `episodes.video_path` and `subtitle_tracks.storage_path` were deliberately left NULL because a provider asset ID or arbitrary file URL cannot safely be assumed to be a Supabase Storage path.

This is only a compatibility layer; missing public/private tables, RPCs, triggers, grants, Edge Functions and storage dependencies still need to be reconstructed.


## Test SECURITY DEFINER RPC exposure hardening

The test-project security advisor initially reported that the two auth-trigger functions and `is_ccwu_admin()` were executable by anon and authenticated users. A test-only migration, `restrict_test_security_definer_rpcs`, was applied and committed as `supabase/migrations/20261118160000_restrict_test_security_definer_rpcs.sql`.

- Revoked RPC execution on `handle_new_user()` and `handle_new_ccwu_profile()` from PUBLIC, anon, authenticated and service_role. They remain trigger-only.
- Restricted `is_ccwu_admin()` to authenticated/service_role. Authenticated execution is still needed by the admin-only RLS policies and the `is_staff()` compatibility RPC.
- Removed calls to the admin helper from anon-facing published-content read policies. Authenticated admins retain full access through the separate admin-management policies.
- Re-ran the Supabase security advisor: the anon-executable SECURITY DEFINER findings are gone. One warning remains for authenticated execution of `is_ccwu_admin()`, which is intentional for admin RLS evaluation. Leaked-password protection remains disabled and requires an Auth dashboard setting change.
