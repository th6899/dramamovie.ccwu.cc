# CCWU Global Portal — Development Log

> Purpose: durable handoff record. Read this file before resuming work. Append a dated entry after each work session. Do not repeat completed investigations or changes unless new evidence shows a regression.

## Project identity and safety boundaries

- Repository: `th6899/dramamovie.ccwu.cc`
- Active development branch: `fix/portal-auth-errors-v2.0.3`
- Cloudflare Pages project: `ccwu-global-test`
- Test portal: `https://da9c92df.ccwu-global-test.pages.dev/`
- Test admin: `https://da9c92df.ccwu-global-test.pages.dev/admin.html`
- Production domain: `https://dramamovie.ccwu.cc/`
- Production Pages deployment URL previously observed: `https://a855be4d.ccwu-global-test.pages.dev`
- Test Supabase project ref: `uvtzhzgirgwjzsmcdgej`
- Production Supabase project ref: `zkvfsuhlcrafgdbyxevr`

Safety rules:
- Keep test and production environments separate.
- Do not modify production data, production authentication, DNS, or live payment settings without explicit authorization.
- User only accepts free solutions; do not introduce paid services.
- Keep merchant/payment wallet address fields blank until the user supplies the real address.
- Never publish placeholder, fabricated, or unauthorized media/catalog content.
- Do not ask the user to repeat already completed Cloudflare/GitHub authorization steps.
- Never ask for passwords, API tokens, or other secrets in chat.

## 2026-11-20 — Session checkpoint

### Confirmed completed

1. **Administrator access restored (user-confirmed):** the user reports that both login methods/accounts can now enter the admin backend. Treat this as resolved. Do not repeat role grants, password resets, OAuth setup, or login troubleshooting unless the user reports a new failure.
2. **Test database role repair:** the GitHub-linked identity `18129290870@163.com` was missing a `private.user_roles` admin row in the test project; an `admin` role was inserted for its existing auth user. The user later confirmed both accounts can enter the backend.
3. **Role verification:** both `tianhon027@gmail.com` and `18129290870@163.com` were found to have `admin` role rows in the test project. The production project also had an admin role for `tianhon027@gmail.com`; the production `is_staff()` check was verified true under a simulated user claim. No production role was modified.
4. **Admin public-catalog readiness code:** the development branch contains a dashboard readiness check for published dramas, episodes, service catalog, membership plans, VPN plans, and tutorials.
5. **CI regression guard:** `.github/scripts/validate_admin_contract.py` was added to check the catalog readiness element, six query contracts, exact head counts, and the no-placeholder publishing warning.
6. **CI:** the run associated with commit `ca0039d354040ebe0b91eff27d7a7e800b2d8ef7` completed successfully for Edge Function type checks, migration integrity, and frontend syntax/deployment isolation.
7. **Cloudflare preview deployment:** user-provided dashboard screenshots showed successful Preview deployments on the development branch, including a deployment at commit prefix `89bd068`. Its deployment URL was `https://da9c92df.ccwu-global-test.pages.dev`.

### Current known state / outstanding validation

- User's latest confirmation: both accounts can now enter the admin backend. This supersedes earlier login failure reports.
- The test database currently has zero published/active rows in each of these six public catalog categories: dramas, episodes, service_catalog, membership_plans, vpn_plans, tutorials. These are empty content tables, not evidence of a frontend crash.
- The test site previously showed a monthly membership card priced at ¥19.90 in CNY on the public homepage; confirm whether this is live seeded content or static fallback before changing it.
- Need perform an authenticated admin workflow acceptance test: create/edit/save/publish using safe test data only, verify front-end visibility, then remove test-only data if appropriate. Do not invent real media, service listings, or payment addresses.
- Verify that the catalog-readiness UI is actually present in the currently deployed admin build after successful login; earlier anonymous inspection could only see the login page and therefore did not verify the authenticated dashboard.
- Check membership pricing supports CNY and USD and that admin-entered values render correctly.
- Check VPN plan management and the remaining content-management sections.
- Do not deploy to production as part of these checks.

### Latest known code/deployment references

- Last specifically confirmed code commit: `ca0039d354040ebe0b91eff27d7a7e800b2d8ef7` (admin catalog-readiness CI guard).
- Later user screenshot showed a successful preview deployment at commit prefix `89bd068` with URL `https://da9c92df.ccwu-global-test.pages.dev`.
- Dashboard build title observed: `CCWU Global 管理后台 v2.0.7`.
- The exact current branch HEAD should be checked before making the next code change; do not assume the old SHA is still HEAD.

## Required daily handoff format

For every work session, append a dated section containing:
1. Starting branch and HEAD commit.
2. Files/database/services changed (or explicitly “none”).
3. Exact tests run and pass/fail outcomes.
4. Deployment URL, deployment commit, and status (or “not deployed”).
5. Completed items and outstanding items.
6. Any user action required, with one precise instruction only when unavoidable.

Before each new session, read this log and inspect the current branch HEAD and latest deployment before editing. Avoid redoing work listed under “Confirmed completed.”


## 2026-11-20 — Continued development checkpoint

### Starting state and verification
- Starting branch: `fix/portal-auth-errors-v2.0.3`
- Starting HEAD: `c49c4afac2a42d7273805c77c7bb32c7b9621b25`
- Production/main HEAD observed: `64ff5a7ec97c7e5f9aa9a24f42f6526cfe441bcc` (read-only; unchanged).
- GitHub Actions run `44706929888` completed successfully for this HEAD. All three jobs passed:
  - Frontend syntax and deployment isolation (including plan checkout, database types, DOM contracts, admin, CNY QR recovery, media publishing, playback security, payment/RPC/security guards).
  - Supabase Edge Function type checks.
  - Migration source integrity.
- A duplicate CI run `44706920485` also completed successfully.
- Current admin source is `admin.html` v2.0.7 and loads `admin-v2.0.1.js?v=2.0.7`.
- Current source includes the six-category public catalog readiness check and calls it from `loadAll()`.
- Membership and VPN admin forms both offer USD and CNY; USD requires a Stripe Price ID, CNY does not. Both default to inactive drafts; staff must explicitly activate.
- Public homepage formats both CNY and USD plan prices from each row's stored currency.
- No source code, database, production settings, or payment configuration was changed during this checkpoint.
- Deployment of documentation-only HEAD `c49c4af` was not independently confirmed in Cloudflare; do not claim it is deployed.

### User-confirmed status
- User confirmed both the GitHub login and administrator-email login can now enter the admin backend. Authentication troubleshooting remains closed unless a new failure is reported.

### Remaining release gates (high-level, not artificial micro-step count)
1. Authenticated functional acceptance of admin create/edit/save/publish workflows, including catalog readiness, plan management, media publishing, and front-end visibility. Avoid test data that resembles real content; use clearly labelled temporary records only if needed and clean them up.
2. Owner-supplied real catalog and commercial configuration: approved service/plan descriptions and prices, authorized media assets, and real wallet/payment details when available. Do not fabricate these.
3. Final test deployment verification and production release only after explicit user approval; keep production unchanged meanwhile.

### Next action
- Continue authenticated acceptance checks using the user's already-established admin session if available. If the session is not accessible to the assistant, continue static/source and database contract validation without asking the user to repeat login setup. Ask for user action only for the exact browser-only acceptance interaction that cannot be performed remotely.


## 2026-11-20 — Admin catalog modules added

- Starting HEAD: `be1ead142f742a7e87e5e8909cd20964c9d1f8a6`.
- Added a Digital Services Catalog admin section to `admin.html`: create service drafts, list entries, publish/unpublish.
- Added a Tutorials admin section: create tutorial drafts with Markdown body, summary, category and optional resource path; list entries and publish/unpublish.
- Updated `admin-v2.0.1.js` with database insert/list/toggle handlers for `service_catalog` and `tutorials`; successful saves refresh the tables and six-category readiness monitor.
- Both modules default to draft/unpublished. No placeholder content was created. No database rows, production resources, payment settings, or deployment settings were modified.
- New commit(s): HTML `888b008ec4fb488cc5b0f25a87ae5f29c7208aac`; JS `37cf4f1122313acbc584db014e9eed4f97eabe3c`. Current branch HEAD verified as `37cf4f1122313acbc584db014e9eed4f97eabe3c`.
- Static DOM contract check: PASS; every JS-referenced element ID exists in HTML. New service/tutorial forms and table bindings confirmed.
- GitHub Actions run `44707523484`: frontend syntax and deployment isolation job completed its checks successfully, including browser JavaScript syntax, HTML/JS DOM contracts, admin auth/settings, content publishing, database/RPC contracts and payment security. At checkpoint time remaining jobs were still running; do not mark the entire workflow passed until run conclusion is success.
- Run URL: https://github.com/th6899/dramamovie.ccwu.cc/actions/runs/44707523484
- Not deployed to Cloudflare yet; no deployment claim.
- Next: confirm all CI jobs finish successfully, then verify preview deployment includes the new sections. Authenticated browser create/save/publish still needs a real signed-in browser session; do not seed invented records.


## 2026-11-20 — Catalog handler hardening and CI/deployment review

- Starting HEAD: `e0a44353b88923f83cfa55e48f27cd6b7dda9cac`.
- Verified latest workflow run `44707580523`: all three jobs completed successfully (frontend/deployment isolation, Supabase Edge Function type checks, migration integrity). PR-triggered duplicate run `44707589275` also succeeded.
- Reviewed the latest source and confirmed `.github/workflows/ci.yml` is validation-only; it contains no Cloudflare Pages deployment job. README confirms the Pages project uses the repository root, an empty build command and output directory `.`, while the existing Cloudflare API token is read-only. No deployment was triggered and no production resource was touched.
- Hardened `admin-v2.0.1.js` catalog form handlers: shared draft-submit path now disables submit while saving, catches thrown/network errors, restores the button in `finally`, and only resets after a successful insert. Service/tutorial publish toggles now guard duplicate clicks, catch update/reload errors and always restore button state. Draft defaults and explicit publishing semantics are unchanged.
- New commit: `fe5437b95cf894a070029180b1e73585f3690526`.
- CI run for this exact commit: `44708204399`, queued at checkpoint; do not mark as passed until all jobs complete successfully.
- Cloudflare Preview remains unverified/stale. The previously inspected immutable Preview URL does not prove the latest branch HEAD is deployed. No deployment URL or commit is claimed.
- No database rows, production data, payment settings, secrets, DNS, or Cloudflare configuration were changed.
- Remaining owner-controlled gates: Cloudflare dashboard deployment provenance/retry (read-only token cannot perform it), test Auth leaked-password protection, authorized media/test provider inputs, and final signed-in functional acceptance. Do not repeat completed authentication repairs.


## 2026-11-20 — Catalog workflow regression coverage

- Starting HEAD: `7185aaff269b8b5cd464896186acdb3d2080ef48`; latest development-log CI run `44708246189` completed successfully with all three jobs passing.
- Reviewed `admin-v2.0.1.js`, `admin.html`, and the existing admin contract validator. Confirmed the new service/tutorial forms are loaded through `loadAll()`, start as unpublished drafts, and refresh readiness after successful mutations.
- Extended `.github/scripts/validate_admin_contract.py` with regression checks for service/tutorial form and table wiring, draft-only inserts, save error handling and button restoration, duplicate publish-click protection, and readiness refresh after mutations.
- Validator change commit: `4d74c0fb3908fc700678c3909fc85e04d9881226`. CI for this commit was not yet confirmed at the time of this entry.
- No app data, database rows, payment configuration, production settings, Cloudflare settings, secrets, or DNS were changed. Preview deployment provenance remains blocked pending read-only dashboard confirmation / owner action.
