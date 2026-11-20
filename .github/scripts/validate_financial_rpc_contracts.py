#!/usr/bin/env python3
"""Check ownership guards and least-privilege grants for public financial RPCs."""
from pathlib import Path

stripe = Path("supabase/migrations/20261118112206_restore_stripe_checkout_and_invoice_rpc.sql").read_text(encoding="utf-8").lower()
cn = Path("supabase/migrations/20261118114905_restore_cn_payment_order_and_reconciliation_rpcs.sql").read_text(encoding="utf-8").lower()
manual = Path("supabase/migrations/20261118114558_restore_manual_payment_order_and_approval_rpcs.sql").read_text(encoding="utf-8").lower()
manual_guard = Path("supabase/migrations/20261118121904_harden_manual_payment_channel_and_submission_guards.sql").read_text(encoding="utf-8").lower()
cn_lookup = Path("supabase/migrations/20261119075802_restore_cn_payment_qr_on_order_lookup.sql").read_text(encoding="utf-8").lower()

checks = {
    "Stripe order creation requires an authenticated owner": "v_user uuid := auth.uid()" in stripe and "p_currency is distinct from 'usd'" in stripe,
    "Stripe plan must be active and USD": "where id = p_item_id and is_active = true" in stripe and "v_currency is distinct from 'usd'" in stripe,
    "Stripe order RPC is authenticated-only, not anonymous": "revoke all on function public.create_stripe_subscription_order(text,uuid,text) from public,anon,authenticated,service_role" in stripe and "grant execute on function public.create_stripe_subscription_order(text,uuid,text) to authenticated,service_role" in stripe,
    "CNY order creation requires an authenticated owner": "v_user uuid := auth.uid()" in cn and "o.user_id=v_user" in cn,
    "CNY plan and provider are validated": "p_provider not in ('alipay','wechat_pay')" in cn and "v_currency<>'cny'" in cn,
    "CNY order RPC is authenticated-only, not anonymous": "revoke all on function public.create_cn_payment_order(text,uuid,text,text) from public,anon,authenticated,service_role" in cn and "grant execute on function public.create_cn_payment_order(text,uuid,text,text) to authenticated,service_role" in cn,
    "Manual QR order requires owner and enabled channel": "v_user uuid := auth.uid()" in manual_guard and "manual_payment_unavailable" in manual_guard and "v_currency is distinct from 'cny'" in manual_guard,
    "Manual QR order RPC has explicit authenticated grant": "revoke all on function public.create_manual_payment_order(text,uuid) from public,anon,authenticated,service_role" in manual and "grant execute on function public.create_manual_payment_order(text,uuid) to authenticated,service_role" in manual,
    "CNY order recovery is restricted to the order owner": "o.user_id = auth.uid()" in cn_lookup and "auth.uid() is null" in cn_lookup,
    "CNY order recovery is not anonymous": "revoke all on function public.get_my_cn_payment_order(text) from public, anon, authenticated, service_role" in cn_lookup and "grant execute on function public.get_my_cn_payment_order(text) to authenticated, service_role" in cn_lookup,
    "Provider session attachment is service-role-only": "auth.jwt()->>'role') is distinct from 'service_role'" in cn and "grant execute on function public.attach_cn_payment_session(uuid,text,text,text) to service_role" in cn,
    "CNY settlement is service-role-only": "grant execute on function public.process_cn_payment_success(text,text,text,text,text,numeric,text,text) to service_role" in cn and "grant execute on function public.record_cn_payment_reconciliation(text,text,text,text,numeric,text,text) to service_role" in cn,
    "Reconciliation requires service-role JWT and amount matching": cn.count("auth.jwt()->>'role') is distinct from 'service_role'") >= 2 and "v_order.amount <> p_amount or v_tx.amount <> p_amount" in cn,
}
failed = [name for name, ok in checks.items() if not ok]
for name, ok in checks.items():
    print(f'{"PASS" if ok else "FAIL"}: {name}')
if failed:
    raise SystemExit("Financial RPC contract failed: " + "; ".join(failed))
print(f"All {len(checks)} financial RPC contracts passed.")
