#!/usr/bin/env python3
"""Validate owner-scoped CNY payment QR recovery after an interrupted checkout."""
from pathlib import Path

migration_path = Path("supabase/migrations/20261119075802_restore_cn_payment_qr_on_order_lookup.sql")
function_path = Path("supabase/functions/cn-payment/index.ts")
if not migration_path.is_file() or not function_path.is_file():
    raise SystemExit("Missing CN payment QR recovery migration or Edge Function source.")

migration = migration_path.read_text(encoding="utf-8")
function = function_path.read_text(encoding="utf-8")

for token in (
    "public.get_my_cn_payment_order(p_order_no text)",
    "auth.uid()",
    "o.user_id = auth.uid()",
    "'provider_qr_code', t.metadata->>'provider_qr_code'",
    "'provider_session_id', t.metadata->>'provider_session_id'",
    "REVOKE ALL ON FUNCTION public.get_my_cn_payment_order(text) FROM PUBLIC, anon, authenticated, service_role",
    "GRANT EXECUTE ON FUNCTION public.get_my_cn_payment_order(text) TO authenticated, service_role",
):
    if token not in migration:
        raise SystemExit(f"CN QR recovery migration contract missing: {token}")

for token in (
    'user.rpc("get_my_cn_payment_order", { p_order_no: order.order_no })',
    "existing?.provider_qr_code",
    "qr_code: existing.provider_qr_code",
    "qr_svg: await makeQrSvg(existing.provider_qr_code)",
):
    if token not in function:
        raise SystemExit(f"CN payment retry path missing: {token}")

print("CN payment owner-scoped QR recovery contract checks passed.")
