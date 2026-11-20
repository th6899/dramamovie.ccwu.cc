#!/usr/bin/env python3
"""Static security contracts for payment Edge Functions; no provider calls are made."""
from pathlib import Path

def read(path: str) -> str:
    p = Path(path)
    if not p.is_file():
        raise SystemExit(f"missing required source: {path}")
    return p.read_text(encoding="utf-8")

checkout = read("supabase/functions/create-checkout/index.ts")
stripe = read("supabase/functions/stripe-webhook/index.ts")
cn = read("supabase/functions/cn-payment/index.ts")
app = read("app.js")

checks = {
    "Stripe checkout requires a bearer session and validates it with Auth": 'startsWith("Bearer ")' in checkout and "userClient.auth.getUser()" in checkout,
    "Stripe checkout refuses live API keys": 'stripeKey.startsWith("sk_test_")' in checkout,
    "Stripe checkout blocks production origins": "PRODUCTION_ORIGIN_BLOCKED" in checkout,
    "Stripe checkout rejects CNY and mainland-China requests": 'body.currency==="CNY"||body.region==="mainland_cn"' in checkout,
    "Browser reuses a stable checkout request key on retry": "requestKey:crypto.randomUUID()" in app and "requestKey:pendingCheckout.requestKey" in app,
    "Stripe Edge Function uses the idempotent order RPC": 'userClient.rpc("create_stripe_subscription_order_idempotent"' in checkout,
    "Stripe API session creation uses an idempotency key": '"Idempotency-Key":"ccwu-checkout-"+order.order_id' in checkout,
    "Stripe checkout validates provider price amount, currency and interval": all(x in checkout for x in ('stripePrice.currency!=="usd"', "stripePrice.unit_amount!==expectedMinor", "stripePrice.recurring?.interval!==order.billing_interval")),
    "Stripe webhook verifies timestamped HMAC before parsing JSON": stripe.index("verifyStripeSignature(raw") < stripe.index("JSON.parse(raw)") and "Math.abs(Date.now()/1000-ts)>300" in stripe and 'name:"HMAC",hash:"SHA-256"' in stripe,
    "Stripe webhook rejects invalid signatures and malformed event envelopes": all(x in stripe for x in ('error:"invalid_signature"', 'error:"invalid_event_envelope"', 'typeof event?.id!=="string"', 'typeof event?.type!=="string"')),
    "Stripe settlement uses server-side privileged RPCs": all(x in stripe for x in ('admin.rpc("process_stripe_checkout_event"', 'admin.rpc("process_stripe_subscription_event"', 'admin.rpc("process_stripe_refund_dispute_event"')),
    "CNY order creation authenticates the customer": "user.auth.getUser(match[1])" in cn and 'user.rpc("create_cn_payment_order"' in cn,
    "Test Supabase project blocks live CNY payment methods before order creation": cn.index("live_payment_blocked_in_test_project") < cn.index('user.rpc("create_cn_payment_order"'),
    "Alipay test mode is restricted to approved sandbox gateways": '"openapi-sandbox.dl.alipaydev.com", "openapi.alipaydev.com", "mapi.alipaydev.com"' in cn and "alipay_test_gateway_required" in cn,
    "WeChat Pay independent sandbox is explicitly disabled": 'if (environment === "test") throw new Error("wechatpay_api_v3_has_no_independent_sandbox")' in cn,
    "Alipay notifications verify RSA2 signature and merchant app identity": all(x in cn for x in ('params.get("sign_type") !== "RSA2"', "rsaVerify(publicKey, alipayNotifySignContent(values), sign)", 'params.get("app_id") !== appId')),
    "WeChat notifications verify serial, timestamp and RSA signature": all(x in cn for x in ("verifyWeChatMessage(raw, req.headers, publicKey, platformSerial)", 'transaction.appid !== appId || transaction.mchid !== mchId')),
    "WeChat notifications decrypt authenticated AES-GCM resources": all(x in cn for x in ('resource.algorithm !== "AEAD_AES_256_GCM"', 'name: "AES-GCM"', 'amount?.currency !== "CNY"')),
    "CNY settlement is delegated to service-role RPC": 'service.rpc("process_cn_payment_success"' in cn,
    "Payment webhook endpoint accepts only POST": 'if (req.method !== "POST") return json(405' in cn,
}
failed = [name for name, passed in checks.items() if not passed]
for name, passed in checks.items():
    print(f'{"PASS" if passed else "FAIL"}: {name}')
if failed:
    raise SystemExit("Payment Edge Function security contract failed: " + "; ".join(failed))
print(f"All {len(checks)} payment Edge Function security contracts passed.")
