# CCWU Global v2.0.7 — test acceptance matrix

This matrix records what has been verified in the independent test environment and what remains blocked by missing owner-controlled credentials, accounts, or authorized media. A code check or a rendered page is not equivalent to an end-to-end acceptance test.

## Verified

| ID | Area | Verification | Result |
|---|---|---|---|
| ENV-01 | Host isolation | Test Pages hosts resolve to test Supabase; known production hosts resolve to production; unknown hosts fail closed | PASS |
| ENV-02 | Preview version | Cloudflare Preview deployment `7df8c744.ccwu-global-test.pages.dev` serves admin build/module v2.0.7; OAuth callback targets `/admin.html` | PASS |
| ENV-03 | Deployment provenance | Cloudflare Pages Preview deployment source shows commit `0f1c3f2` (full commit `0f1c3f20ce998661d584e3bceab2f133109d8934`) | PASS |
| DB-01 | Schema migrations | 64 source migrations match 64 applied test database versions | PASS |
| DB-02 | RLS baseline | All public tables have RLS enabled; private ledgers are RLS default-deny | PASS |
| DB-03 | Owner reads | Orders, profiles, membership subscriptions, and VPN subscriptions have owner-scoped read policies | PASS |
| DB-04 | Profile editing | Authenticated users can update only profiles.display_name; role-column UPDATE remains denied | PASS |
| DB-05 | Financial write isolation | Browser roles cannot INSERT/UPDATE/DELETE service_orders; VPN plan writes require admin/editor | PASS |
| AUTH-01 | Staff admin | Owner-created and verified test account `tianhon027@gmail.com`; `private.user_roles` role is `admin`; JWT-context checks return `is_staff() = true` and `is_ccwu_admin() = true` | PASS |
| UI-03 | Operations privacy | Operations console no longer queries other users' profiles; displays shortened user IDs without broadening profile access | PASS |
| DB-06 | Public table RLS audit | All 27 public business tables have RLS enabled; order reads are owner/admin/support scoped; privileged approval RPC requires explicit admin role | PASS |
| DB-07 | Private schema grants | 28 private tables; anon has no SELECT grants; authenticated can SELECT only `private.user_roles`; no other private table grants detected | PASS |
| DB-08 | High-privilege RPC review | Five advisor-flagged public SECURITY DEFINER RPCs reviewed: all deny anon execution, use empty search_path, and enforce authenticated identity; payment approval additionally requires explicit admin role; order lookup is owner-scoped | PASS (code review; adversarial runtime tests pending) |
| DB-10 | Client table-wide privilege hardening | Revoked TRUNCATE on all 27 public tables from anon/authenticated; verified both roles have no TRUNCATE privilege on any current public table | PASS |
| DB-11 | Anonymous SQL privilege hardening | Revoked anonymous INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER on all public tables and all sequence privileges; removed postgres-owned default grants for future public tables/sequences; migration includes a fail-closed assertion | PASS (test DB verified by migration assertions; supabase_admin default privilege alteration is attempted only when permitted) |
| DB-09 | Content readiness snapshot | Test DB currently has 1 drama and 1 episode, 0 ad configs, 0 promotions, 0 active membership/VPN plans, 0 orders, and 0 subscriptions | BLOCKED (requires authorized test media/content and test plans) |
| SEC-01 | Security advisor follow-up | 27 private tables report RLS enabled without policies (private-schema default-deny design); leaked-password protection remains disabled and must be enabled before launch | BLOCKED (test-project Auth dashboard setting) |
| STORAGE-01 | Media bucket privacy | Video, subtitles, and payment proofs are private; proof upload/read is scoped to owner or staff; posters and QR images are intentionally public | PASS |
| STORAGE-02 | Upload constraints | Video 50 MB, subtitles 2 MB WebVTT-only, payment proofs 8 MB image/PDF, posters 10 MB image-only, QR images 5 MB image-only | PASS |
| MEDIA-03 | Signed playback authorization | Playback function validates optional user JWT, requires active membership for premium episodes, and issues 5-minute signed URLs for private video/subtitles | PASS |
| MEDIA-04 | Storage and publish guards | Verified private video/subtitle buckets, admin/editor-only media object read/upload policies, WebVTT-only subtitle bucket, RLS on dramas/episodes/subtitle_tracks, and database publish triggers that require the referenced poster/video/subtitle object to exist; playback and ad-event deployed source matches the test branch byte-for-byte | PASS (configuration, trigger, and source parity review; real asset playback remains blocked) |
| FN-03 | Payment endpoint authorization | `cn-payment` validates user JWT for checkout/status; provider notifications require Alipay RSA2 or WeChat Pay signature verification; service-only settlement RPCs are not executable by browser roles | PASS |
| FN-04 | Edge Function RPC boundary | Reviewed all six deployed test Edge Functions and sensitive RPC grants; ad-event and promotion tracking writes are service-role-only, payment settlement and Stripe webhook RPCs are service-role-only, and browser-executable SECURITY DEFINER RPCs are limited to authenticated user/admin workflows | PASS (grant and code review; provider end-to-end tests remain blocked) |
| FN-01 | Edge Function parity | Six deployed test functions match their branch source; get-episode-playback v6, create-checkout v3, and cn-payment v7 | PASS |
| FN-02 | Function checks | All six Edge Functions pass Deno 2 type checking | PASS |
| PAY-01 | Stripe mode | Checkout function requires sk_test_ and validates recurring USD Price ID/amount/currency/interval | PASS |
| PAY-02 | Stripe return route | Success and cancellation return to existing payment-result.html with the server-created order ID | PASS |
| PAY-03 | CNY QR retry | Owner-scoped order lookup returns the stored provider QR/session values for retry recovery | PASS |
| PAY-04 | Test payment fence | Test cn-payment rejects live CNY methods before order creation; admin blocks live CNY enablement and manual QR toggles | PASS |
| PAY-05 | Stripe privileged RPC boundary | Checkout state changes, webhook settlement, refund/dispute processing, invoice lifecycle, and subscription mapping RPCs are executable only by service_role; browser roles have no EXECUTE grant | PASS (grant and code review; Stripe sandbox lifecycle remains blocked) |
| PAY-06 | Subscription entitlement expiry | Corrected both deployed `process_stripe_subscription_event` overloads: `customer.subscription.updated` checks the latest failed invoice's `grace_until` before expiring an elapsed paid-through period; grace extension now updates both membership and VPN `ends_at` only for an elapsed `customer.subscription.updated` event, never for `customer.subscription.deleted`; both overloads remain service-role-only | PASS (SQL definition, membership/VPN grace-period boundary, deleted-event guard, and EXECUTE grants verified; Stripe sandbox lifecycle regression remains blocked pending test credentials/orders) |
| UI-01 | Public routes | Homepage, membership/VPN anchors, player shell, payment result, and admin login shell render in read-only smoke tests | PASS |
| UI-02 | Account access | Logged-out account visitors see only the login prompt; login return URL opens the login modal and preserves the account return | PASS |
| MEDIA-00 | Admin media workflow | Poster upload, TUS resumable video upload, VTT upload, SRT-to-WebVTT conversion, explicit publish/unpublish, and published-subtitle-only playback contracts | PASS |
| MEDIA-01 | Free storage limit | Admin uploader and private Storage bucket both enforce 50 MB per file; subtitle bucket accepts private WebVTT only; free Storage quota remains 1 GB total | PASS |
| CI-01 | Automated validation | Frontend syntax, DOM IDs, DB table/RPC/column contracts, admin/account/media/playback-security/financial-write/WebVTT contracts, payment contracts, Deno checks, and migration integrity | PASS |

## Blocked pending owner-controlled test inputs

| ID | Area | Required input/action | Safe test condition |
|---|---|---|---|
| AUTH-02 | Ownership isolation | Test DB currently has two confirmed accounts and both have admin role; no ordinary-user account is available | BLOCKED — need a non-admin test account before cross-user isolation can be meaningfully verified |
| AUTH-03 | Leaked password protection | Enable Supabase Auth leaked-password protection in the test project's dashboard | BLOCKED — dashboard-only Auth setting; test project only |
| STRIPE-01 | Stripe checkout | Configure test-only STRIPE_SECRET_KEY, test STRIPE_WEBHOOK_SECRET, exact test APP_ORIGIN, and test recurring Price IDs | sk_test_ only; no live keys or transactions |
| STRIPE-02 | Stripe lifecycle | Run checkout, success/failure, duplicate webhook, renewal, refund, and dispute test events | Stripe test mode only |
| ALIPAY-01 | Alipay | Configure genuine Alipay sandbox app ID/private key/public key and official sandbox gateway | Sandbox only; test method disabled until credentials are verified |
| WECHAT-01 | WeChat Pay | No independent no-money sandbox is available for this Native API v3 flow | Keep disabled; no live merchant calls from test |
| MANUAL-01 | Manual QR | Merchant-owned static QR is a real-money collection path | Locked off in test; do not upload real collection QR codes |
| MEDIA-02 | Video playback | Upload a real, authorized test video/subtitle asset to private test storage and complete signed playback | No fake media or unlicensed content; Free plan upload ceiling is 50 MB per file |
| ADS-01 | Google IMA | Authorized test ad tag and published test episode | No live ad claims or unauthorized ad tags |
| VPN-01 | VPN provisioning | Provider API credentials and provisioning contract | Subscription records alone are not proof of a live VPN account |
| RELEASE-01 | Production release | Separate explicit authorization for PR merge and production deployment | Production remains read-only until separately approved |

## Secret handling

- Configure secrets only in the independent test Supabase project's Edge Functions → Secrets.
- Never paste secrets into chat, GitHub, issue comments, screenshots, or browser-delivered files.
- See test-environment-secrets.md for the exact secret names and environment rules.
- The test project hard-blocks live CNY automatic providers; Stripe checkout requires a test-mode key. Manual real-merchant QR is locked off in the test admin UI.
