#!/usr/bin/env python3
"""Check literal DOM ID references in the portal's static HTML/JS entrypoints."""
from collections import Counter
from pathlib import Path
import re

pairs = [
    ("admin.html", "admin-v2.0.1.js"),
    ("index.html", "app.js"),
    ("player.html", "player.js"),
    ("payment-result.html", "payment-result.js"),
]
failed = False
for html_name, js_name in pairs:
    html_path, js_path = Path(html_name), Path(js_name)
    if not html_path.is_file() or not js_path.is_file():
        raise SystemExit(f"Missing DOM audit input: {html_name} or {js_name}")
    html = html_path.read_text(encoding="utf-8")
    js = js_path.read_text(encoding="utf-8")
    ids = re.findall(r"\bid=[\"']([^\"']+)[\"']", html)
    counts = Counter(ids)
    duplicates = sorted(key for key, count in counts.items() if count > 1)
    refs = set(re.findall(r"\$\([\"']([^\"']+)[\"']\)", js))
    missing = sorted(refs - set(ids))
    if duplicates or missing:
        failed = True
        print(f"{html_name} / {js_name}: duplicate IDs={duplicates}; missing DOM IDs={missing}")
    else:
        print(f"{html_name} / {js_name}: {len(ids)} unique IDs; all literal JS references resolve.")
if failed:
    raise SystemExit("DOM contract validation failed.")
