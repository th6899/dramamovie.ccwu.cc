#!/usr/bin/env python3
"""Static contract checks for the membership/VPN plan editor and checkout path."""
from pathlib import Path
import re
import sys

def read(path: str) -> str:
    p = Path(path)
    if not p.is_file():
        raise SystemExit(f"missing required file: {path}")
    return p.read_text(encoding="utf-8")

html = read("admin.html")
admin = read("admin-v2.0.1.js")
checkout = read("supabase/functions/create-checkout/index.ts")

required_fields = (
    "memberPlanStripePrice", "memberPlanInterval",
    "vpnPlanStripePrice", "vpnPlanInterval",
)
for field in required_fields:
    if f'id="{field}"' not in html:
        raise SystemExit(f"admin form is missing {field}")

for prefix in ("memberPlan", "vpnPlan"):
    block = re.search(
        rf'<select id="{prefix}Currency">(.*?)</select>', html, re.S
    )
    if not block:
        raise SystemExit(f"missing {prefix} currency selector")
    options = re.findall(r'<option value="([^"]+)"', block.group(1))
    if options != ["USD", "CNY"]:
        raise SystemExit(f"{prefix} currencies must be exactly USD,CNY; got {options}")

for prefix in ("memberPlan", "vpnPlan"):
    if not re.search(rf'{prefix}StripePrice"\)\.value\.trim\(\)', admin):
        raise SystemExit(f"{prefix} Stripe Price ID is not read")
    if not re.search(rf'{prefix}Interval"\)\.value', admin):
        raise SystemExit(f"{prefix} billing interval is not read")

for table in ("membership_plans", "vpn_plans"):
    if f'from("{table}").insert' not in admin:
        raise SystemExit(f"admin does not insert {table}")
if admin.count('stripe_price_id: currency === "USD" ? stripePriceId : null') != 2:
    raise SystemExit("both plan editors must persist Stripe IDs only for USD")
if admin.count('billing_interval: $("memberPlanInterval").value') != 1:
    raise SystemExit("membership billing interval is not persisted")
if admin.count('billing_interval: $("vpnPlanInterval").value') != 1:
    raise SystemExit("VPN billing interval is not persisted")
if admin.count('/^price_[A-Za-z0-9]+$/') != 2:
    raise SystemExit("both plan editors must validate Stripe Price IDs")

for token in (
    "create_stripe_subscription_order", "stripe_price_id",
    "billing_interval", "stripePrice.active!==true",
    'stripePrice.currency!=="usd"', "stripePrice.unit_amount!==expectedMinor",
    "stripePrice.recurring?.interval!==order.billing_interval",
    'params.set("mode","subscription")',
):
    if token not in checkout:
        raise SystemExit(f"Stripe checkout contract missing: {token}")

print("Plan editor and Stripe checkout contract checks passed.")

result_page = read("payment-result.html")
result_script = read("payment-result.js")
for token in (
    'appOrigin+"/payment-result.html?order_id="',
    'resultUrl+"&session_id={CHECKOUT_SESSION_ID}"',
    'resultUrl+"&status=cancelled"',
):
    if token not in checkout:
        raise SystemExit(f"Stripe return URL contract missing: {token}")
if "/account?" in checkout:
    raise SystemExit("Stripe return URLs must not target the nonexistent /account route.")
if 'id="orderInfo"' not in result_page or 'params.get("order_id")' not in result_script:
    raise SystemExit("Stripe return page must read and display the server-owned order ID.")
