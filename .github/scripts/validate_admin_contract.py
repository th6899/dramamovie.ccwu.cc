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
    "admin uses ES module entrypoint": '<script type="module" src="admin-v2.0.1.js?v=2.0.7"></script>' in html,
}
checks["admin build marker matches release"] = 'window.CCWU_BUILD_VERSION = "2.0.7";' in source
checks["operations console avoids cross-user profile reads"] = 'db.from("profiles").select("id,display_name")' not in source and "Profiles are intentionally owner-readable only" in source
checks["operations console falls back to user IDs"] = source.count('x.user_id?.slice(0, 8) || "—"') >= 3
checks["OAuth callback returns to explicit admin page"] = 'new URL("/admin.html", location.origin).toString()' in source
checks["test project identity guard"] = 'new URL(SUPABASE_URL).hostname === "uvtzhzgirgwjzsmcdgej.supabase.co"' in source
checks["admin disables live CNY channels in test"] = 'if(isTestProject&&row.environment!=="test")' in source
checks["admin click handler blocks live CNY enablement"] = 'enable&&isTestProject&&button.dataset.environment!=="test"' in source

checks["manual QR toggles disabled in test project"] = source.count('$("alipayQrEnabled").disabled=isTestProject;') == 1 and source.count('$("wechatQrEnabled").disabled=isTestProject;') == 1
checks["manual QR save blocked in test project"] = 'isTestProject&&($("alipayQrEnabled").checked||$("wechatQrEnabled").checked)' in source

checks["public catalog readiness notice exists in admin UI"] = 'id="catalogReadiness"' in html
checks["catalog readiness checks all six published content groups"] = all(
    token in source for token in (
        "loadPublicCatalogReadiness",
        'from("dramas")',
        'from("episodes")',
        'from("service_catalog")',
        'from("membership_plans")',
        'from("vpn_plans")',
        'from("tutorials")',
        'count: "exact", head: true',
    )
)
checks["catalog readiness warns against publishing unauthorized placeholders"] = "不要发布占位或未经授权的素材" in source

failed = [label for label, ok in checks.items() if not ok]
for label, ok in checks.items():
    print(f"{'OK' if ok else 'FAIL'}: {label}")
if failed:
    raise SystemExit("Admin contract validation failed: " + ", ".join(failed))
