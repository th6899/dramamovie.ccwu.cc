# CCWU Global v2.0.4 — test acceptance matrix

This matrix records what has been verified in the independent test environment and what remains blocked by missing owner-controlled credentials, accounts, or authorized media. A code check or a rendered page is not equivalent to an end-to-end acceptance test.

## Verified

| ID | Area | Verification | Result |
|---|---|---|---|
| ENV-01 | Host isolation | Test Pages hosts resolve to test Supabase; known production hosts resolve to production; unknown hosts fail closed | PASS |
| ENV-02 | Preview version | Public test preview serves the v2.0.4 admin page and cache-busted media-upload module | PASS |
| ENV-03 | Deployment provenance | Cloudflare Pages deployment SHA for the latest Git commit has not yet been confirmed through the read-only API | PENDING |
| DB-01 | Schema migrations | 55 source migrations match 55 applied test database versions | PASS |
| DB-02 | RLS baseline | All public tables have RLS enabled; private ledgers are RLS default-deny | PASS |
| DB-03 | Owner reads | Orders, profiles, membership subscriptions, and VPN subscriptions have owner-scoped read policies | PASS |
| DB-04 | Profile editing | Authenticated users can update only profiles.display_name; role-column UPDATE remains denied | PASS |
| FN-01 | Edge Function parity | Six deployed test functions match their branch source; get-episode-playback v6, create-checkout v3, and cn-payment v7 | PASS |
| FN-02 | Function checks | All six Edge Functions pass Deno 2 type checking | PASS |
| PAY-01 | Stripe mode | Checkout function requires sk_test_ and validates recurring USD Price ID/amount/currency/interval | PASS |
| PAY-02 | Stripe return route | Success and cancellation return to existing payment-result.html with the server-created order ID | PASS |
| PAY-03 | CNY QR retry | Owner-scoped order lookup returns the stored provider QR/session values for retry recovery | PASS |
| PAY-04 | Test payment fence | Test cn-payment rejects live CNY methods before order creation; admin blocks live CNY enablement and manual QR toggles | PASS |
| UI-01 | Public routes | Homepage, membership/VPN anchors, player shell, payment result, and admin login shell render in read-only smoke tests | PASS |
| UI-02 | Account access | Logged-out account visitors see only the login prompt; login return URL opens the login modal and preserves the account return | PASS |
| MEDIA-00 | Admin media workflow | Poster upload, TUS resumable video upload, subtitle upload, explicit publish/unpublish, and published-subtitle-only playback contracts | PASS |
| MEDIA-01 | Free storage limit | Admin video upload is capped at 50 MB per file; free Storage quota remains 1 GB total | PASS |
| CI-01 | Automated validation | Frontend syntax, DOM IDs, DB table/RPC/column contracts, admin/account/media contracts, payment contracts, Deno checks, and migration integrity | PASS |

## Blocked pending owner-controlled test inputs

| ID | Area | Required input/action | Safe test condition |
|---|---|---|---|
| AUTH-01 | Staff admin | Owner authorizes a dedicated test staff account | Do not promote the existing viewer account automatically |
| AUTH-02 | Ownership isolation | A second ordinary test account | Verify one user cannot read another user's orders/subscriptions |
| AUTH-03 | Leaked password protection | Enable Supabase Auth leaked-password protection in the test project's dashboard | No production Auth setting changes |
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
