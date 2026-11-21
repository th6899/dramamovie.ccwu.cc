window.CCWU_ADMIN_MODULE_VERSION = "2.1.0";
console.info("[CCWU Admin] ES module 2.1.0 loaded");
// CCWU Global Admin module 2.0.9 — explicit ES module entrypoint
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Upload } from "https://esm.sh/tus-js-client@4";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const isTestProject = (() => {
  try { return new URL(SUPABASE_URL).hostname === "uvtzhzgirgwjzsmcdgej.supabase.co"; }
  catch { return false; }
})();
window.CCWU_BUILD_VERSION = "2.1.0";
const $ = (id) => document.getElementById(id);
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));
const setMessage = (id, value, isError = false) => {
  const node = $(id);
  node.textContent = value;
  node.classList.toggle("error-message", isError);
};
const showError = (label, error) => `${label}：${error?.message || "读取失败，请检查权限或网络"}`;

async function uploadResumable(bucket, path, file, onProgress = () => {}) {
  const { data: { session }, error } = await db.auth.getSession();
  if (error || !session?.access_token) throw new Error("登录状态已失效，请重新登录后台。");
  return await new Promise((resolve, reject) => {
    const upload = new Upload(file, {
      endpoint: `${SUPABASE_URL}/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: { authorization: `Bearer ${session.access_token}`, apikey: SUPABASE_ANON_KEY },
      metadata: { bucketName: bucket, objectName: path, contentType: file.type, cacheControl: "3600", upsert: "false" },
      chunkSize: 6 * 1024 * 1024,
      onError: reject,
      onProgress: (uploaded, total) => onProgress(Math.round(uploaded / Math.max(total, 1) * 100)),
      onSuccess: () => resolve(path)
    });
    upload.start();
  });
}
async function getVideoDuration(file) {
  return await new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);
    const cleanup = () => URL.revokeObjectURL(objectUrl);
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const duration = video.duration;
      cleanup();
      if (Number.isFinite(duration) && duration > 0) resolve(Math.round(duration));
      else reject(new Error("无法读取视频时长，请检查视频文件是否完整。"));
    };
    video.onerror = () => {
      cleanup();
      reject(new Error("无法读取视频文件信息，请确认文件可正常播放。"));
    };
    video.src = objectUrl;
  });
}

let currentUser = null;
let cache = { dramas: [], episodes: [], ads: [], promos: [] };

$("githubLogin").addEventListener("click", async () => {
  const button = $("githubLogin");
  button.disabled = true;
  button.textContent = "正在跳转 GitHub…";
  setMessage("loginMsg", "正在前往 GitHub 验证管理员身份……");
  try {
    const { error } = await db.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: new URL("/admin.html", location.origin).toString() }
    });
    if (error) throw error;
  } catch (error) {
    console.error("[CCWU Admin] GitHub OAuth failed", error);
    setMessage("loginMsg", error?.message || "GitHub 登录启动失败。", true);
    button.disabled = false;
    button.textContent = "使用 GitHub 登录管理员账户";
  }
});

$("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = event.submitter || $("loginForm").querySelector('button[type="submit"], button:not([type])');
  const originalLabel = submitButton?.textContent || "登录后台";
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "正在验证…";
  }
  setMessage("loginMsg", "正在验证账号……");
  try {
    const { data, error } = await db.auth.signInWithPassword({
      email: $("email").value.trim(),
      password: $("password").value
    });
    if (error) {
      setMessage("loginMsg", error.message || "登录失败，请检查账号和密码。", true);
      return;
    }
    if (!data?.user) {
      setMessage("loginMsg", "登录服务未返回有效用户，请重试。", true);
      return;
    }
    await checkStaff(data.user);
  } catch (error) {
    console.error("[CCWU Admin] Login failed", error);
    setMessage("loginMsg", error?.message || "登录请求失败，请检查网络后重试。", true);
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = originalLabel;
    }
  }
});

$("logout").addEventListener("click", async () => {
  await db.auth.signOut();
  location.reload();
});

async function checkStaff(user) {
  currentUser = user;
  const provider = user?.app_metadata?.provider || user?.identities?.[0]?.provider || "unknown";
  const { data, error } = await db.rpc("is_staff");
  if (error || data !== true) {
    // Keep the authenticated session for safe diagnostics. No dashboard data or
    // write controls are exposed unless the server-side is_staff RPC returns true.
    const projectRef = (() => {
      try { return new URL(SUPABASE_URL).hostname.split(".")[0]; }
      catch { return "unknown"; }
    })();
    const details = [
      "GitHub 身份认证已完成，但管理员权限核验未通过。",
      `邮箱：${user?.email || "未返回"}`,
      `Supabase UID：${user?.id || "未返回"}`,
      `登录提供方：${provider}`,
      `当前 Supabase 项目：${projectRef}`,
      `is_staff() 返回：${error ? "调用错误" : String(data)}`,
      error ? `权限接口错误：${error.message}` : "请核对该 UID 是否拥有 private.user_roles 中的 admin/editor/support 角色。"
    ];
    setMessage("loginMsg", details.join(" | "), true);
    console.warn("[CCWU Admin] Staff check failed", {
      userId: user?.id, email: user?.email, provider, projectRef,
      isStaff: data, error: error?.message || null
    });
    return;
  }
  $("loginPanel").classList.add("hidden");
  $("dashboard").classList.remove("hidden");
  $("adminUser").textContent = user.email || "管理员";
  setMessage("loginMsg", "");
  await loadAll();
}

function fillSelect(id, options, emptyText) {
  const node = $(id);
  node.innerHTML = options.length
    ? options.map((item) => `<option value="${esc(item.value)}">${esc(item.label)}</option>`).join("")
    : `<option value="">${esc(emptyText)}</option>`;
  node.disabled = options.length === 0;
}

async function loadPublicCatalogReadiness() {
  const checks = [
    { label: "已发布影视作品", query: () => db.from("dramas").select("id", { count: "exact", head: true }).eq("status", "published") },
    { label: "已发布剧集", query: () => db.from("episodes").select("id", { count: "exact", head: true }).eq("status", "published") },
    { label: "已上架数字服务", query: () => db.from("service_catalog").select("id", { count: "exact", head: true }).eq("is_published", true) },
    { label: "已上架会员套餐", query: () => db.from("membership_plans").select("id", { count: "exact", head: true }).eq("is_active", true) },
    { label: "已上架 VPN 套餐", query: () => db.from("vpn_plans").select("id", { count: "exact", head: true }).eq("is_active", true) },
    { label: "已发布教程", query: () => db.from("tutorials").select("id", { count: "exact", head: true }).eq("status", "published") }
  ];
  const node = $("catalogReadiness");
  if (!node) return;
  node.textContent = "正在检查公开目录发布状态……";
  const results = await Promise.all(checks.map(async (item) => ({ label: item.label, ...(await item.query()) })));
  const errors = results.filter((item) => item.error);
  if (errors.length) {
    node.textContent = "目录状态检查不完整：" + errors.map((item) => item.label).join("、") + "读取失败。请检查管理员读取权限后重试。";
    return;
  }
  const empty = results.filter((item) => (item.count || 0) === 0).map((item) => item.label);
  node.textContent = empty.length
    ? "公开目录尚未就绪：" + empty.join("、") + "目前没有可供访客浏览的已发布内容。请在对应管理模块补充并审核真实内容；不要发布占位或未经授权的素材。"
    : "公开目录检查通过：" + results.map((item) => item.label + " " + item.count + " 项").join("；") + "。";
}

async function loadAll() {
  $("overviewText").textContent = "正在读取数据库……";
  const results = await Promise.all([
    db.from("dramas").select("id,slug,title,status,created_at,poster_path").order("created_at", { ascending: false }),
    db.from("episodes").select("id,drama_id,title,episode_number,season_number,status,video_path,duration_seconds").order("created_at", { ascending: false }),
    db.from("video_ad_configs").select("id,episode_id,slot_key,ad_type,is_active,ad_tag_url,created_at").order("created_at", { ascending: false }),
    db.from("episode_promotions").select("id,episode_id,title,target_url,is_active,created_at").order("created_at", { ascending: false })
  ]);
  const labels = ["影视作品", "剧集", "广告配置", "推广链接"];
  const keys = ["dramas", "episodes", "ads", "promos"];
  const errors = [];
  results.forEach((result, index) => {
    if (result.error) errors.push(showError(labels[index], result.error));
    cache[keys[index]] = result.data || [];
  });

  $("kpiDramas").textContent = results[0].error ? "—" : cache.dramas.length;
  $("kpiEpisodes").textContent = results[1].error ? "—" : cache.episodes.length;
  $("kpiAds").textContent = results[2].error ? "—" : cache.ads.length;
  $("kpiPromos").textContent = results[3].error ? "—" : cache.promos.length;
  $("overviewText").textContent = errors.length
    ? `部分数据暂不可读取：${errors.join("；")}`
    : "数据库连接正常，概览数据已更新。";
  await loadPublicCatalogReadiness();
  await loadAdditionalCatalogs();

  $("dramaRows").innerHTML = cache.dramas.map((drama) =>
    `<tr><td>${esc(drama.title)}</td><td><span class="status">${esc(drama.status)}</span></td><td>${drama.created_at ? new Date(drama.created_at).toLocaleDateString() : "—"}</td><td><button type="button" class="btn btn-secondary" data-toggle-drama="${esc(drama.id)}" data-next-status="${drama.status === "published" ? "draft" : "published"}">${drama.status === "published" ? "下架" : "发布"}</button></td></tr>`
  ).join("") || `<tr><td colspan="3">${results[0].error ? "读取失败" : "暂无影视作品"}</td></tr>`;

  fillSelect("dramaSelect", cache.dramas.map((drama) => ({
    value: drama.id, label: drama.title
  })), "暂无影视作品");
  const dramaSelect = $("dramaSelect");
  dramaSelect.insertAdjacentHTML("afterbegin", '<option value="__new__">＋ 新建影视作品</option>');
  dramaSelect.disabled = false;
  if (!dramaSelect.value || dramaSelect.value === "__new__") dramaSelect.value = cache.dramas[0]?.id || "__new__";
  $("dramaTitle").value = cache.dramas.find((item) => item.id === dramaSelect.value)?.title || "";
  $("dramaTitle").readOnly = dramaSelect.value !== "__new__";
  const dramaById = new Map(cache.dramas.map((drama) => [drama.id, drama.title]));
  $("episodeRows").innerHTML = cache.episodes.map((episode) => {
    const next = episode.status === "published" ? "draft" : "published";
    return `<tr><td>${esc(`第${episode.episode_number}集 · ${episode.title}`)}</td><td>${esc(dramaById.get(episode.drama_id) || "—")}</td><td><span class="status">${esc(episode.status)}</span></td><td>${episode.video_path ? "已填写路径" : "未配置"}</td><td><button type="button" class="btn btn-secondary" data-toggle-episode="${esc(episode.id)}" data-next-status="${next}">${next === "draft" ? "下架" : "发布"}</button></td></tr>`;
  }).join("") || `<tr><td colspan="5">${results[1].error ? "读取失败" : "暂无剧集"}</td></tr>`;
  const episodeOptions = cache.episodes.map((episode) => ({
    value: episode.id,
    label: `${dramaById.get(episode.drama_id) || "未命名作品"} · ${episode.title || `第${episode.episode_number}集`}`
  }));
  const latestEpisode = cache.episodes[0];
  $("promoEpisodeContext").textContent = latestEpisode
    ? `当前自动关联最近上传剧集：${dramaById.get(latestEpisode.drama_id) || "未命名作品"} · 第${latestEpisode.episode_number}集 · ${latestEpisode.title || "未命名剧集"}`
    : "请先上传至少一集视频，推广链接会自动关联最近上传的剧集。";
  fillSelect("subtitleEpisode", episodeOptions, "请先新增剧集");
  fillSelect("adEpisode", episodeOptions, "全站默认");

  $("adRows").innerHTML = cache.ads.map((ad) =>
    `<tr><td>${esc(ad.ad_type)}</td><td>${ad.episode_id ? "指定剧集" : "全站默认"}</td><td><span class="status">${ad.is_active ? "启用" : "关闭"}</span></td><td>${esc((ad.ad_tag_url || "").slice(0, 48) || "未设置")}</td></tr>`
  ).join("") || `<tr><td colspan="4">${results[2].error ? "读取失败" : "暂无广告配置"}</td></tr>`;

  $("promoRows").innerHTML = cache.promos.map((promo) => {
    const episode = cache.episodes.find((item) => item.id === promo.episode_id);
    const safeUrl = /^https?:\/\//i.test(promo.target_url || "") ? promo.target_url : "";
    return `<tr><td>${esc(promo.title)}</td><td>${esc(episode?.title || "—")}</td><td><span class="status">${promo.is_active ? "启用" : "关闭"}</span></td><td>${safeUrl ? `<a target="_blank" rel="noopener noreferrer" href="${esc(safeUrl)}">打开链接</a>` : "无有效链接"}</td></tr>`;
  }).join("") || `<tr><td colspan="4">${results[3].error ? "读取失败" : "暂无推广配置"}</td></tr>`;
}


async function loadAdditionalCatalogs() {
 const [services,tutorials]=await Promise.all([
  db.from("service_catalog").select("id,slug,title,category,is_published").order("created_at",{ascending:false}),
  db.from("tutorials").select("id,slug,title,category,status").order("created_at",{ascending:false})
 ]);
 $("serviceCatalogRows").innerHTML=services.error?'<tr><td colspan="5">'+esc(services.error.message)+'</td></tr>':(services.data||[]).map(x=>'<tr><td>'+esc(x.title)+'</td><td>'+esc(x.slug)+'</td><td>'+esc(x.category)+'</td><td>'+(x.is_published?'已发布':'草稿')+'</td><td><button class="btn btn-outline" type="button" data-catalog-toggle="service" data-id="'+esc(x.id)+'" data-active="'+x.is_published+'">'+(x.is_published?'下架':'发布')+'</button></td></tr>').join('')||'<tr><td colspan="5">暂无数字服务</td></tr>';
 $("tutorialRows").innerHTML=tutorials.error?'<tr><td colspan="5">'+esc(tutorials.error.message)+'</td></tr>':(tutorials.data||[]).map(x=>'<tr><td>'+esc(x.title)+'</td><td>'+esc(x.slug)+'</td><td>'+esc(x.category)+'</td><td>'+esc(x.status)+'</td><td><button class="btn btn-outline" type="button" data-catalog-toggle="tutorial" data-id="'+esc(x.id)+'" data-active="'+(x.status==='published')+'">'+(x.status==='published'?'下架':'发布')+'</button></td></tr>').join('')||'<tr><td colspan="5">暂无教程</td></tr>';
}
async function submitCatalogDraft(event,{formId,messageId,table,buildRow,successMessage,resetForm}) {
 event.preventDefault();
 const form=$(formId),submit=form.querySelector('button[type="submit"]');
 if(submit)submit.disabled=true;
 try {
  const slug=$(formId==="serviceCatalogForm"?"serviceSlug":"tutorialSlug").value.trim().toLowerCase();
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)){
   setMessage(messageId,"Slug 仅允许小写字母、数字和连字符。",true);return;
  }
  const {error}=await db.from(table).insert(buildRow(slug));
  if(error)throw error;
  form.reset();
  if(resetForm)resetForm();
  setMessage(messageId,successMessage);
  try {
   await loadAdditionalCatalogs();
   await loadPublicCatalogReadiness();
  } catch(refreshError) {
   setMessage(messageId,successMessage+" 记录已保存，但列表刷新失败："+(refreshError?.message||"请手动刷新页面。"),true);
  }
 } catch(error) {
  setMessage(messageId,error?.message||"保存失败，请稍后重试。",true);
 } finally {
  if(submit)submit.disabled=false;
 }
}
$("serviceCatalogForm").addEventListener("submit",event=>submitCatalogDraft(event,{
 formId:"serviceCatalogForm",messageId:"serviceCatalogMsg",table:"service_catalog",
 buildRow:slug=>({slug,title:$("serviceTitle").value.trim(),category:$("serviceCategory").value.trim(),description:$("serviceDescription").value.trim()||null,is_published:false}),
 successMessage:"数字服务已保存为草稿。"
}));
$("tutorialForm").addEventListener("submit",event=>submitCatalogDraft(event,{
 formId:"tutorialForm",messageId:"tutorialMsg",table:"tutorials",
 buildRow:slug=>({slug,title:$("tutorialTitle").value.trim(),category:$("tutorialCategory").value.trim(),summary:$("tutorialSummary").value.trim()||null,body_md:$("tutorialBody").value.trim()||null,resource_path:$("tutorialResource").value.trim()||null,status:"draft"}),
 successMessage:"教程已保存为草稿。",
 resetForm:()=>{$("tutorialCategory").value="general";}
}));
document.addEventListener("click",async event=>{
 const b=event.target instanceof Element?event.target.closest("[data-catalog-toggle]"):null;
 if(!b||b.disabled)return;
 const service=b.dataset.catalogToggle==="service",table=service?"service_catalog":"tutorials",next=b.dataset.active!=="true";
 b.disabled=true;
 try {
  const {error}=await db.from(table).update(service?{is_published:next}:{status:next?"published":"draft"}).eq("id",b.dataset.id);
  if(error)throw error;
  try {
   await loadAdditionalCatalogs();
   await loadPublicCatalogReadiness();
  } catch(refreshError) {
   alert("目录状态已更新，但列表刷新失败："+(refreshError?.message||"请手动刷新页面。"));
  }
 } catch(error) {
  alert("目录状态更新失败："+(error?.message||"请稍后重试。"));
 } finally {
  b.disabled=false;
 }
});

async function updateContentStatus(table, id, nextStatus, messageId) {
  const row = table === "dramas" ? cache.dramas.find((item) => item.id === id) : cache.episodes.find((item) => item.id === id);
  if (!row) return;
  if (nextStatus === "published") {
    if (table === "episodes") {
      if (!row.video_path || /^https?:\/\//i.test(row.video_path)) return setMessage(messageId, "发布失败：请先上传视频或填写有效的 Storage 相对路径。", true);
      const parent = cache.dramas.find((item) => item.id === row.drama_id);
      if (parent?.status !== "published") return setMessage(messageId, "发布失败：请先发布所属影视作品。", true);
      if (!row.duration_seconds || row.duration_seconds < 1) return setMessage(messageId, "发布失败：请先填写有效的视频时长。", true);
    }
  }
  const values = table === "dramas" ? { status: nextStatus, published_at: nextStatus === "published" ? new Date().toISOString() : null } : { status: nextStatus };
  const { error } = await db.from(table).update(values).eq("id", id);
  if (error) setMessage(messageId, "状态更新失败：" + error.message, true);
  else { setMessage(messageId, nextStatus === "published" ? "内容已发布。" : "内容已下架。"); await loadAll(); }
}

document.addEventListener("click", async (event) => {
  const dramaButton = event.target.closest("[data-toggle-drama]");
  if (dramaButton) { dramaButton.disabled = true; try { await updateContentStatus("dramas", dramaButton.dataset.toggleDrama, dramaButton.dataset.nextStatus, "dramaMsg"); } finally { dramaButton.disabled = false; } return; }
  const episodeButton = event.target.closest("[data-toggle-episode]");
  if (episodeButton) { episodeButton.disabled = true; try { await updateContentStatus("episodes", episodeButton.dataset.toggleEpisode, episodeButton.dataset.nextStatus, "episodeMsg"); } finally { episodeButton.disabled = false; } }
});
$("dramaSelect").addEventListener("change", () => {
  const selected = cache.dramas.find((item) => item.id === $("dramaSelect").value);
  $("dramaTitle").value = selected?.title || "";
  $("dramaTitle").readOnly = Boolean(selected);
});

$("episodeForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const submit = event.submitter || event.target.querySelector("button");
  if (submit) submit.disabled = true;
  let uploadedVideoPath = null;
  let createdDramaId = null;
  let episodeSaved = false;
  try {
    const selectedDramaId = $("dramaSelect").value;
    const title = $("dramaTitle").value.trim();
    const file = $("videoFile").files?.[0];
    const episodeNumber = Number($("episodeNo").value);
    const episodeTitle = $("episodeTitle").value.trim();
    if (!title) throw new Error("请输入剧名。");
    if (!Number.isInteger(episodeNumber) || episodeNumber < 1) throw new Error("请输入有效集数。");
    if (!episodeTitle) throw new Error("请输入剧集标题。");
    if (!file) throw new Error("请选择 MP4 或 WebM 视频文件。");
    if (!["video/mp4", "video/webm"].includes(file.type) || file.size > 50 * 1024 * 1024) {
      throw new Error("视频仅支持 MP4/WebM，单文件最大 50MB（免费项目限制）。");
    }
    const videoDuration = await getVideoDuration(file);
    let dramaId = selectedDramaId;
    if (selectedDramaId === "__new__") {
      const slug = "drama-" + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
      const { data: drama, error: dramaError } = await db.from("dramas").insert({
        title, slug, synopsis: null, poster_path: null, release_year: null, status: "draft"
      }).select("id").single();
      if (dramaError) throw dramaError;
      dramaId = drama.id;
      createdDramaId = dramaId;
    }
    if (!dramaId) throw new Error("请选择所属剧集，或选择新建影视作品。");
    uploadedVideoPath = `episodes/${dramaId}/${crypto.randomUUID()}.${file.type === "video/mp4" ? "mp4" : "webm"}`;
    setMessage("episodeMsg", "正在上传视频：0%，请保持页面打开……");
    await uploadResumable("ccwu-cinema-videos", uploadedVideoPath, file, (percent) =>
      setMessage("episodeMsg", `正在上传视频：${percent}%`)
    );
    const { error } = await db.from("episodes").insert({
      drama_id: dramaId, season_number: 1,
      episode_number: episodeNumber,
      title: episodeTitle,
      video_path: uploadedVideoPath, duration_seconds: videoDuration,
      is_free: false, status: "draft"
    });
    if (error) throw error;
    episodeSaved = true;
    setMessage("episodeMsg", `上传成功。视频路径：${uploadedVideoPath}。剧集已保存为草稿。`);
    event.target.reset();
    await loadAll();
    $("dramaSelect").value = dramaId;
    $("dramaTitle").value = cache.dramas.find((item) => item.id === dramaId)?.title || title;
    $("dramaTitle").readOnly = true;
  } catch (error) {
    if (!episodeSaved && uploadedVideoPath) await db.storage.from("ccwu-cinema-videos").remove([uploadedVideoPath]);
    if (!episodeSaved && createdDramaId) await db.from("dramas").delete().eq("id", createdDramaId);
    setMessage("episodeMsg", error?.message || "视频上传失败。", true);
  } finally { if (submit) submit.disabled = false; }
});

$("subtitleForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const submit = event.submitter || event.target.querySelector("button[type=submit],button:not([type])");
  if (submit) submit.disabled = true;
  let uploadedPath = null;
  try {
    const episodeId = $("subtitleEpisode").value;
    const file = $("subtitleFile").files?.[0];
    const language = $("subtitleLanguage").value;
    if (!episodeId || !file) throw new Error("请选择剧集和字幕文件。");
    const lowerName = file.name.toLowerCase();
    const ext = lowerName.endsWith(".srt") ? "srt" : lowerName.endsWith(".vtt") ? "vtt" : "";
    if (!ext || file.size > 2 * 1024 * 1024) throw new Error("字幕仅支持 VTT/SRT，原文件不能超过 2MB。");
    const rawText = (await file.text()).replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim();
    let webVttText = rawText;
    if (ext === "srt") {
      const cuePattern = /\d{2}:\d{2}:\d{2},\d{3}\s+-->\s+\d{2}:\d{2}:\d{2},\d{3}/g;
      if (!cuePattern.test(rawText)) throw new Error("SRT 字幕格式无效，未找到有效时间轴。");
      webVttText = "WEBVTT\n\n" + rawText.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2 --> $3.$4");
    } else if (!/^WEBVTT(?:\s|$)/.test(rawText)) {
      throw new Error("VTT 文件必须以 WEBVTT 标头开头。");
    }
    const subtitleBlob = new Blob([webVttText + "\n"], { type: "text/vtt" });
    if (subtitleBlob.size > 2 * 1024 * 1024) throw new Error("转换后的 WebVTT 字幕不能超过 2MB。");
    uploadedPath = "episodes/" + episodeId + "/subtitles/" + language + "-" + crypto.randomUUID() + ".vtt";
    const { error: uploadError } = await db.storage.from("ccwu-cinema-subtitles").upload(uploadedPath, subtitleBlob, { cacheControl: "3600", upsert: false, contentType: "text/vtt" });
    if (uploadError) throw uploadError;
    const { error } = await db.from("subtitle_tracks").insert({ episode_id: episodeId, language_code: language, label: $("subtitleLabel").value.trim(), file_url: uploadedPath, storage_path: uploadedPath, status: "published", reviewed_by: currentUser.id });
    if (error) {
      await db.storage.from("ccwu-cinema-subtitles").remove([uploadedPath]);
      throw error;
    }
    setMessage("subtitleMsg", "字幕已上传并发布。");
    event.target.reset();
  } catch (error) {
    setMessage("subtitleMsg", error?.message || "字幕上传失败。", true);
  } finally { if (submit) submit.disabled = false; }
});

$("adType").addEventListener("change", () => {
  $("adOffsetField").hidden = $("adType").value !== "midroll";
});
$("adForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const adType = $("adType").value;
  const midrollOffset = Number($("adOffset").value);
  if (adType === "midroll" && (!Number.isFinite(midrollOffset) || midrollOffset <= 0)) {
    setMessage("adMsg", "中插广告必须填写大于 0 的插播秒数。", true);
    return;
  }
  const { error } = await db.from("video_ad_configs").insert({
    episode_id: $("adEpisode").value || null,
    slot_key: "default-video",
    ad_type: adType,
    ad_provider: "google_ima",
    ad_tag_url: $("adTag").value.trim(),
    midroll_offset_seconds: adType === "midroll" ? midrollOffset : null,
    frequency_cap_hours: 0,
    members_exempt: true,
    is_active: $("adActive").checked
  });
  setMessage("adMsg", error ? error.message : "广告配置已保存。注意：保存配置不代表广告已获批或可真实投放。", !!error);
  if (!error) {
    event.target.reset();
    $("adOffsetField").hidden = true;
    await loadAll();
  }
});

$("promoForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const episode = cache.episodes[0];
  if (!episode) {
    setMessage("promoMsg", "请先上传至少一集视频，再添加推广链接。", true);
    return;
  }
  const submit = event.submitter || event.target.querySelector("button");
  if (submit) submit.disabled = true;
  try {
    const targetUrl = $("promoUrl").value.trim();
    if (!/^https:\/\//i.test(targetUrl)) throw new Error("推广链接必须使用 HTTPS 地址。");
    const { error } = await db.from("episode_promotions").insert({
      episode_id: episode.id,
      title: $("promoTitle").value.trim(),
      description: $("promoDesc").value.trim() || null,
      target_url: targetUrl,
      button_label: "立即了解",
      placement: $("promoPlacement").value,
      affiliate_network: null,
      disclosure_text: "推广链接可能产生佣金",
      sort_order: 0,
      is_active: true
    });
    if (error) throw error;
    setMessage("promoMsg", "推广配置已保存，并自动关联最近上传的剧集。");
    event.target.reset();
    await loadAll();
  } catch (error) {
    setMessage("promoMsg", error?.message || "保存推广配置失败。", true);
  } finally {
    if (submit) submit.disabled = false;
  }
});


// Currency display supports USD and CNY while preserving each plan's stored currency.
const formatPlanPrice = (amount, currency) => {
  const code = String(currency || "USD").toUpperCase();
  const symbol = code === "CNY" ? "¥" : code === "USD" ? "$" : `${code} `;
  return `${symbol}${Number(amount).toFixed(2)} ${code}`;
};

// Staff-only plan editor. Database RLS policies authorize staff writes.
async function loadPlans() {
  const [members, vpns] = await Promise.all([
    db.from("membership_plans").select("id,code,name,price_amount,currency,duration_days,is_active").order("created_at", { ascending: false }),
    db.from("vpn_plans").select("id,code,name,price_amount,currency,duration_days,device_limit,is_active").order("created_at", { ascending: false })
  ]);
  $("memberPlanRows").innerHTML = members.error
    ? `<tr><td colspan="6">${esc(members.error.message)}</td></tr>`
    : (members.data || []).map((x) => `<tr><td>${esc(x.name)}</td><td>${esc(x.code)}</td><td>${esc(formatPlanPrice(x.price_amount, x.currency))}</td><td>${x.duration_days} 天</td><td><span class="status">${x.is_active ? "上架" : "已停用"}</span></td><td><button class="btn btn-outline" type="button" data-toggle-plan="membership" data-id="${esc(x.id)}" data-active="${x.is_active}">${x.is_active ? "停用" : "上架"}</button></td></tr>`).join("") || `<tr><td colspan="6">暂无会员套餐</td></tr>`;
  $("vpnPlanRows").innerHTML = vpns.error
    ? `<tr><td colspan="7">${esc(vpns.error.message)}</td></tr>`
    : (vpns.data || []).map((x) => `<tr><td>${esc(x.name)}</td><td>${esc(x.code)}</td><td>${esc(formatPlanPrice(x.price_amount, x.currency))}</td><td>${x.duration_days} 天</td><td>${x.device_limit}</td><td><span class="status">${x.is_active ? "上架" : "已停用"}</span></td><td><button class="btn btn-outline" type="button" data-toggle-plan="vpn" data-id="${esc(x.id)}" data-active="${x.is_active}">${x.is_active ? "停用" : "上架"}</button></td></tr>`).join("") || `<tr><td colspan="7">暂无 VPN 套餐</td></tr>`;
}
function validPlanCode(value) { return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value); }
$("membershipPlanForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const code = $("memberPlanCode").value.trim().toLowerCase();
  const currency = $("memberPlanCurrency").value;
  const stripePriceId = $("memberPlanStripePrice").value.trim();
  if (!validPlanCode(code)) { setMessage("memberPlanMsg", "套餐代码只可使用小写英文字母、数字和连字符。", true); return; }
  if (currency === "USD" && !/^price_[A-Za-z0-9]+$/.test(stripePriceId)) {
    setMessage("memberPlanMsg", "美元套餐必须填写有效的 Stripe Price ID（price_...）；人民币套餐无需填写。", true); return;
  }
  const { error } = await db.from("membership_plans").insert({
    code, name: $("memberPlanName").value.trim(), description: $("memberPlanDescription").value.trim() || null,
    price_amount: $("memberPlanPrice").value, currency, stripe_price_id: currency === "USD" ? stripePriceId : null,
    billing_interval: $("memberPlanInterval").value,
    duration_days: Number($("memberPlanDays").value), is_active: $("memberPlanActive").checked
  });
  setMessage("memberPlanMsg", error ? error.message : "会员套餐已保存。", !!error);
  if (!error) { event.target.reset(); $("memberPlanDays").value = 30; $("memberPlanActive").checked = false; await loadPlans(); }
});
$("vpnPlanForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const code = $("vpnPlanCode").value.trim().toLowerCase();
  const currency = $("vpnPlanCurrency").value;
  const stripePriceId = $("vpnPlanStripePrice").value.trim();
  if (!validPlanCode(code)) { setMessage("vpnPlanMsg", "套餐代码只可使用小写英文字母、数字和连字符。", true); return; }
  if (currency === "USD" && !/^price_[A-Za-z0-9]+$/.test(stripePriceId)) {
    setMessage("vpnPlanMsg", "美元套餐必须填写有效的 Stripe Price ID（price_...）；人民币套餐无需填写。", true); return;
  }
  const { error } = await db.from("vpn_plans").insert({
    code, name: $("vpnPlanName").value.trim(), description: $("vpnPlanDescription").value.trim() || null,
    price_amount: $("vpnPlanPrice").value, currency, stripe_price_id: currency === "USD" ? stripePriceId : null,
    billing_interval: $("vpnPlanInterval").value,
    duration_days: Number($("vpnPlanDays").value), device_limit: Number($("vpnPlanDevices").value),
    is_active: $("vpnPlanActive").checked
  });
  setMessage("vpnPlanMsg", error ? error.message : "VPN 套餐已保存。", !!error);
  if (!error) { event.target.reset(); $("vpnPlanDays").value = 30; $("vpnPlanDevices").value = 3; $("vpnPlanActive").checked = false; await loadPlans(); }
});
document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-toggle-plan]");
  if (!button) return;
  button.disabled = true;
  const table = button.dataset.togglePlan === "membership" ? "membership_plans" : "vpn_plans";
  const nextActive = button.dataset.active !== "true";
  const { error } = await db.from(table).update({ is_active: nextActive }).eq("id", button.dataset.id);
  if (error) window.alert(`套餐状态更新失败：${error.message}`);
  await loadPlans();
});

// v1.2: read-only operations console. Mutations remain server-side only.
const formatDate = (value) => value ? new Date(value).toLocaleString() : "—";
const renderRows = (id, rows, emptyCols, emptyText = "暂无记录") => {
  $(id).innerHTML = rows.length ? rows.join("") : `<tr><td colspan="${emptyCols}">${emptyText}</td></tr>`;
};

async function loadOperations() {
  const message = $("operationsMsg");
  message.textContent = "正在读取订单、会员、VPN 与退款数据……";
  const [orders, members, vpns, refunds, memberPlans, vpnPlans] = await Promise.all([
    db.from("service_orders").select("id,user_id,order_no,item_type,amount,currency,status,created_at").order("created_at", { ascending: false }).limit(100),
    db.from("membership_subscriptions").select("id,user_id,plan_id,status,starts_at,ends_at,created_at").order("created_at", { ascending: false }).limit(100),
    db.from("vpn_subscriptions").select("id,user_id,plan_id,status,starts_at,ends_at,provider_reference,created_at").order("created_at", { ascending: false }).limit(100),
    db.from("refund_requests").select("id,order_id,user_id,reason,status,created_at").order("created_at", { ascending: false }).limit(100),
    db.from("membership_plans").select("id,name,code"),
    db.from("vpn_plans").select("id,name,code,device_limit")
  ]);
  // Profiles are intentionally owner-readable only; do not query other users' PII here.
  // Operations rows display a short user ID instead of widening profile SELECT access.
  const resultErrors = [orders, members, vpns, refunds, memberPlans, vpnPlans]
    .map((r, i) => r.error ? `${["订单","会员订阅","VPN订阅","退款申请","会员套餐","VPN套餐"][i]}：${r.error.message}` : null)
    .filter(Boolean);
  const data = (result) => result.data || [];
  const memberPlanMap = new Map(data(memberPlans).map((x) => [x.id, x.name || x.code || x.id.slice(0, 8)]));
  const vpnPlanMap = new Map(data(vpnPlans).map((x) => [x.id, `${x.name || x.code || x.id.slice(0, 8)}${x.device_limit ? `（${x.device_limit}台设备）` : ""}`]));
  const orderMap = new Map(data(orders).map((x) => [x.id, x.order_no || x.id.slice(0, 8)]));
  $("kpiOrders").textContent = orders.error ? "—" : data(orders).length;
  $("kpiMembers").textContent = members.error ? "—" : data(members).length;
  $("kpiVpn").textContent = vpns.error ? "—" : data(vpns).length;
  $("kpiRefunds").textContent = refunds.error ? "—" : data(refunds).length;

  renderRows("orderRows", data(orders).map((x) => `<tr><td>${esc(x.order_no || x.id)}</td><td>${esc(x.user_id?.slice(0, 8) || "—")}</td><td>${esc(x.item_type)}</td><td>${esc(x.amount)} ${esc(x.currency)}</td><td><span class="status">${esc(x.status)}</span></td><td>${esc(formatDate(x.created_at))}</td></tr>`), 6, orders.error ? "订单读取失败" : "暂无订单");
  renderRows("memberRows", data(members).map((x) => `<tr><td>${esc(x.user_id?.slice(0, 8) || "—")}</td><td>${esc(memberPlanMap.get(x.plan_id) || "套餐信息不可用")}</td><td><span class="status">${esc(x.status)}</span></td><td>${esc(formatDate(x.starts_at))}</td><td>${esc(formatDate(x.ends_at))}</td></tr>`), 5, members.error ? "会员订阅读取失败" : "暂无会员订阅");
  renderRows("vpnRows", data(vpns).map((x) => `<tr><td>${esc(x.user_id?.slice(0, 8) || "—")}</td><td>${esc(vpnPlanMap.get(x.plan_id) || "套餐信息不可用")}</td><td><span class="status">${esc(x.status)}</span></td><td>${esc(x.provider_reference || "—")}</td><td>${esc(formatDate(x.ends_at))}</td></tr>`), 5, vpns.error ? "VPN 订阅读取失败" : "暂无 VPN 订阅");
  renderRows("refundRows", data(refunds).map((x) => `<tr><td>${esc(x.id.slice(0, 8))}</td><td>${esc(orderMap.get(x.order_id) || x.order_id?.slice(0, 8) || "—")}</td><td>${esc(x.user_id?.slice(0, 8) || "—")}</td><td>${esc(x.reason || "—")}</td><td><span class="status">${esc(x.status)}</span></td><td>${esc(formatDate(x.created_at))}</td></tr>`), 6, refunds.error ? "退款申请读取失败" : "暂无退款申请");
  message.textContent = resultErrors.length
    ? `部分数据暂不可读取：${resultErrors.join("；")}`
    : "运营数据已从数据库读取。当前仅展示最近 100 条记录，不执行付款、退款或订阅变更。";
  message.classList.toggle("error-message", resultErrors.length > 0);
}

$("refreshOperations")?.addEventListener("click", loadOperations);
const originalLoadAll = loadAll;
loadAll = async function () {
  await originalLoadAll();
  await loadOperations();
  await loadPlans();
  await loadManualPaymentSettings();
  await loadNativePaymentMethods();
  await loadManualPaymentSubmissions();
};


// v1.9 manual QR payment administration: explicit picker buttons + safe previews.
const qrFileRules = { maxBytes: 5 * 1024 * 1024, types: ["image/png", "image/jpeg", "image/webp"] };
const qrPreviewUrls = new Map();
let currentQrPaths = { alipay_qr_path: null, wechat_qr_path: null };
async function showSavedQr(path, previewId, label) {
  const preview = $(previewId); if (!preview || !path) return;
  const { data, error } = await db.storage.from("ccwu-payment-qr").createSignedUrl(path, 300);
  if (error || !data?.signedUrl) { preview.textContent = `已保存${label}（预览暂不可用）；可重新选择图片替换。`; return; }
  preview.replaceChildren();
  const info = document.createElement("div"); info.textContent = `当前已保存：${path}`;
  const img = document.createElement("img"); img.src = data.signedUrl; img.alt = `当前${label}`;
  preview.append(info, img);
}
function bindQrPicker(inputId, previewId, label) {
  const input = $(inputId), preview = $(previewId);
  if (!input || !preview) return;
  // Explicit click wiring: do not rely only on implicit label activation.
  // The file input overlays the visible control; this handler is a fallback for
  // browsers/layouts where label activation is interrupted by nested button styles.
  const pickerLabel = input.closest("label.qr-file-picker");
  const pickerVisual = pickerLabel?.querySelector(".btn");
  if (pickerLabel && pickerVisual) {
    pickerLabel.setAttribute("role", "group");
    pickerVisual.setAttribute("aria-hidden", "true");
    pickerLabel.addEventListener("click", (event) => {
      // Native input overlay remains the primary activation path. Do not call
      // input.click() here: doing so can double-open the chooser in browsers
      // that already activate the associated input from a label click.
    });
  }
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (!file) return;
    if (!qrFileRules.types.includes(file.type) || !/\.(png|jpe?g|webp)$/i.test(file.name)) {
      input.value = ""; preview.textContent = "文件格式不支持，请选择 PNG、JPG 或 WebP 图片。";
      setMessage("manualQrMsg", `${label}格式不支持，请选择 PNG、JPG 或 WebP。`, true); return;
    }
    if (file.size > qrFileRules.maxBytes) {
      input.value = ""; preview.textContent = "图片超过 5MB，请压缩后重新选择。";
      setMessage("manualQrMsg", `${label}不能超过 5MB。`, true); return;
    }
    const previous = qrPreviewUrls.get(inputId); if (previous) URL.revokeObjectURL(previous);
    const url = URL.createObjectURL(file); qrPreviewUrls.set(inputId, url);
    preview.replaceChildren();
    const info = document.createElement("div"); info.textContent = `已选择：${file.name}（${(file.size / 1024).toFixed(1)} KB）`;
    const img = document.createElement("img"); img.src = url; img.alt = `${label}预览`;
    preview.append(info, img);
    setMessage("manualQrMsg", `${label}已选择，点击“保存二维码与支付设置”后上传。`);
  });
}
bindQrPicker("alipayQrFile", "alipayQrPreview", "支付宝二维码");
bindQrPicker("wechatQrFile", "wechatQrPreview", "微信二维码");

async function loadManualPaymentSettings(){
 const {data,error}=await db.from("manual_payment_settings").select("alipay_qr_path,wechat_qr_path,alipay_enabled,wechat_enabled,instructions").eq("id",true).maybeSingle();
 if(error){setMessage("manualQrMsg",`读取人工收款设置失败：${error.message}`,true);return;}
 const settings=data||{};
 currentQrPaths={alipay_qr_path:settings.alipay_qr_path||null,wechat_qr_path:settings.wechat_qr_path||null};
 $("alipayQrEnabled").checked=!!settings.alipay_enabled;
 $("wechatQrEnabled").checked=!!settings.wechat_enabled;
 $("alipayQrEnabled").disabled=isTestProject;
 $("wechatQrEnabled").disabled=isTestProject;
 if(isTestProject){
  $("alipayQrEnabled").checked=false;
  $("wechatQrEnabled").checked=false;
  setMessage("manualQrMsg","测试项目禁止启用人工收款二维码，避免产生真实资金交易。");
 }
 $("manualPayInstructions").value=settings.instructions||"请扫码付款，并提交付款单号；管理员核实到账后开通服务。";
 await Promise.all([showSavedQr(currentQrPaths.alipay_qr_path,"alipayQrPreview","支付宝二维码"),showSavedQr(currentQrPaths.wechat_qr_path,"wechatQrPreview","微信二维码")]);
}
$("manualQrForm")?.addEventListener("submit",async event=>{
 event.preventDefault();setMessage("manualQrMsg","正在上传并保存…");
 try{
  if(isTestProject&&($("alipayQrEnabled").checked||$("wechatQrEnabled").checked))throw new Error("测试项目禁止启用人工收款二维码，避免产生真实资金交易。");
  if($("alipayQrEnabled").checked&&!$("alipayQrFile").files[0]&&!currentQrPaths.alipay_qr_path)throw new Error("启用支付宝前，请先选择并保存支付宝二维码图片。");
  if($("wechatQrEnabled").checked&&!$("wechatQrFile").files[0]&&!currentQrPaths.wechat_qr_path)throw new Error("启用微信支付前，请先选择并保存微信二维码图片。");
  const payload={alipay_enabled:$("alipayQrEnabled").checked,wechat_enabled:$("wechatQrEnabled").checked,instructions:$("manualPayInstructions").value.trim(),updated_at:new Date().toISOString(),updated_by:currentUser.id};
  for(const [id,key] of [["alipayQrFile","alipay_qr_path"],["wechatQrFile","wechat_qr_path"]]){
   const file=$(id).files[0];if(!file)continue;
   if(!qrFileRules.types.includes(file.type)||file.size>qrFileRules.maxBytes)throw new Error("二维码仅支持 PNG、JPG、WebP，且不能超过 5MB。");
   const ext=file.type==="image/jpeg"?"jpg":file.type.split("/")[1];const path=`${key.replace("_path","")}/${crypto.randomUUID()}.${ext}`;
   const up=await db.storage.from("ccwu-payment-qr").upload(path,file,{upsert:false,contentType:file.type});if(up.error)throw new Error(`上传${id.startsWith("alipay")?"支付宝":"微信"}二维码失败：${up.error.message}`);payload[key]=path;
  }
  const {error}=await db.from("manual_payment_settings").upsert({id:true,...payload},{onConflict:"id"});if(error)throw error;
  setMessage("manualQrMsg","支付设置已保存。请使用真实小额付款测试扫码；订单仍须管理员核实实际到账后手动批准。");event.target.reset();
  for(const [inputId,previewId] of [["alipayQrFile","alipayQrPreview"],["wechatQrFile","wechatQrPreview"]]){const url=qrPreviewUrls.get(inputId);if(url)URL.revokeObjectURL(url);qrPreviewUrls.delete(inputId);$(previewId).textContent="已保存；未选择新图片时将继续使用当前二维码。";}
  await loadManualPaymentSettings();
 }catch(err){setMessage("manualQrMsg",err.message||"保存失败",true);}
});
async function loadNativePaymentMethods(){
 const body=$("nativePaymentRows");
 if(!body)return;
 body.innerHTML='<tr><td colspan="6">正在读取…</td></tr>';
 const [methodsResult,statusResult]=await Promise.all([
  db.from("payment_methods").select("code,provider,display_name,asset,environment,is_enabled,checkout_type,sort_order").eq("asset","CNY").order("sort_order",{ascending:true}),
  db.functions.invoke("cn-payment",{body:{action:"status"}})
 ]);
 if(methodsResult.error){body.innerHTML='<tr><td colspan="6">'+esc(methodsResult.error.message)+'</td></tr>';setMessage("nativePaymentStatus","读取支付通道失败。",true);return;}
 const readiness=statusResult.data||{};
 if(statusResult.error)setMessage("nativePaymentStatus","无法读取商户凭据就绪状态；请确认 Edge Function Secrets 和管理员权限。",true);
 const rows=methodsResult.data||[];
 body.innerHTML=rows.map(row=>{
  const name=row.provider==="alipay"?"支付宝":row.provider==="wechat_pay"?"微信支付":row.provider;
  let ready=false,readyText="";
  if(row.provider==="alipay"){
   ready=row.environment==="test"?!!readiness.alipay_sandbox_ready:!!readiness.alipay_live_ready;
   readyText=ready?(row.environment==="test"?"沙箱凭据已配置":"正式凭据与 Live gate 已配置"):(row.environment==="test"?"等待沙箱凭据":"正式通道未获 Live 授权");
  }else if(row.provider==="wechat_pay"){
   ready=row.environment==="live"&&!!readiness.wechat_live_ready;
   readyText=row.environment==="test"?"API v3 无独立沙箱":ready?"正式凭据与 Live gate 已配置":"正式凭据 / Live gate 未就绪";
  }else{
   ready=false;readyText="尚未接入";
  }
  if(isTestProject&&row.environment!=="test"){ready=false;readyText="测试项目禁止启用正式支付通道";}
  const action=row.is_enabled
   ?'<button class="btn btn-outline" type="button" data-toggle-native-payment="'+esc(row.code)+'" data-environment="'+esc(row.environment)+'" data-enable="false">停用</button>'
   :'<button class="btn btn-primary" type="button" data-toggle-native-payment="'+esc(row.code)+'" data-environment="'+esc(row.environment)+'" data-enable="true"'+(ready?"":" disabled")+'>启用</button>';
  return '<tr><td>'+esc(name)+'</td><td>'+esc(row.asset)+'</td><td>'+esc(row.environment)+'</td><td>'+esc(readyText)+'</td><td>'+(row.is_enabled?'<span class="status-pill">已启用</span>':'<span class="muted">关闭</span>')+'</td><td>'+action+'</td></tr>';
 }).join("")||'<tr><td colspan="6">暂无自动收款通道记录</td></tr>';
 if(!statusResult.error)setMessage("nativePaymentStatus","通道状态已刷新。凭据状态只显示是否存在配置，不会读取或展示密钥。");
}
$("refreshNativePaymentMethods")?.addEventListener("click",loadNativePaymentMethods);
document.addEventListener("click",async event=>{
 const button=event.target.closest("[data-toggle-native-payment]");
 if(!button)return;
 const enable=button.dataset.enable==="true",code=button.dataset.toggleNativePayment;
 if(enable&&isTestProject&&button.dataset.environment!=="test"){setMessage("nativePaymentStatus","测试项目禁止启用正式支付通道。",true);return;}
 if(enable&&!confirm("请确认该支付通道的环境与凭据已经核实。启用后客户可能创建对应环境的支付订单。继续？"))return;
 button.disabled=true;
 const {error}=await db.from("payment_methods").update({is_enabled:enable}).eq("code",code);
 if(error)setMessage("nativePaymentStatus","保存通道状态失败："+error.message,true);
 else setMessage("nativePaymentStatus",enable?"支付通道已启用。":"支付通道已停用。");
 await loadNativePaymentMethods();
});
async function loadManualPaymentSubmissions(){
 const body=$("manualPaymentRows");body.innerHTML='<tr><td colspan="7">正在读取…</td></tr>';
 const {data,error}=await db.from("manual_payment_submissions").select("id,order_id,user_id,method,payer_reference,proof_path,status,created_at").eq("status","submitted").order("created_at",{ascending:true}).limit(100);
 if(error){body.innerHTML=`<tr><td colspan="7">${esc(error.message)}</td></tr>`;return;}
 body.innerHTML=(data||[]).map(x=>`<tr><td>${esc(x.order_id.slice(0,8))}</td><td>${esc(x.user_id.slice(0,8))}</td><td>${x.method==="alipay"?"支付宝":"微信"}</td><td>${esc(x.payer_reference)}</td><td>${x.proof_path?`<button class="btn btn-outline" data-proof-path="${esc(x.proof_path)}" type="button">查看凭证</button>`:"未上传"}</td><td>${esc(formatDate(x.created_at))}</td><td><button class="btn btn-primary" data-approve-manual="${esc(x.id)}" type="button">确认到账并开通</button></td></tr>`).join("")||'<tr><td colspan="7">暂无待审核付款</td></tr>';
}
$("refreshManualPayments")?.addEventListener("click",loadManualPaymentSubmissions);
document.addEventListener("click",async event=>{
 const proof=event.target.closest("[data-proof-path]");if(proof){const {data,error}=await db.storage.from("ccwu-payment-proofs").createSignedUrl(proof.dataset.proofPath,300);if(error){alert(error.message);return;}window.open(data.signedUrl,"_blank","noopener");return;}
 const approve=event.target.closest("[data-approve-manual]");if(!approve)return;
 if(!confirm("请先核对支付宝/微信实际到账记录。确认已到账后才可开通套餐。继续？"))return;approve.disabled=true;
 const {error}=await db.rpc("approve_manual_payment",{p_submission_id:approve.dataset.approveManual,p_admin_note:"管理员已核实实际到账"});
 if(error)alert(`审核失败：${error.message}`);else alert("已确认收款，订单已标记支付成功并开通对应订阅。");await loadManualPaymentSubmissions();
});

const { data: { user } } = await db.auth.getUser();
if (user) await checkStaff(user);

