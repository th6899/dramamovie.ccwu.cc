#!/usr/bin/env python3
"""Validate owner-scoped RLS contracts for ancillary customer data."""
from pathlib import Path

policies = Path("supabase/migrations/20261118113035_align_public_rls_with_production.sql").read_text(encoding="utf-8").lower()
manual = Path("supabase/migrations/20261118121904_harden_manual_payment_channel_and_submission_guards.sql").read_text(encoding="utf-8").lower()

checks = {
    "manual payment submissions are inserted only by their owner": "customers submit own manual payment details" in policies and "(select auth.uid()) = user_id" in policies and "o.user_id = ( select auth.uid() as uid)" in policies,
    "manual payment submissions are readable only by owner or admin/support": "customers_read_own_or_admin_support_manual_submissions" in policies and "array['admin'::text, 'support'::text]" in policies,
    "manual proof paths are scoped to the uploader UID": "storage.foldername(proof_path))[1] = (select auth.uid())::text" in manual,
    "refund requests must belong to the signed-in order owner": "refunds_insert_own_or_staff" in policies and "o.user_id = ( select auth.uid() as uid)" in policies,
    "refund requests are readable only by owner or staff": "refunds_read_own_or_staff" in policies and "(select private.is_staff() as is_staff)" in policies,
    "notifications are owner-scoped for read and update": "users_read_own_notifications" in policies and "users_mark_own_notifications_read" in policies and "(select auth.uid() as uid) = user_id" in policies,
    "VPN device bindings are owner-scoped for read": "vpn_device_bindings_read_owner_or_staff" in policies and "user_id = ( select auth.uid() as uid)" in policies,
    "VPN device staff reads are limited to admin/support": "array['admin'::text, 'support'::text]" in policies,
}
failed = [name for name, ok in checks.items() if not ok]
for name, ok in checks.items():
    print(f'{"PASS" if ok else "FAIL"}: {name}')
if failed:
    raise SystemExit("Ancillary owner RLS contract failed: " + "; ".join(failed))
print(f"All {len(checks)} ancillary owner RLS contracts passed.")
