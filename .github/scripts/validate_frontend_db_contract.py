#!/usr/bin/env python3
"""Ensure browser DB table/RPC references exist in the generated Supabase schema types."""
from pathlib import Path
import re

files = ["app.js", "admin-v2.0.1.js", "player.js", "payment-result.js", "account.js"]
source = "\n".join(Path(name).read_text(encoding="utf-8") for name in files)
types = Path("types/database.types.ts").read_text(encoding="utf-8")

def block_after(text: str, marker: str, next_marker: str) -> str:
    start = text.find(marker)
    if start < 0:
        raise SystemExit(f"Generated database types missing {marker}")
    start += len(marker)
    end = text.find(next_marker, start)
    if end < 0:
        raise SystemExit(f"Generated database types missing closing section {next_marker}")
    return text[start:end]

tables_block = block_after(types, "Tables: {", "Views:")
functions_block = block_after(types, "Functions: {", "Enums:")
tables = set(re.findall(r"^\s{6}([A-Za-z_][A-Za-z0-9_]*): \{", tables_block, re.M))
functions = set(re.findall(r"^\s{6}([A-Za-z_][A-Za-z0-9_]*): \{", functions_block, re.M))

used_tables = set(re.findall(r'\bdb\.from\(["\']([^"\']+)["\']\)', source))
used_rpcs = set(re.findall(r'\bdb\.rpc\(["\']([^"\']+)["\']', source))
missing_tables = sorted(used_tables - tables)
missing_rpcs = sorted(used_rpcs - functions)

if missing_tables:
    raise SystemExit("Frontend references tables absent from generated DB types: " + ", ".join(missing_tables))
if missing_rpcs:
    raise SystemExit("Frontend references RPCs absent from generated DB types: " + ", ".join(missing_rpcs))

print(f"Frontend DB contract OK: {len(used_tables)} tables and {len(used_rpcs)} RPCs resolve in generated types.")

# Validate selected columns as well as table names.
tables_block = block_after(types, "Tables: {", "Views:")
table_rows = {}
for match in re.finditer(r"^\s{6}([A-Za-z_][A-Za-z0-9_]*): \{\n\s{8}Row: \{([\s\S]*?)\n\s{8}\}\n\s{8}Insert:", tables_block, re.M):
    table_rows[match.group(1)] = set(re.findall(r"^\s{10}([A-Za-z_][A-Za-z0-9_]*):", match.group(2), re.M))

missing_fields = []
for match in re.finditer(r'\\bdb\\.from\\(["\\']([^"\\']+)["\\']\\)\\s*\\.select\\(["\\']([^"\\']+)["\\']\\)', source):
    table, selection = match.groups()
    if selection.strip() == "*":
        continue
    # Supabase embeds relationships in select strings, e.g.
    # service_orders!inner(order_no,item_type,amount). Validate the
    # embedded columns against the related table rather than treating the
    # whole relationship expression as a column name.
    embedded = re.findall(r'([A-Za-z_][A-Za-z0-9_]*)!inner\\(([^()]*)\\)', selection)
    plain_selection = re.sub(r'[A-Za-z_][A-Za-z0-9_]*!inner\\([^()]*\\)', '', selection)
    for field in plain_selection.split(","):
        field = field.strip().split(":")[-1].split("(")[0].strip()
        if field and field not in table_rows.get(table, set()):
            missing_fields.append(f"{table}.{field}")
    for related_table, related_selection in embedded:
        for field in related_selection.split(","):
            field = field.strip().split(":")[-1].split("(")[0].strip()
            if field and field not in table_rows.get(related_table, set()):
                missing_fields.append(f"{related_table}.{field}")

if missing_fields:
    raise SystemExit("Frontend selects columns absent from generated DB types: " + ", ".join(sorted(set(missing_fields))))

print(f"Frontend DB columns OK: {len(missing_fields) == 0} selected-column references checked.")
