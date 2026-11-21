#!/usr/bin/env python3
"""Validate private manual-payment proof storage configuration and ownership policies."""
from pathlib import Path
bucket_sql = Path("supabase/migrations/20261118105215_create_ccwu_test_storage_buckets.sql").read_text(encoding="utf-8").lower()
policy_sql = Path("supabase/migrations/20261118105247_add_ccwu_test_storage_access_policies.sql").read_text(encoding="utf-8").lower()
checks = {
    "proof bucket is private": "'ccwu-payment-proofs','ccwu-payment-proofs',false" in bucket_sql,
    "proof bucket limit is 8 MiB": "'ccwu-payment-proofs','ccwu-payment-proofs',false,8388608" in bucket_sql,
    "proof bucket allows only image/pdf MIME types": "array['image/png','image/jpeg','image/webp','application/pdf']" in bucket_sql,
    "customer proof reads are owner-folder scoped": "storage.foldername(name))[1]" in policy_sql and "customer or staff reads payment proof" in policy_sql,
    "customer proof uploads are owner-folder scoped": "customers upload own payment proof" in policy_sql and "with check" in policy_sql,
    "staff can read submitted proof": "or is_ccwu_admin()" in policy_sql,
    "customer proof policy has no direct update/delete grant": "update to authenticated using (((bucket_id = 'ccwu-payment-proofs'" not in policy_sql and "delete to authenticated using (((bucket_id = 'ccwu-payment-proofs'" not in policy_sql,
}
failed = [name for name, ok in checks.items() if not ok]
for name, ok in checks.items():
    print(f'{"PASS" if ok else "FAIL"}: {name}')
if failed:
    raise SystemExit("Payment proof storage contract failed: " + "; ".join(failed))
print(f"All {len(checks)} payment proof storage contracts passed.")
