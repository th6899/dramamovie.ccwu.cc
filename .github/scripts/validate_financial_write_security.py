#!/usr/bin/env python3
"""Enforce least-privilege rules for financial orders and plan catalog writes."""
from pathlib import Path
import re

migration = Path("supabase/migrations/20261119085930_restrict_order_and_vpn_plan_writes.sql").read_text(encoding="utf-8")
frontend_files = [
    Path("app.js"), Path("admin-v2.0.1.js"), Path("account.js"),
    Path("payment-result.js"), Path("player.js"),
]
checks = {
    "service_orders browser DML revoked": "revoke all on table public.service_orders from public, anon, authenticated" in migration.lower(),
    "authenticated retains order reads": "grant select on table public.service_orders to authenticated" in migration.lower(),
    "legacy staff order insert policy removed": "drop policy if exists orders_staff_insert" in migration.lower(),
    "legacy staff order update policy removed": "drop policy if exists orders_staff_update" in migration.lower(),
    "legacy staff order delete policy removed": "drop policy if exists orders_staff_delete" in migration.lower(),
    "VPN plan insert limited to admin/editor": "in ('admin','editor')" in migration and "vpn_plans_staff_insert" in migration,
    "VPN plan update limited to admin/editor": "vpn_plans_staff_update" in migration and "with check (coalesce((select public.current_staff_role()), '') in ('admin','editor'))" in migration,
    "VPN plan delete limited to admin/editor": "vpn_plans_staff_delete" in migration and "using (coalesce((select public.current_staff_role()), '') in ('admin','editor'))" in migration,
}
for path in frontend_files:
    source = path.read_text(encoding="utf-8")
    if re.search(r'\.from\(["\']service_orders["\']\)\s*\.\s*(insert|update|delete|upsert)\s*\(', source, re.I):
        checks[f"{path.name} has no direct service_orders mutation"] = False
    else:
        checks[f"{path.name} has no direct service_orders mutation"] = True
failed = [name for name, passed in checks.items() if not passed]
for name, passed in checks.items():
    print(f'{"PASS" if passed else "FAIL"}: {name}')
if failed:
    raise SystemExit("Financial write security contract failed: " + "; ".join(failed))
print(f"All {len(checks)} financial write security contracts passed.")
