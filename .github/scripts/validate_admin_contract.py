#!/usr/bin/env python3
"""Validate critical admin bootstrap, staff gate, and empty-settings behavior."""
from pathlib import Path
import re

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
    "admin uses ES module entrypoint": bool(re.search(r'<script type="module" src="admin-v2[.]0[.]1[.]js\?v=([0-9.]+)"></script>', html)),
}

# Keep the release contract version-agnostic: admin releases may advance without
# requiring a separate hard-coded CI edit for every patch version.
module_version = re.search(r'window[.]CCWU_ADMIN_MODULE_VERSION = "([0-9.]+)";', source)
build_version = re.search(r'window[.]CCWU_BUILD_VERSION = "([0-9.]+)";', source)
html_title_version = re.search(r'<title>CCWU Global 管理后台 v([0-9.]+)</title>', html)
html_footer_version = re.search(r'CCWU Global · Admin Build v([0-9.]+)', html)
html_script_version = re.search(r'<script type="module" src="admin-v2[.]0[.]1[.]js\?v=([0-9.]+)"></script>', html)
checks["admin build marker matches release"] = bool(build_version and module_version and build_version.group(1) == module_version.group(1))
checks["admin module version matches release"] = bool(module_version and html_script_version and module_version.group(1) == html_script_version.group(1))
checks["admin document title and footer match release"] = bool(module_version and html_title_version and html_footer_version and module_version.group(1) == html_title_version.group(1) == html_footer_version.group(1))
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

checks["digital service form and list are wired"] = all(token in html for token in ('id="serviceCatalogForm"', 'id="serviceCatalogRows"', 'id="serviceCatalogMsg"')) and '$("serviceCatalogForm").addEventListener("submit"' in source
checks["tutorial form and list are wired"] = all(token in html for token in ('id="tutorialForm"', 'id="tutorialRows"', 'id="tutorialMsg"')) and '$("tutorialForm").addEventListener("submit"' in source
checks["catalog inserts remain unpublished drafts"] = 'is_published:false' in source and 'status:"draft"' in source
checks["catalog save catches errors and restores submit state"] = 'async function submitCatalogDraft' in source and 'catch(error)' in source and 'finally {' in source and 'if(submit)submit.disabled=false;' in source
checks["catalog publish controls prevent duplicate clicks and report failures"] = 'if(!b||b.disabled)return;' in source and '目录状态更新失败：' in source
checks["catalog state refreshes readiness after successful mutations"] = 'await loadAdditionalCatalogs();' in source and 'await loadPublicCatalogReadiness();' in source
checks["catalog save distinguishes successful insert from refresh failure"] = '记录已保存，但列表刷新失败：' in source
checks["catalog publish distinguishes successful update from refresh failure"] = '目录状态已更新，但列表刷新失败：' in source and '目录状态更新失败：' in source

failed = [label for label, ok in checks.items() if not ok]
for label, ok in checks.items():
    print(f"{'OK' if ok else 'FAIL'}: {label}")
if failed:
    raise SystemExit("Admin contract validation failed: " + ", ".join(failed))
