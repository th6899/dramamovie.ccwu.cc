#!/usr/bin/env python3
"""Guard manual payment approval against mismatched ledger state."""
from pathlib import Path
path = Path("supabase/migrations/20261120061000_harden_manual_payment_approval_amount_consistency.sql")
if not path.is_file():
    raise SystemExit("Manual payment approval hardening migration is missing.")
sql = path.read_text(encoding="utf-8").lower()
required = (
    "r.role='admin'", "s.user_id as submission_user_id", "o.amount as order_amount",
    "o.currency as order_currency", "for update of s,o",
    "v_s.submission_user_id is distinct from v_s.user_id",
    "v_s.order_currency<>'cny'", "v_t.currency<>'cny'", "v_t.asset<>'cny'",
    "v_t.amount<>v_s.order_amount", "for update;", "get diagnostics v_rows=row_count",
    "payment_transaction_state_changed", "payment_order_state_changed",
    "payment_submission_state_changed",
    "revoke all on function public.approve_manual_payment(uuid,text) from public,anon,authenticated,service_role",
    "grant execute on function public.approve_manual_payment(uuid,text) to authenticated,service_role",
)
missing=[token for token in required if token not in sql]
for token in required:
    print(f'{"PASS" if token in sql else "FAIL"}: {token}')
if missing:
    raise SystemExit("Missing manual payment approval contract: "+", ".join(missing))
print(f"All {len(required)} manual payment approval contracts passed.")
