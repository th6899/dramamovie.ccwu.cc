#!/usr/bin/env python3
"""Validate the committed Supabase Database type snapshot."""
from pathlib import Path
import re
import sys

path = Path("types/database.types.ts")
if not path.is_file():
    raise SystemExit("Missing types/database.types.ts; regenerate from the independent test database.")

source = path.read_text(encoding="utf-8")
required = [
    "export type Database =",
    "ai_tool_catalog:",
    "dramas:",
    "episodes:",
    "membership_plans:",
    "membership_subscriptions:",
    "payment_methods:",
    "service_orders:",
    "vpn_plans:",
    "vpn_subscriptions:",
    "approve_manual_payment:",
    "create_cn_payment_order:",
    "create_manual_payment_order:",
    "create_stripe_subscription_order:",
    "get_my_cn_payment_order:",
]
missing = [item for item in required if item not in source]
if missing:
    raise SystemExit("Database type snapshot is missing expected schema contracts: " + ", ".join(missing))

# The generated snapshot must remain type declarations only, not contain credential material.
for pattern in (r"(?i)sk_live_[A-Za-z0-9]+", r"(?i)sk_test_[A-Za-z0-9]+", r"(?i)whsec_[A-Za-z0-9]+", r"(?i)service_role[^\n]{0,80}eyJ[A-Za-z0-9._-]+"):
    if re.search(pattern, source):
        raise SystemExit("Possible credential material detected in generated database types.")

if source.count("export type Database =") != 1:
    raise SystemExit("Expected exactly one Database type declaration.")

print(f"Supabase database type snapshot OK ({len(source):,} characters).")
