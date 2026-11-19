#!/usr/bin/env python3
"""Ensure browser DB table/RPC references exist in the generated Supabase schema types."""
from pathlib import Path
import re

files = ["app.js", "admin-v2.0.1.js", "player.js", "payment-result.js"]
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
