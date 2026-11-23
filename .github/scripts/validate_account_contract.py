#!/usr/bin/env python3
"""Validate account dashboard auth gating and owner-scoped data access."""
from pathlib import Path

page = Path("account.html").read_text(encoding="utf-8")
module = Path("account.js").read_text(encoding="utf-8")
home = Path("app.js").read_text(encoding="utf-8")
profile_migration = Path("supabase/migrations/20261119083006_grant_profile_display_name_update.sql").read_text(encoding="utf-8")
profile_hardening = Path("supabase/migrations/20261120054655_revoke_legacy_profile_column_updates.sql").read_text(encoding="utf-8")
profile_insert_hardening = Path("supabase/migrations/20261120060647_revoke_legacy_profile_column_inserts.sql").read_text(encoding="utf-8")

checks = {
    "account dashboard loads as ES module": '<script type="module" src="./account.js?v=2.0.4"></script>' in page,
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
checks["display name update has a column-only database grant"] = "GRANT UPDATE (display_name)" in profile_migration and "GRANT UPDATE (role" not in profile_migration
checks["login prompt remains visible without JavaScript"] = 'id="accountLoginPrompt" class="account-card"' in page

checks["login modal opens before async homepage data loading"] = home.index('get("auth")==="login"') < home.index("await render();await refreshUser();")

checks["legacy username/avatar UPDATE grants are revoked"] = "REVOKE UPDATE (username, avatar_url) ON TABLE public.profiles FROM authenticated" in profile_hardening
checks["profile hardening has fail-closed assertions"] = "profile_column_update_privilege_not_revoked" in profile_hardening and "profile_display_name_update_privilege_missing" in profile_hardening

checks["profile rows cannot be inserted directly by authenticated users"] = "REVOKE INSERT (id, username, avatar_url) ON TABLE public.profiles FROM authenticated" in profile_insert_hardening and "profile_column_insert_privilege_not_revoked" in profile_insert_hardening

checks["database error details are not exposed in account UI"] = all(token not in module for token in ("profile.error.message", "memberships.error.message", "vpns.error.message", "orders.error.message", "error?.message")) and "Profile update failed" in module

failed = [label for label, ok in checks.items() if not ok]
for label, ok in checks.items():
    print(f"{'OK' if ok else 'FAIL'}: {label}")
if failed:
    raise SystemExit("Account dashboard contract failed: " + ", ".join(failed))
