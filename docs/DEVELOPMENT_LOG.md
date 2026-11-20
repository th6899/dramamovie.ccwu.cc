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


## 2026-11-20 — CI completion and release-boundary audit

- Starting branch: `fix/portal-auth-errors-v2.0.3`; starting HEAD: `21f8971718a25ed7574c9db6936152288dfd2e2a`.
- Rechecked GitHub Actions run `44708464977` against the exact HEAD. **All three jobs completed successfully**:
  - Frontend syntax and deployment isolation: PASS. This included browser JS syntax, deployment-host isolation/public-bundle secret checks, plan/Stripe contracts, generated database types, DOM contracts, admin auth/settings, CNY QR recovery, account ownership, media publishing, playback/private storage, financial write/RPC guards, payment proof storage, payment Edge Function security, ad tracking, and owner-scoped RLS contracts.
  - Supabase Edge Function type checks: PASS.
  - Migration source integrity: PASS.
- Confirmed the active development branch still points to `21f8971718a25ed7574c9db6936152288dfd2e2a`; no code changes were needed after the successful run.
- Inspected open draft PR #2. It remains open, draft, and unmerged; its base is `fix/admin-esm-import-v2.0.2`, not `main`. Do not merge or retarget it automatically. This is a release-boundary issue requiring deliberate review; production remains untouched.
- Deployment provenance: **not verified**. The current GitHub workflow is validation-only and does not deploy Cloudflare Pages. The previously inspected Pages URL is immutable and cannot prove this HEAD is live. No new deployment URL or deployment commit is claimed.
- Files changed in this checkpoint: `docs/DEVELOPMENT_LOG.md` only. No application code, database rows, Supabase settings, payment configuration, Cloudflare settings, DNS, or production resources changed.
- Remaining gates: (1) verify Cloudflare Preview's actual deployed commit and test-project binding; (2) authenticated browser acceptance of admin save/publish workflows; (3) owner-controlled test Auth leaked-password protection and real sandbox/provider inputs; (4) review PR base/diff before any merge; (5) production release only after explicit approval.
- User action is not required for this CI verification checkpoint. If Cloudflare deployment provenance cannot be read through existing authorized access, the one necessary browser action is to open the latest successful Preview deployment in the already-authorized Cloudflare dashboard and provide its commit SHA plus deployment URL. Do not repeat API authorization.


## 2026-11-20 — Test-project security advisor review

- Starting HEAD: `ef3220e03bc36dcc9b503d2bf9ceadefec31b26a`; test Supabase project `uvtzhzgirgwjzsmcdgej` reports `ACTIVE_HEALTHY`.
- Ran Supabase Security Advisor (read-only). Findings:
  - Leaked-password protection is disabled (one Auth warning). This remains an owner-controlled Auth dashboard setting; no Auth configuration was changed.
  - Five exposed `SECURITY DEFINER` RPCs are executable by the authenticated role: `approve_manual_payment`, `create_cn_payment_order`, `create_manual_payment_order`, `create_stripe_subscription_order_idempotent`, and `get_my_cn_payment_order`. These may be intentional authenticated workflows, but must be checked against function bodies, internal authorization checks, and explicit grants before any permission changes. No grants were modified.
  - Twenty-seven private-schema tables have RLS enabled with no policies. This is consistent with a deny-by-default private schema only if API exposure and grants are also constrained; retain as review items, not automatic errors.
- No source, SQL, database rows, Auth settings, payment settings, or production resources changed during this audit.
- CI for documentation commit `ef3220e03bc36dcc9b503d2bf9ceadefec31b26a`: run `44709007459` completed successfully.
- Remaining security work: inspect the five RPC definitions and grants, verify private schema exposure/grants, and have leaked-password protection enabled in the test Auth settings. Do not change financial RPC grants without positive-path/negative-path regression coverage.


## 2026-11-20 — Cloudflare Preview provenance and latest CI verified

- Starting branch HEAD: `f55a4cf91224acdbdf6fa44f2479efe19d1a62ff` (`docs: record test auth security advisor findings`). Cloudflare dashboard screenshot confirms the latest successful Preview deployment is exactly `f55a4cf`, URL `https://616e6e6b.ccwu-global-test.pages.dev/`; Preview auto-deploy is enabled.
- GitHub branch listing independently confirms `fix/portal-auth-errors-v2.0.3` points to the same full SHA. Production remains on `main` at `64ff5a7ec97c7e5f9aa9a24f42f6526cfe441bcc`; no production deployment was initiated.
- GitHub Actions run `44709100260` for exact HEAD `f55a4cf` completed successfully: Frontend syntax and deployment isolation, Supabase Edge Function type checks, and Migration source integrity all passed. PR validation run `44709107059` also passed.
- Draft PR #2 remains open/unmerged and targets `fix/admin-esm-import-v2.0.2`, not `main`. Do not merge, retarget, or release automatically.
- Next acceptance gate: verify the deployed Preview UI and authenticated admin catalog workflow on the test project. The user only needs to open the provided Preview URL and confirm the admin page loads with the Service Catalog and Tutorials sections; do not create or publish dummy content.
- Test Auth leaked-password protection remains disabled per the test-project Security Advisor and requires an owner-controlled dashboard setting. The five authenticated SECURITY DEFINER RPC grants and private-schema API exposure findings remain review-only; no grants or settings changed.
- No database rows, production resources, payment configuration, secrets, DNS, or Cloudflare configuration were changed.


## 2026-11-20 — Preview URL live smoke test blocked

- Starting HEAD: `b2618b7ef96b3d22ff71b56cba58431f8eb81795`; Cloudflare dashboard screenshot showed latest successful Preview commit `f55a4cf` at `https://616e6e6b.ccwu-global-test.pages.dev/`.
- Automated read-only browser smoke test of `/admin.html` on that exact URL returned Cloudflare Pages `Deployment Not Found` / `Nothing is here yet`, not the admin application. Service Catalog and Tutorials sections could not be inspected. A green deployment indicator therefore does not establish that this immutable deployment URL is serving content.
- No credentials were submitted and no data/configuration was changed. Do not ask the user to repeat API authorization or to create/publish catalog records.
- Next owner action, if required: in Cloudflare Pages > ccwu-global-test > Deployments, click **Details** on the top Preview row (`f55a4cf`) and inspect the deployment's canonical URL and build/deployment details. Share that Details view; do not redeploy or change settings. Meanwhile continue source-level checks and keep production untouched.


## 2026-11-20 — Corrected Preview URL and admin UI smoke test

- Correction to the previous smoke-test note: the URL first tested was mistyped by one character. The Cloudflare deployment details screenshot gives the exact URL as `https://61e6e8eb.ccwu-global-test.pages.dev/` (deployment ID `61e6e8eb-834a-4637-9da8-8638a49608b8`), commit `f55a4cf`. The earlier `Deployment Not Found` result applies only to the incorrect URL and is not evidence of a deployment failure.
- Read-only browser verification of the exact URL `https://61e6e8eb.ccwu-global-test.pages.dev/admin.html` succeeded. The admin login page loads, and both the Digital Services catalog and Tutorials management forms/list containers are present. The page was unauthenticated during this read-only check; no credentials were submitted and no data was changed.
- Cloudflare build log shows initialize, clone, build (skipped because no build command is configured), and deploy all succeeded; 136 files uploaded/published. This matches the static-site root-directory configuration.
- Next validation: use the user's already working authenticated session on the correct Preview host to verify the catalog sections render after login, then perform only safe read-only checks. No dummy records, publishing, production deployment, or production data changes.


## 2026-11-20 — Follow-up security and documentation reconciliation

- Read-only checks reconfirmed the test Supabase project is ACTIVE_HEALTHY and the test organization is on the Free plan. Health Advisor returned no lints.
- Security Advisor currently reports: 5 authenticated-executable public SECURITY DEFINER RPCs; 27 private-schema RLS-enabled/no-policy INFO notices; leaked-password protection disabled. Reviewed all five live function definitions and ACLs: `anon` cannot execute any; all use an empty `search_path`; authenticated calls require `auth.uid()`; `approve_manual_payment` additionally checks the admin role; order creation is tied to the caller and active plans; CN order recovery is owner-scoped. These grants were not changed. The 27 private-schema findings are deliberate default-deny ledgers/audit tables.
- Supabase's current Password Security docs state leaked-password protection is available on Pro Plan and above. Because the test organization is Free and the owner requires free services, this setting cannot be enabled on the current plan. No upgrade or paid action was initiated. Keep this as a documented security limitation/release decision, not an endlessly repeated dashboard task.
- Reconciled migration counts using both repository directory and live migration ledger: 75 source SQL migrations, 75 applied versions, latest `20261120064221_harden_profile_trigger_search_path`. README's stale 74-count/latest-version line was corrected.
- Updated `docs/test-acceptance-matrix.md` with the correct Preview deployment and free-plan limitation. Updated README Preview status: commit `f55a4cf`, deployment ID `61e6e8eb-834a-4637-9da8-8638a49608b8`, 136 files uploaded, exact hostname `https://61e6e8eb.ccwu-global-test.pages.dev/`; admin shell and both catalog modules confirmed by read-only browser check. Authenticated catalog loading/save/publish remains pending.
- CI run `44712280363` for `139f2f5` passed. Documentation updates at `77c027a`, `427edf4`, and `0f310bf` are validation-only; newest runs must be checked before marking documentation CI complete.
- No application code, database rows, grants, Auth settings, payment config, production resources, or Cloudflare settings were changed.
- Next: verify latest documentation CI; then complete authenticated Preview acceptance with the user's existing login session. Do not invent records or publish content. Production remains untouched.


## 2026-11-20 — Authenticated admin catalog read-only acceptance

- Used the already-connected browser tab for the exact Preview hostname `61e6e8eb.ccwu-global-test.pages.dev`. The existing test-admin session is authenticated as `tianhon027@gmail.com`; the admin overview reports database connection normal and refreshed data. The Digital Services and Tutorials forms and list tables are both rendered in the authenticated admin page.
- No credentials were requested or submitted; no form was saved, no publish toggle was clicked, and no records were modified.
- Live read-only test database counts: `service_catalog` 0 total / 0 published; `tutorials` 0 total / 0 published; `dramas` 1 total / 0 published; `episodes` 1 total / 0 published. Empty public catalog is intentional until real authorized material is supplied.
- CI run `44712672939` for prior HEAD `8c60fae` completed successfully: all three jobs passed (frontend syntax/deployment isolation, Edge Function type checks, migration source integrity).
- Acceptance matrix updated with authenticated UI read-only PASS and catalog empty-state snapshot. Next meaningful app-level acceptance requires an owner-provided real service/tutorial draft to test save/update/publish lifecycle; do not invent or seed fake content. Existing code contract checks already cover save error handling, duplicate-submit prevention, draft defaults, publish toggles, and readiness refresh.
- No code, database rows, Auth settings, grants, payments, Cloudflare settings, or production resources changed.


## 2026-11-20 — Faster security and CI closure

- Confirmed all CI checks for current code HEAD `c58a22c` completed successfully (run `44712828657`): frontend syntax/deployment isolation, Edge Function type checks, and migration source integrity.
- Completed read-only RLS/table privilege audit for six public catalog tables. RLS is enabled for all six. Anonymous has SELECT but no write grants; anonymous row policies expose only published/active rows. Episode visibility is further restricted to free published episodes whose parent drama is published. Authenticated writes are gated by staff-role policies. No database policy or grant changes were made.
- Added this audit result and successful CI status to the acceptance matrix. Remaining gates are now concentrated on authenticated mutation lifecycle with a real owner-provided draft and the documented Free-plan leaked-password protection limitation. No test data was fabricated, no payment or Auth configuration changed, and production remains untouched.


## 2026-11-20 — Catalog mutation feedback hardening

- Source review found a misleading error path: if an insert/update succeeded but the subsequent list/readiness refresh failed, the UI reported the entire mutation as failed. That could cause an administrator to retry and create a duplicate record or misinterpret a successful publish action.
- Updated `admin-v2.0.1.js`: draft save now reports successful persistence separately from a failed refresh; publish/unpublish now distinguishes successful status change from failed refresh. Mutation failures still report as failures, and submit/button states are restored in `finally`.
- Expanded `.github/scripts/validate_admin_contract.py` to assert both distinct refresh-failure messages.
- Commits: `24a7223` (save handling), `2a2b322` (publish handling), `d58fa13` and `0733bc2` (regression assertions). Latest application branch HEAD before this log entry: `0733bc2a18c9df588b2065c434955cf477c3ec07`.
- CI for latest code/validator commit `0733bc2` is queued as run `44713218077`; do not mark as passed until all three jobs finish.
- No database rows, production data, payment configuration, Auth settings, Cloudflare settings, or real content were changed. Preview still points to the previously verified deployment until a new successful Preview deployment is confirmed.


## 2026-11-20 — Current branch CI closure

- Verified latest branch HEAD `942efc12c54270f67497fd21fb6b84343fbfbb13`.
- GitHub Actions run `44713275646` completed successfully; all three required jobs passed: Frontend syntax and deployment isolation, Supabase Edge Function type checks, and Migration source integrity. Documentation validation run `44713267306` also passed.
- Application change in this batch: catalog insert/update success is now reported separately from a subsequent list/readiness refresh failure, preventing false failure messages and accidental duplicate retries. Regression assertions cover both save and publish refresh paths.
- Code/CI gate for current branch is green. Cloudflare's last directly verified deployment remains Preview commit `f55a4cf`; browser session became unavailable during this check, so deployment of later app-code commits is not claimed. The Pages auto-deploy setting was previously observed enabled; exact new deployment must still be confirmed in Cloudflare before live Preview acceptance.
- Production release remains intentionally blocked pending: (1) confirmation of latest Preview deployment and authenticated mutation acceptance; (2) owner-provided genuine, authorized catalog content to exercise real save/publish lifecycle; (3) explicit production release approval. Leaked-password protection is unavailable on the current Supabase Free plan and is documented as a known security limitation. No paid upgrade, fabricated content, production change, or payment configuration change was made.


## 2026-11-20 — Admin build 2.0.8 release identification

- Bumped the admin runtime build marker from `2.0.7` to `2.0.8`, and updated the `admin.html` module cache-busting query from `v=2.0.7` to `v=2.0.8`. This gives the next Preview deployment a definitive browser-visible build identifier and avoids confusing cached 2.0.7 assets with the current code.
- Updated `.github/scripts/validate_admin_contract.py` to enforce the matching build marker, `SOURCE_RELEASE.json` to release `2.0.8` and current 75-migration ledger count, and README release heading/description.
- Application code commits: `af8b5ec` (runtime marker), `362a07b` (HTML cache key). Validator: `ef124a2`. Release manifest: `59a65f0`. README: `466f2ca`.
- CI run `44714468108` for source release manifest commit `59a65f0` passed all three jobs: frontend syntax/deployment isolation, Supabase Edge Function type checks, and migration source integrity. README-only commit `466f2ca` has a queued follow-up CI run `44714514052`; do not label that later run passed until it completes.
- The latest confirmed Cloudflare deployment is still the earlier Preview at `f55a4cf`; the new 2.0.8 application commits are not yet confirmed deployed. No production changes, data writes, payment/Auth changes, or Cloudflare settings changes were made.


## 2026-11-20 — Final CI confirmation and deployment verification blocker

- Rechecked branch HEAD `bc692dacfbc6b8105f75b143b84946b72d1aa2d5` and Actions run `44714550816`: all three jobs completed successfully — frontend syntax/deployment isolation, Supabase Edge Function type checks, and migration source integrity. Follow-up application workflow run `44714564459` also completed successfully.
- Confirmed source build marker, admin HTML cache-busting key, and release manifest all consistently identify build `2.0.8`.
- Attempted one read-only Cloudflare dashboard deployment verification using the connected TinyFish browser profile. The run did not start because the external TinyFish wallet balance is `-$0.088`; this is a non-retryable provider billing limit. No payment/top-up was made because the project owner requires free services. No further retries will be made against this blocked service.
- Last directly verified Cloudflare Preview deployment remains commit `f55a4cf`; do not claim build 2.0.8 is deployed. The exact latest Preview deployment/URL must be confirmed through an available free Cloudflare dashboard session or by the owner viewing the Deployments list. No Cloudflare settings or deployments were changed.
- CI/code gate is complete and green. Remaining external release gate is deployment verification followed by authenticated end-to-end save/publish test using genuine authorized catalog content. Production remains untouched and requires explicit owner approval.


## 2026-11-20 — Cloudflare Preview deployment confirmed by owner screenshot

- Owner supplied the Cloudflare deployment-details screenshot for project `ccwu-global-test`.
- Screenshot confirms a successful Preview deployment: deployment ID `5ceec4ca-c487-4fff-8ea7-6a4792d9acca`; deployment URL `https://5ceec4ca.ccwu-global-test.pages.dev`; branch alias `fix-portal-auth-errors-v-2-0.ccwu-global-test.pages.dev`; status `success`; duration 11 seconds.
- Cloudflare's branch card truncates the displayed branch name (`fix/po...`). The build log shows checkout at full commit `bc8640bf8341a5cf6ee4a6174ae0be6ac6e8fd14`, matching the active development branch's latest documentation checkpoint commit `bc8640b`. This is direct evidence that the latest branch checkpoint was deployed to Preview.
- Build log confirms clone, validation/build stage, asset upload (136/136), and deploy all succeeded. Deployment alias is a Preview alias, not the production domain.
- The branch history includes the admin 2.0.8 runtime marker, HTML cache-busting key, validator, and release manifest updates. However, the screenshot itself does not expose the rendered runtime build marker; do not claim browser-level 2.0.8 verification until the deployed admin page visibly reports it.
- No production deployment, database mutation, Cloudflare setting change, payment/Auth change, or paid service was used.
- Next acceptance: open the exact Preview deployment URL, sign in with the already-working test admin session, and confirm the admin build marker reads 2.0.8. Then perform authenticated save/publish only with genuine owner-authorized catalog content; empty catalog remains intentional until such content is supplied.


## 2026-11-20 — Admin version label mismatch corrected

- Starting branch: `fix/portal-auth-errors-v2.0.3`; starting HEAD: `bc8640bf8341a5cf6ee4a6174ae0be6ac6e8fd14` plus the preceding deployment-verification log commit.
- Investigated owner report that Preview footer displayed `CCWU Global · Admin Build v2.0.7` despite the deployment being based on the current branch checkpoint.
- Root cause confirmed in source: `admin.html` title and footer still displayed 2.0.7; `admin-v2.0.1.js` module version constant, console banner, and header comment also displayed 2.0.7, while the actual runtime build marker and HTML cache-busting query were already 2.0.8.
- Corrected the admin HTML title/footer and JS module version/banner/comment to 2.0.8. Extended `.github/scripts/validate_admin_contract.py` to fail if the module marker, document title, or footer drifts from 2.0.8.
- Commits: `f5c8ac9` (admin HTML labels), `0197e8a` (module version labels), `46ae11f` (CI consistency assertions).
- GitHub Actions run `44721960491` for `46ae11f`: all three jobs completed successfully: frontend syntax/deployment isolation, Supabase Edge Function type checks, and migration source integrity. Workflow conclusion: SUCCESS (run `44721960491`).
- No database writes, Auth/payment changes, production changes, Cloudflare settings changes, or paid services. Cloudflare Preview auto-deploy after these correction commits has not yet been independently confirmed. Once CI passes, verify the new Preview deployment and the visible 2.0.8 footer; do not mistake the earlier `bc8640b` deployment for the later correction commits.


## 2026-11-20 — Post-fix CI verification

- Latest branch checkpoint at this check: `cf49b17178f86061b7bd84ff0d5b58a717a8436c`.
- GitHub Actions run `44722046291` completed successfully for that exact commit. All three jobs passed: frontend syntax/deployment isolation, Supabase Edge Function type checks, and migration source integrity.
- The admin version consistency regression assertions are included in the passing frontend validation.
- Cloudflare Preview for commits after the previously confirmed `bc8640b` deployment remains unverified. The connected browser tab still points at the earlier immutable deployment URL, and browser page-context retrieval failed due browser security context availability. No workaround, reauthorization, paid service, or production change was attempted.
- Next required external check: Cloudflare Pages `ccwu-global-test` Deployments must show a successful Preview built from commit `cf49b17` (or a later branch commit); then verify the served admin footer/title displays 2.0.8. Do not call the earlier `5ceec4ca` deployment proof of the post-fix code.


## 2026-11-20 — Owner confirmation of corrected Preview deployment

- Owner confirmed that the current Cloudflare `ccwu-global-test` Preview deployment includes commit `607b0e3`.
- This confirms the deployment contains the version-label correction commits `f5c8ac9` (admin HTML title/footer), `0197e8a` (JS module version), and `46ae11f` (CI consistency assertions), as well as the documentation checkpoint.
- Refreshed `docs/test-acceptance-matrix.md` to v2.0.8 and replaced stale deployment-blocker rows with the owner-confirmed Preview provenance. New matrix commit: `ebc0eb5`.
- CI passed for the code-fix commit `46ae11f` (run `44721960491`) and branch checkpoint `cf49b17` (run `44722046291`), all three jobs green.
- The remaining runtime check is the visible served admin marker/title after a hard refresh. Cloudflare Preview is confirmed; production remains untouched.


## 2026-11-20 — Latest Cloudflare Preview deployment and CI confirmed

- Owner supplied the latest Cloudflare Pages Preview row: branch `fix/portal-auth-errors-v2.0.3`, commit `e7dfcf3` (`e7dfcf37d8e5f1e9a4620166866ef19b6f983fed`), deployment URL `https://53d0dac2.ccwu-global-test.pages.dev`, deployment ID `53d0dac2-b7d9-4111-a9ed-5f3b4e13807c`.
- This is the latest deployment and its source commit descends from the version-correction commits `f5c8ac9` (HTML title/footer 2.0.8), `0197e8a` (JS module marker 2.0.8), and `46ae11f` (CI assertions). Thus the deployed source includes the v2.0.8 corrections; this does not by itself assert what an already-open browser tab currently renders.
- GitHub Actions for exact deployed commit `e7dfcf3`: runs `44722502692` and `44722495177` completed successfully. Earlier overlapping runs for prior documentation checkpoint `ebc0eb5` were cancelled after the newer commit runs completed; no failing code check is indicated.
- Latest Preview URL is the immutable deployment host above. Hard-refresh the admin page on this URL to verify the visible footer/title; production remains untouched.


## 2026-11-20 — Acceptance matrix stale status cleanup

- Verified latest branch checkpoint `a5c39c0` Actions run `44723885965`: all three jobs passed (frontend syntax/deployment isolation, Edge Function type checks, migration source integrity).
- Updated acceptance matrix to explicitly supersede the stale historical ENV-04 pending note with the owner-confirmed Preview deployment `e7dfcf3` and its URL. Matrix commit: `e5c31f3`.
- Remaining non-documentation acceptance: browser-visible v2.0.8 marker confirmation and owner-authorized real-content/provider E2E tests. Production remains untouched.


## 2026-11-20 — Owner-confirmed v2.0.8 runtime and acceptance matrix correction

- Owner confirmed the latest Preview admin page visibly displays `CCWU Global · Admin Build v2.0.8`; the browser-visible version gate is now PASS.
- The latest owner-confirmed app Preview deployment remains commit `e7dfcf3` at `https://53d0dac2.ccwu-global-test.pages.dev`. Later commits in the branch are documentation checkpoints; do not misrepresent them as the source SHA of that immutable deployment.
- Latest branch HEAD before this documentation update: `6675530`. GitHub Actions push run `44724457235` and pull-request run `44724466180` both completed successfully.
- Corrected `docs/test-acceptance-matrix.md` to record the visible v2.0.8 confirmation and remove the stale pending runtime-marker / Preview redeployment entries. Matrix update commit: `c37c12f`.
- No production deployment, payment activation, credential change, database mutation, paid service, or fabricated catalog/media content was used.
- Remaining release acceptance is limited to owner-controlled genuine media/catalog inputs and provider-specific sandbox credentials/contracts for media playback, Google IMA, Stripe lifecycle, and VPN provisioning; production release still requires explicit owner approval.


## 2026-11-20 — Ad tracking and frequency-cap audit

- Re-audited playback authorization, signed ad-event ingestion, promotion click tracking, and Stripe/CNY payment entrypoints directly from branch source.
- Confirmed the ad-event path uses a short-lived HMAC token scoped to episode/config IDs, validates event allowlists and batch size, writes through a service-role-only RPC, and deduplicates by token/config/event type. Promotion clicks use signed expiring tokens, a service-role-only RPC with unique click nonce, and HTTPS destination validation.
- Found a real unfinished behavior: `frequency_cap_hours` is returned by playback and stored on ad configuration, but `player.js` does not enforce it when selecting preroll/midroll/postroll slots. Updated the acceptance matrix to explicitly mark this as NOT IMPLEMENTED/VERIFIED rather than imply the setting works. Do not silently ship this as an operational control.
- Corrected stale ENV-04 matrix wording: the owner-confirmed app deployment is `e7dfcf3` and the owner-confirmed runtime marker is v2.0.8; later branch commits are documentation checkpoints, not the source SHA of that deployment.
- No database writes, secrets, payment settings, production resources, or live ad settings changed. A robust frequency-cap implementation needs a defined privacy-safe identity and server-side enforcement contract; do not rely on browser localStorage as a security boundary.
- Matrix audit update commit: `310b2e7`.


## 2026-11-20 — Server-side ad frequency cap implementation

- Implemented a source-level end-to-end frequency-cap path on branch `fix/portal-auth-errors-v2.0.3`.
- Added migration `20261120100000_enforce_server_side_video_ad_frequency_caps.sql` with viewer identity columns and impression indexes, plus service-role-only RPCs for checking eligible ad configurations and recording events with signed viewer identity.
- Playback now requires a random anonymous viewer-session UUID, identifies authenticated viewers from the validated Supabase JWT, filters candidate ad slots server-side using each config's `frequency_cap_hours`, and signs the viewer identity into the event token.
- Ad-event ingestion validates the signed identity and calls the new v2 RPC. It does not accept the event body's identity as authoritative.
- Player persists a random UUID in localStorage to maintain anonymous continuity across episodes when storage is available. Clearing browser storage or switching browsers resets anonymous identity; this is a privacy-preserving frequency-control key, not robust anti-fraud/device identification. Authenticated viewers are keyed by account UUID.
- Extended `.github/scripts/validate_ad_tracking_security.py` with source contracts for session persistence, server-side eligibility filtering, signed identity binding, and v2 event persistence.
- Updated acceptance matrix AD-02: implementation exists in branch source, but it is explicitly NOT DEPLOYED / NOT RUNTIME VERIFIED. No migration was applied to test or production DB, no Edge Function was deployed, and live IMA remains blocked pending authorized test tag.
- Commits in this implementation sequence: `69430f0` (migration), `31dc74d` (playback eligibility), `1427fd2` (signed identity event ingestion), `754b385` (persistent anonymous session), `e09b863` (CI contracts), `c059c69` (acceptance matrix).
- No production changes, database writes, secrets, paid services, or fabricated media/ad content.


- Follow-up hardening: playback now returns no ad slots when the signing secret is absent/too short, rather than serving untracked ads that could bypass impression-based frequency caps. Added a CI contract for this fail-closed behavior. Commit: `34aa1c5` and CI assertion `3a91c38`.


- Database compatibility follow-up (read-only inspection of test project `uvtzhzgirgwjzsmcdgej`): confirmed `public.video_ad_configs` has the expected `id`, `episode_id`, `slot_key`, `frequency_cap_hours`, `is_active`, `starts_at`, and `ends_at` columns; `private.video_ad_events` currently has the original event columns plus `event_token_id`, but not the new viewer identity columns yet. The existing event dedupe index is present; current event row count is zero. PostgreSQL advisory-lock functions used by the new migration resolve successfully. This was read-only; no migration was applied.
- Hardened `record_video_ad_events_v2`: impression writes for the same viewer/config are serialized with a transaction advisory lock and the frequency window is rechecked inside the event-write transaction, so simultaneous event-ingestion requests cannot both create qualifying impression rows. This protects event accounting; simultaneous ad playback already in progress may still occur before the first impression reaches the server.
- Added CI contract for transactional impression serialization and cap recheck. Commit: `e598bbd` (migration), `2086c07` (CI assertion).


- Player playback regression found during continued review: completing a post-roll ad previously called `video.play()` after the media element had ended, which could restart the episode from the beginning. Updated `resumeContent()` to keep ended content stopped for post-roll completion and clear the active slot. Added a CI source contract for this regression. Commit: `31cb36a` (player), `2c5d9f2` (CI).


- CNY payment retry review found that `cn-payment` silently generated a new request UUID when the client omitted or malformed `request_key`. That bypassed the intended idempotency boundary and could create a second order on retries. The endpoint now rejects missing/invalid UUID request keys; the existing portal checkout already supplies `crypto.randomUUID()`. Added a CI source contract. Commits: `68fa7bc` (Edge Function), `42eaa05` (CI).


- Payment RPC security review (read-only test DB catalog): `process_cn_payment_success` and `attach_cn_payment_session` are SECURITY DEFINER with empty search_path, inaccessible to anon/authenticated and executable by service_role only. Customer order creation/lookup RPCs are authenticated-only; manual approval is callable by authenticated but performs an internal `auth.uid()` + admin-role check before any ledger mutation. No DB rows or permissions changed.
- Latest payment idempotency hardening CI verification: Push run `44729893567` and Pull Request run `44729885991` both passed all three jobs (frontend/deployment isolation, Edge Function type checks, migration source integrity) for commit `c0d2064`.


- Player IMA lifecycle audit found asynchronous `ADS_MANAGER_LOADED` / `AD_ERROR` callbacks were reading the mutable global `activeSlot`. A delayed callback from an earlier ad request could be attributed to a later slot or resume the wrong playback state. Added monotonically increasing request IDs, IMA `userRequestContext` validation for manager-loaded events, slot-captured event tracking, request-scoped loader-error listeners, and stale-request guards in `resumeContent`. Added CI source contracts. Commits: `98d4c00`, `f7787dc`, `fb99e87`.


## 2026-11-20 — IMA request-context API correction

- Starting HEAD for this correction: `b58628e25f00df4eb79381aecb9ad1c3b237cc02`.
- Official Google IMA HTML5 documentation confirms request context is passed as the **second argument** to `AdsLoader.requestAds(adsRequest, userRequestContext)`; `AdsManagerLoadedEvent.getUserRequestContext()` and `AdErrorEvent.getUserRequestContext()` return that context.
- Found a real playback defect: the player assigned `request.userRequestContext` on the `AdsRequest` object and called `requestAds(request)`. The documented context was therefore not supplied; the manager-loaded callback would reject the missing context as stale and destroy the returned manager.
- Fixed `player.js`: call `adsLoader.requestAds(request, requestId)`; match loader-level errors using their own `getUserRequestContext()` and ignore errors not belonging to the active request.
- Updated `.github/scripts/validate_ad_tracking_security.py` to assert the documented API call and request-scoped loader-error handling.
- Commits: `cc2b92f` (player fix), `65199ae` (CI contract).
- No deployment, database migration, Edge Function deployment, live ad request, or production change was made. Test ad inventory remains empty, so runtime IMA playback still requires an authorized test tag and published test episode.
- GitHub Actions Push run `44731175319` for exact HEAD `5341a3a3107cde636a241f7c2e77d02257d4ce34`: **PASS**, all three jobs succeeded (frontend syntax/deployment isolation, migration source integrity, Supabase Edge Function type checks). The PR duplicate run `44731166880` was superseded/cancelled by the newer push; this is not a failed validation.
- Cloudflare Preview was not redeployed; the fix remains branch-only. Runtime IMA playback is still unverified because the test database has no ad inventory/test tag.
- Next: continue player lifecycle and backend reservation-race review.

## 2026-11-20 — IMA unavailable post-roll fallback fix

- Continued player lifecycle review after the request-context correction.
- Found another concrete edge case: when IMA was unavailable or failed to initialize, `requestAd()` unconditionally called `video.play()`. For a post-roll triggered by the `ended` event, this could restart the episode from the beginning even though no ad was shown.
- Fixed fallback to resume the video only for non-post-roll slots and only while the media has not ended.
- Added a CI source contract asserting both the normal post-roll completion guard and the IMA-unavailable fallback guard.
- Commits: `8bb7929` (player fix), `57339aa` (CI contract).
- No deployment, database migration, Edge Function deployment, or real ad playback was performed.


## 2026-11-20 — Ignore stale IMA manager tracking events

- Continued auditing late callbacks from AdsManager instances after an ad request has completed or a newer request has started.
- Found that manager-level impression/quartile/complete/skip/click callbacks and manager AD_ERROR callback were bound to the slot but did not verify the originating request ID. A delayed event from an obsolete manager could therefore be attributed to a later playback state.
- Updated `attachImaTracking(manager, slot, requestId)` and manager error callback to ignore events unless their captured request ID still matches `activeAdRequestId` and an ad request remains active.
- Added CI source contract coverage for request-scoped tracking callbacks.
- Commits: `ee9e334` (player guard), `bfbeab4` (CI contract).
- No database writes, deployment, provider calls, or production changes.


## 2026-11-20 — Canonical UUID validation for media tokens

- Tightened UUID validation in playback requests, ad-event signed token payloads, and promotion click tokens.
- Replaced permissive 36-character hex/hyphen checks with canonical UUID structure and RFC variant/version checks. This prevents malformed identifiers from reaching UUID-typed RPC parameters and makes signed identity validation consistent.
- Added CI contract coverage across the three Edge Functions.
- Commits: `9a060bd`, `410971a`, `c37ecb1` (endpoint validation); `399f044` (CI contract).
- No runtime secrets, payment data, database rows, or production services changed.


## 2026-11-20 — Atomic reservations for capped video-ad slots

- Addressed the remaining parallel-playback race: previously two tabs could both pass the eligibility query before either IMA impression was ingested.
- Added private `video_ad_frequency_reservations` keyed by ad config and authenticated-user or anonymous-session identity.
- The eligibility RPC now serializes same-viewer/config checks, checks recent impressions, and atomically reserves capped inventory for two minutes before returning it. Parallel requests cannot both receive the same capped slot while its reservation is active.
- Expired reservations are replaced on the next request; successful impression ingestion releases the reservation in the same transaction as event recording. A short reservation can conservatively suppress an ad for up to two minutes if the browser never starts it.
- Added CI source contracts for reservation creation and release.
- Commits: `03615e3` (migration), `8797743` (CI).
- Migration is branch-only and has not been applied to either Supabase project. No deployment or production changes.


## 2026-11-20 — Canonical UUID validation for CNY order idempotency keys

- Payment audit found the Edge Function already rejected malformed request UUIDs, but the authenticated SQL RPC still accepted any 36-character string made of hex digits and hyphens. Direct authenticated RPC callers could therefore bypass the stricter Edge Function format guard.
- Added a forward-only migration replacing the CNY order RPC with the same canonical UUID version/variant validation used by the Edge Function. Existing request-key conflict protection and retry behavior are preserved.
- Added CI contract coverage to keep the SQL guard aligned with the Edge Function.
- Branch-only migration; not applied to test or production databases. No payment orders, provider credentials, or live payment settings changed.


## 2026-11-20 — CNY request-key hardening CI and Preview checkpoint

- Verified the canonical request-key migration and CI contract at commit `0474fda2a120f8a5dc42bca1f2032b066e60250c`.
- GitHub Actions Push run `44733261243` and PR run `44733270649` both passed all three jobs: frontend/security contracts, Supabase Edge Function type checks, and migration source integrity.
- Cloudflare Pages Preview build for `0474fda` completed successfully at `https://cb02ef7f.ccwu-global-test.pages.dev`.
- This confirms source/CI and Preview build only. The new migration has not been applied to Supabase; CNY provider callback E2E and media/ad playback E2E remain unverified.


## 2026-11-20 — Avoid unused ad reservations without signing configuration

- Playback review found that capped-ad eligibility reservations were created before checking whether `CCWU_EVENT_SIGNING_SECRET` was configured. The response correctly suppressed ads without a signing token, but the unused reservation could temporarily suppress a later request for up to two minutes.
- Moved the signing-secret gate ahead of the eligibility RPC so no reservation is created when signed event reporting is unavailable. Ad delivery remains fail-closed.
- Added a playback source contract to prevent regression.
- Commits: `1021072` (Edge Function), `7c6747b` (CI contract).
- No database writes, migration application, provider calls, or production changes.


## 2026-11-20 — Canonical anonymous ad-session reuse

- Media endpoint UUID validation is now canonical. Player localStorage previously reused any 36-character hex/hyphen value; a legacy malformed value could therefore be sent to playback and rejected with HTTP 400 rather than being regenerated.
- Tightened the stored session check to the same UUID version/variant structure; invalid legacy values are replaced with a fresh `crypto.randomUUID()`.
- Added CI source contract coverage. No user identity data was read or changed; no database or deployment actions performed.
- Commits: `e2198bd` (player), `fe56dad` (CI contract).


## 2026-11-20 — CI-driven correction of ad reservation guard

- The first CI run after the ad reservation optimization caught two implementation issues: a duplicated `eventSecret` declaration in the playback Edge Function and a JavaScript-style `indexOf` call mistakenly used in a Python source-contract script.
- Removed the duplicate declaration and corrected the Python assertion to use `str.index`. The earlier failed run is retained as a useful regression signal; a new run on the corrected HEAD is required before marking this change validated.
- No database or production changes.
