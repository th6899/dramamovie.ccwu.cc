from pathlib import Path
import re
root=Path(".")
config=(root/"config.js").read_text(encoding="utf-8")
for marker in ('host === "ccwu-global-test.pages.dev"','"https://uvtzhzgirgwjzsmcdgej.supabase.co"','"https://zkvfsuhlcrafgdbyxevr.supabase.co"','if (!isTestHost && !isProductionHost)'):
    if marker not in config: raise SystemExit(f"Deployment isolation check failed: missing {marker}")
for name in ("app.js","admin-v2.0.1.js","player.js","config.js"):
    source=(root/name).read_text(encoding="utf-8")
    if re.search(r"\\bsk_(?:live|test)_[A-Za-z0-9]{12,}",source): raise SystemExit(f"Stripe secret key-like value found in public asset: {name}")
    if re.search(r"\\bservice_role\\b\\s*[:=]",source,re.I): raise SystemExit(f"Service-role credential assignment found in public asset: {name}")
headers=(root/"_headers").read_text(encoding="utf-8")
for marker in ("X-Content-Type-Options: nosniff","Referrer-Policy: strict-origin-when-cross-origin","X-Frame-Options: DENY","Content-Security-Policy: frame-ancestors 'none'","Permissions-Policy: camera=(), microphone=(), geolocation=()"):
    if marker not in headers: raise SystemExit(f"Static response header check failed: missing {marker}")
admin=(root/"admin.html").read_text(encoding="utf-8")
for marker in ('id="adsenseForm"','id="alipayQrFile"','id="wechatQrFile"','id="saveManualQr"'):
    if marker not in admin: raise SystemExit(f"Simplified admin payment interface missing: {marker}")
for stale in ('id="promoForm"','id="nativePaymentRows"','id="adForm"','id="promoUrl"'):
    if stale in admin: raise SystemExit(f"Removed admin panel still present: {stale}")
print("Deployment isolation, public asset secret, response header, and simplified payment UI checks passed.")
