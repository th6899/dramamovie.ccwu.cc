from pathlib import Path
import re

files = sorted(Path("supabase/migrations").glob("*.sql"))
if not files:
    raise SystemExit("No SQL migration files found.")
versions = []
for path in files:
    match = re.match(r"^(\d{14})_", path.name)
    if not match:
        raise SystemExit(f"Invalid migration filename: {path.name}")
    versions.append(match.group(1))
if len(versions) != len(set(versions)):
    raise SystemExit("Duplicate migration version prefixes found.")
print(f"Migration source integrity passed: {len(files)} files, unique 14-digit versions.")
