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
