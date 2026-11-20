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
