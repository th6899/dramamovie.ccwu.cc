from pathlib import Path
import re
source=Path("admin-v2.0.1.js").read_text(encoding="utf-8")
html=Path("admin.html").read_text(encoding="utf-8")
checks={
 "Supabase client import":'import { createClient } from "https://esm.sh/@supabase/supabase-js@2";' in source,
 "staff role server check":'db.rpc("is_staff")' in source and "data !== true" in source,
 "test project identity guard":'new URL(SUPABASE_URL).hostname === "uvtzhzgirgwjzsmcdgej.supabase.co"' in source,
 "admin page entrypoint":bool(re.search(r'<script type="module" src="admin-v2[.]0[.]1[.]js\\?v=([0-9.]+)"></script>',html)),
 "version markers consistent":'window.CCWU_ADMIN_MODULE_VERSION = "2.2.0"' in source and 'window.CCWU_BUILD_VERSION = "2.2.0"' in source and 'admin-v2.0.1.js?v=2.2.0' in html,
 "episode editor keeps requested fields":all(x in html for x in ('id="dramaTitle"','id="episodeNo"','id="episodeDescription"','id="videoFile"')),
 "subtitle editor keeps requested fields":all(x in html for x in ('id="subtitleDrama"','id="subtitleEpisode"','id="subtitleLanguage"','id="subtitleLabel"','id="subtitleFile"')),
 "affiliate manager removed":'id="affiliate"' not in html and 'id="promoForm"' not in html and "episode_promotions" not in source,
 "AdSense settings use RLS-backed table":'db.from("adsense_settings").upsert' in source and 'id="adsenseForm"' in html,
 "catalog video and file upload paths":all(x in html for x in ('id="serviceVideoFile"','id="serviceAssetFile"','id="tutorialVideoFile"','id="tutorialAssetFile"')) and 'ccwu-catalog-assets' in source,
 "catalog drafts remain unpublished":'is_published:false' in source and 'status:"draft"' in source,
 "QR uploads are retained and test payments stay disabled":'db.from("manual_payment_settings").upsert' in source and 'alipay_enabled:false,wechat_enabled:false' in source and 'id="alipayQrFile"' in html and 'id="wechatQrFile"' in html,
 "catalog readiness check remains":'loadPublicCatalogReadiness' in source and 'id="catalogReadiness"' in html,
 "OAuth callback explicit admin page":'new URL("/admin.html", location.origin).toString()' in source,
}
failed=[k for k,v in checks.items() if not v]
for k,v in checks.items(): print(("OK" if v else "FAIL")+": "+k)
if failed: raise SystemExit("Admin contract validation failed: "+", ".join(failed))
