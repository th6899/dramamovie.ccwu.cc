from pathlib import Path
import re

root = Path(".")
config = (root / "config.js").read_text(encoding="utf-8")
required = [
    'host === "ccwu-global-test.pages.dev"',
    '"https://uvtzhzgirgwjzsmcdgej.supabase.co"',
    '"https://zkvfsuhlcrafgdbyxevr.supabase.co"',
    'if (!isTestHost && !isProductionHost)',
]
for marker in required:
    if marker not in config:
        raise SystemExit(f"Deployment isolation check failed: missing {marker}")

# Browser-delivered assets must never contain provider secret keys or service-role keys.
public_assets = [root / name for name in ("app.js", "admin-v2.0.1.js", "player.js", "config.js")]
for path in public_assets:
    source = path.read_text(encoding="utf-8")
    if re.search(r"\bsk_(?:live|test)_[A-Za-z0-9]{12,}", source):
        raise SystemExit(f"Stripe secret key-like value found in public asset: {path}")
    if re.search(r"\bservice_role\b\s*[:=]", source, re.IGNORECASE):
        raise SystemExit(f"Service-role credential assignment found in public asset: {path}")

print("Deployment isolation and public asset secret checks passed.")

# Cloudflare Pages response headers must retain the baseline browser protections.
headers = (root / "_headers").read_text(encoding="utf-8")
for marker in (
    "X-Content-Type-Options: nosniff",
    "Referrer-Policy: strict-origin-when-cross-origin",
    "X-Frame-Options: DENY",
    "Content-Security-Policy: frame-ancestors 'none'",
    "Permissions-Policy: camera=(), microphone=(), geolocation=()",
):
    if marker not in headers:
        raise SystemExit(f"Static response header check failed: missing {marker}")

# Admin payment labels must describe implemented flows, not planned/unavailable providers.
admin_html = (root / "admin.html").read_text(encoding="utf-8")
for marker in ("Stripe Checkout", "支付宝沙箱", "微信支付 API v3", 'id="nativePaymentRows"', 'id="saveManualQr"'):
    if marker not in admin_html:
        raise SystemExit(f"Admin payment readiness contract failed: missing {marker}")
for stale in ("PayPal 国际收款接入准备", "PAYMENT.CAPTURE.COMPLETED", "PayPal 已加入通道清单"):
    if stale in admin_html:
        raise SystemExit(f"Admin still advertises an unimplemented payment flow: {stale}")
