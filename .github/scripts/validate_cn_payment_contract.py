#!/usr/bin/env python3
"""Validate owner-scoped CNY payment QR recovery after an interrupted checkout."""
from pathlib import Path

migration_path = Path("supabase/migrations/20261119075802_restore_cn_payment_qr_on_order_lookup.sql")
request_key_migration_path = Path("supabase/migrations/20261120120000_validate_canonical_cn_payment_request_keys.sql")
function_path = Path("supabase/functions/cn-payment/index.ts")
if not migration_path.is_file() or not function_path.is_file():
    raise SystemExit("Missing CN payment QR recovery migration or Edge Function source.")

migration = migration_path.read_text(encoding="utf-8")
function = function_path.read_text(encoding="utf-8")
sql = request_key_migration_path.read_text(encoding="utf-8") if request_key_migration_path.is_file() else ""

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

if 'new URL(supabaseUrl).hostname === "uvtzhzgirgwjzsmcdgej.supabase.co"' not in function:
    raise SystemExit("CNY payment Edge Function is missing the test-project identity fence.")
if 'enabledMethod.environment !== "test"' not in function or "live_payment_blocked_in_test_project" not in function:
    raise SystemExit("CNY payment Edge Function must reject live methods in the independent test project.")
if function.index("live_payment_blocked_in_test_project") > function.index('user.rpc("create_cn_payment_order"'):
    raise SystemExit("Live-payment test fence must run before creating the payment order.")

# SQL independently enforces the same canonical UUID structure as the Edge Function.
if "^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$" not in sql:
    raise SystemExit("CNY SQL order RPC must reject non-canonical request UUIDs.")

if "raise exception 'invalid_request_key';\n  end if;" not in sql:
    raise SystemExit("CNY SQL order RPC request-key guard is missing its END IF.")
if sql.lower().count("commit;") != 1 or not sql.rstrip().lower().endswith("commit;"):
    raise SystemExit("CNY canonical request-key migration must contain one terminal COMMIT.")
