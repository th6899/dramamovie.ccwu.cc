#!/usr/bin/env python3
"""Validate critical admin bootstrap, staff gate, and empty-settings behavior."""
from pathlib import Path

source = Path("admin-v2.0.1.js").read_text(encoding="utf-8")
html = Path("admin.html").read_text(encoding="utf-8")

checks = {
    "Supabase createClient import": 'import { createClient } from "https://esm.sh/@supabase/supabase-js@2";' in source,
    "host-isolated config import": 'import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";' in source,
    "staff role server check": 'db.rpc("is_staff")' in source and "data !== true" in source,
    "manual settings use maybeSingle": '.eq("id",true).maybeSingle()' in source,
    "empty settings fallback": "const settings=data||{};" in source,
    "manual QR requires an uploaded or saved image before enabling": '&&!currentQrPaths.alipay_qr_path' in source and '&&!currentQrPaths.wechat_qr_path' in source,
    "manual QR settings upsert": 'db.from("manual_payment_settings").upsert' in source,
    "admin uses ES module entrypoint": '<script type="module" src="admin-v2.0.1.js?v=2.0.5"></script>' in html,
}
checks["admin build marker matches release"] = 'window.CCWU_BUILD_VERSION = "2.0.5";' in source
checks["test project identity guard"] = 'new URL(SUPABASE_URL).hostname === "uvtzhzgirgwjzsmcdgej.supabase.co"' in source
checks["admin disables live CNY channels in test"] = 'if(isTestProject&&row.environment!=="test")' in source
checks["admin click handler blocks live CNY enablement"] = 'enable&&isTestProject&&button.dataset.environment!=="test"' in source

checks["manual QR toggles disabled in test project"] = source.count('$("alipayQrEnabled").disabled=isTestProject;') == 1 and source.count('$("wechatQrEnabled").disabled=isTestProject;') == 1
checks["manual QR save blocked in test project"] = 'isTestProject&&($("alipayQrEnabled").checked||$("wechatQrEnabled").checked)' in source

failed = [label for label, ok in checks.items() if not ok]
for label, ok in checks.items():
    print(f"{'OK' if ok else 'FAIL'}: {label}")
if failed:
    raise SystemExit("Admin contract validation failed: " + ", ".join(failed))
