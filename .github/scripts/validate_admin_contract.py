from pathlib import Path
import re
source=Path("admin-v2.0.1.js").read_text(encoding="utf-8")
html=Path("admin.html").read_text(encoding="utf-8")
app=Path("app.js").read_text(encoding="utf-8")
checks={
 "Supabase client import":'import { createClient } from "https://esm.sh/@supabase/supabase-js@2";' in source,
 "staff role server check":'db.rpc("is_staff")' in source and "data !== true" in source,
 "test project identity guard":'new URL(SUPABASE_URL).hostname === "uvtzhzgirgwjzsmcdgej.supabase.co"' in source,
 "admin page entrypoint":bool(re.search(r'<script type="module" src="admin-v2[.]0[.]1[.]js\?v=([0-9.]+)"></script>',html)),
 "version markers consistent":'window.CCWU_ADMIN_MODULE_VERSION = "2.2.7"' in source and 'window.CCWU_BUILD_VERSION = "2.2.7"' in source and 'admin-v2.0.1.js?v=2.2.7' in html,
 "video upload avoids TUS Blob source mismatch":'db.storage.from(bucket).upload(path, file' in source and 'tus-js-client' not in source,
 "subtitle selectors expose edit and delete controls":all(x in html for x in ('data-edit-selected-drama','data-delete-selected-drama','data-edit-selected-episode','data-delete-selected-episode')) and 'data-edit-selected-drama' in source and 'data-delete-selected-episode' in source,
 "episode editor keeps requested fields":all(x in html for x in ('id="dramaTitle"','id="episodeNo"','id="episodeDescription"','id="videoFile"')),
 "subtitle editor keeps requested fields":all(x in html for x in ('id="subtitleDrama"','id="subtitleEpisode"','id="subtitleLanguage"','id="subtitleLabel"','id="subtitleFile"')),
 "affiliate manager removed":'id="affiliate"' not in html and 'id="promoForm"' not in html and "episode_promotions" not in source,
 "AdSense settings use RLS-backed table":'db.from("adsense_settings").upsert' in source and 'id="adsenseForm"' in html,
 "catalog video and file upload paths":all(x in html for x in ('id="serviceVideoFile"','id="serviceAssetFile"','id="tutorialVideoFile"','id="tutorialAssetFile"')) and 'ccwu-catalog-assets' in source,
 "catalog drafts remain unpublished":'is_published:false' in source and 'status:"draft"' in source,
 "QR uploads are retained and test payments stay disabled":'db.from("manual_payment_settings").upsert' in source and 'alipay_enabled:false,wechat_enabled:false' in source and 'id="alipayQrFile"' in html and 'id="wechatQrFile"' in html,
 "manual payment review is wired to secure approval and rejection RPCs":all(x in html for x in ('id="manualPaymentRows"','id="refreshManualPayments"','id="manualPaymentReviewMsg"')) and 'db.from("manual_payment_submissions")' in source and 'db.rpc("approve_manual_payment"' in source and 'db.rpc("reject_manual_payment"' in source and 'ccwu-payment-proofs' in source and 'await loadManualPaymentSubmissions();' in source,
 "publish updates detect zero-row RLS results":
  'select("id,status").maybeSingle()' in source and '发布失败：数据库没有返回更新记录' in source,
 "admin table text contrast and publish feedback":
  'id="dramaMsg"' in html and 'id="episodeStatusMsg"' in html,
 "homepage has five fixed category shelves": all(('name:"'+x+'"') in app for x in ("选推荐","最新上线","热门短剧","电影专区","纪录片")),
 "homepage only lists published dramas with published episodes":'episodes!inner(id)' in app and 'eq("episodes.status","published")' in app,
 "five dedicated homepage upload channels": all(('data-upload-category="'+x+'"') in html for x in ("选推荐","最新上线","热门短剧","电影专区","纪录片")) and 'id="dramaCategory"' in html and 'type="hidden"' in html and 'activeUploadCategory="选推荐"' in source and 'category===category' in source and 'category,status:"draft"' in source,
 "episode-first workflow hides separate drama list":'<div class="hidden" aria-hidden="true"><table><tbody id="dramaRows"></tbody></table></div>' in html and "逐集上传视频" in html,
 "episode publishing auto-publishes parent drama":'自动发布所属剧名失败' in source and 'parent.status = "published"' in source,
 "catalog readiness check remains":'loadPublicCatalogReadiness' in source and 'id="catalogReadiness"' in html,
 "OAuth callback explicit admin page":'new URL("/admin.html", location.origin).toString()' in source,
}
failed=[k for k,v in checks.items() if not v]
for k,v in checks.items(): print(("OK" if v else "FAIL")+": "+k)
if failed: raise SystemExit("Admin contract validation failed: "+", ".join(failed))
