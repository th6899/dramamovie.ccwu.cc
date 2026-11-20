#!/usr/bin/env python3
"""Enforce least-privilege rules for financial orders and subscription writes."""
from pathlib import Path
import re

migration = Path("supabase/migrations/20261119085930_restrict_order_and_vpn_plan_writes.sql").read_text(encoding="utf-8")
rls_migration = Path("supabase/migrations/20261118113035_align_public_rls_with_production.sql").read_text(encoding="utf-8")
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
for table in ("membership_subscriptions", "vpn_subscriptions"):
    match = re.search(rf'create policy "{table}_admin_update[^;]+;', rls_migration, re.I | re.S)
    policy = match.group(0).lower() if match else ""
    checks[f"{table} UPDATE is admin-only by RLS"] = bool(
        policy and "for update to authenticated" in policy
        and "r.role = 'admin'" in policy and "with check" in policy
    )

for path in frontend_files:
    source = path.read_text(encoding="utf-8")
    orders_mutated = re.search(r'\.from\(["\']service_orders["\']\)\s*\.\s*(insert|update|delete|upsert)\s*\(', source, re.I)
    checks[f"{path.name} has no direct service_orders mutation"] = orders_mutated is None
    for table in ("membership_subscriptions", "vpn_subscriptions"):
        mutated = re.search(rf'\.from\(["\']{table}["\']\)\s*\.\s*(insert|update|delete|upsert)\s*\(', source, re.I)
        checks[f"{path.name} has no direct {table} mutation"] = mutated is None

failed = [name for name, passed in checks.items() if not passed]
for name, passed in checks.items():
    print(f'{"PASS" if passed else "FAIL"}: {name}')
if failed:
    raise SystemExit("Financial write security contract failed: " + "; ".join(failed))
print(f"All {len(checks)} financial write security contracts passed.")
