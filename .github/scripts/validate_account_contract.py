#!/usr/bin/env python3
"""Validate account dashboard auth gating and owner-scoped data access."""
from pathlib import Path

page = Path("account.html").read_text(encoding="utf-8")
module = Path("account.js").read_text(encoding="utf-8")
home = Path("app.js").read_text(encoding="utf-8")

checks = {
    "account dashboard loads as ES module": '<script type="module" src="./account.js?v=2.0.3"></script>' in page,
    "logged-out users get login/registration return link": './?auth=login&return=account' in page,
    "profile reads only current user": '.from("profiles").select("id,display_name").eq("id", user.id)' in module,
    "profile update changes display name only": '.update({ display_name: displayName })' in module and '.eq("id", currentUser.id)' in module,
    "membership subscriptions are owner-filtered": '.from("membership_subscriptions")' in module and '.eq("user_id", user.id)' in module,
    "VPN subscriptions are owner-filtered": '.from("vpn_subscriptions")' in module and '.eq("user_id", user.id)' in module,
    "orders are owner-filtered": '.from("service_orders")' in module and '.eq("user_id", user.id)' in module,
    "home account button opens account center": 'location.href="./account.html"' in home,
    "login return query redirects to account": 'get("return")==="account"' in home,
    "no role or privilege update in account module": '.update({ role:' not in module and 'service_role' not in module,
}
failed = [label for label, ok in checks.items() if not ok]
for label, ok in checks.items():
    print(f"{'OK' if ok else 'FAIL'}: {label}")
if failed:
    raise SystemExit("Account dashboard contract failed: " + ", ".join(failed))
