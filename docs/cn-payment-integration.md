# CNY native QR payment integration

## Current implementation

The test branch now contains a single Supabase Edge Function, `cn-payment`, that handles:
- Authenticated CNY order creation for `alipay` and `wechat_pay`
- Provider QR creation and storage in the private payment transaction metadata
- Alipay asynchronous notifications
- WeChat Pay API v3 encrypted notifications
- Idempotent settlement through the existing `process_cn_payment_success` RPC
- Order status polling through `get_my_cn_payment_order`, including the stored QR code for recovery

QR SVGs are generated server-side. No third-party QR rendering script or QR API receives payment tokens.

## Test safety

The test database has two non-enabled payment method rows:
- `alipay`: CNY, `environment=test`, disabled
- `wechat_pay`: CNY, `environment=test`, disabled

No merchant credentials are stored in the database or repository. The payment methods remain disabled until a merchant sandbox credential set is configured and a test administrator enables the method.

### Alipay

Alipay sandbox is supported. The Edge Function only permits the documented Alipay developer sandbox gateways when the payment method environment is `test`. Production gateway use requires `ALIPAY_LIVE_PAYMENTS_ENABLED=true` and a `live` payment method; this flag must remain false until a separately approved production release.

Required Edge Function secrets:
- `ALIPAY_APP_ID`
- `ALIPAY_MERCHANT_PRIVATE_KEY` (PKCS#1 or PKCS#8 PEM)
- `ALIPAY_PUBLIC_KEY` (PEM public key)
- `ALIPAY_GATEWAY` (sandbox gateway for test)
- Optional: `ALIPAY_SELLER_ID`
- Optional: `ALIPAY_NOTIFY_URL` (defaults to the `cn-payment` function URL)
- Optional production-only gate: `ALIPAY_LIVE_PAYMENTS_ENABLED` (must remain false in test)

The function signs requests with RSA2, verifies the Alipay response signature, and verifies notification signatures before settlement.

### WeChat Pay

WeChat Pay API v3 Native QR is implemented but intentionally blocked in the test environment. The standard Native API v3 endpoint is a live merchant endpoint; do not enable it in test as if it were a no-money sandbox. The code returns a clear no-independent-sandbox error for a test payment method. A live call additionally requires the explicit `WECHATPAY_LIVE_PAYMENTS_ENABLED=true` gate.

Required secrets for a separately approved live configuration:
- `WECHATPAY_APP_ID`
- `WECHATPAY_MCHID`
- `WECHATPAY_MERCHANT_SERIAL_NO`
- `WECHATPAY_MERCHANT_PRIVATE_KEY`
- `WECHATPAY_PLATFORM_SERIAL`
- `WECHATPAY_PLATFORM_PUBLIC_KEY`
- `WECHATPAY_API_V3_KEY` (exactly 32 bytes)
- Optional: `WECHATPAY_NOTIFY_URL` (defaults to the `cn-payment` function URL)
- Production-only gate: `WECHATPAY_LIVE_PAYMENTS_ENABLED` (must remain false in test)

The function signs Native API requests with RSA-SHA256, verifies signed API responses and callback headers, decrypts callback resources using AES-256-GCM, validates merchant/app identity and CNY amount, then invokes the idempotent settlement RPC.

## Common runtime configuration

Supabase supplies the project URL and service credentials to Edge Functions. The function accepts either `SUPABASE_SERVICE_ROLE_KEY` or the service-role entry in `SUPABASE_SECRET_KEYS`; the authenticated client accepts `SUPABASE_ANON_KEY` or `SUPABASE_PUBLISHABLE_KEY`.

`APP_ORIGIN` may be set to the test Pages origin for browser CORS. Do not paste any merchant private key, API v3 key, or service-role key into source control or chat.

## Remaining verification gates

1. Configure Alipay sandbox credentials in Supabase Edge Function Secrets.
2. Create a test administrator role for the intended test account; the current test project has one viewer account and no staff-role rows.
3. Enable only the Alipay test payment method after credentials are verified.
4. Run a real Alipay sandbox precreate, callback signature check, duplicate notification test, amount-mismatch test, and entitlement issuance test.
5. Keep WeChat Pay disabled until the user explicitly approves a live merchant test and supplies the merchant credentials through Supabase Secrets.
6. Do not merge or deploy production from this branch until the end-to-end payment and migration rebuild checks pass.
