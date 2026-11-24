window.CCWU_ADMIN_MODULE_VERSION = "2.2.13";
console.info("[CCWU Admin] ES module 2.2.13 loaded");
// CCWU Global Admin module 2.0.9 — explicit ES module entrypoint
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const isTestProject = (() => {
  try { return new URL(SUPABASE_URL).hostname === "uvtzhzgirgwjzsmcdgej.supabase.co"; }
  catch { return false; }
})();
window.CCWU_BUILD_VERSION = "2.2.12";
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
  if (!(file instanceof Blob)) throw new Error("请选择有效的视频文件后再上传。");
  const { data: { session }, error: sessionError } = await db.auth.getSession();
  if (sessionError || !session?.access_token) throw new Error("登录状态已失效，请重新登录后台。");
  onProgress(1);
  const { error } = await db.storage.from(bucket).upload(path, file, {
    cacheControl: "3600", upsert: false, contentType: file.type
  });
  if (error) throw error;
  onProgress(100);
  return path;
}

async function createPosterBlob(videoBlob, expectedMimeType = "video/mp4") {
  // Storage downloads may return a generic MIME type. Restore the known
  // upload type so the browser selects the correct media demuxer/decoder.
  const typedVideoBlob = videoBlob.type && videoBlob.type.startsWith("video/")
    ? videoBlob
    : new Blob([videoBlob], { type: expectedMimeType });
  return await new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    const objectUrl = URL.createObjectURL(typedVideoBlob);
    let settled = false;
    let duration = 0;
    let targetIndex = 0;
    let frameRequested = false;
    const seekTargets = [];
    const timeout = window.setTimeout(() => {
      fail(new Error("等待浏览器解码视频画面超时。视频可能使用当前浏览器不支持的编码（例如部分 H.265/HEVC 文件），请改用 H.264 MP4 或 VP9 WebM。"));
    }, 20000);
    const cleanup = () => {
      window.clearTimeout(timeout);
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(objectUrl);
    };
    const fail = (error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error instanceof Error ? error : new Error("无法从已上传视频提取封面画面。"));
    };
    const captureFrame = () => {
      if (settled || frameRequested) return;
      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
      if (!video.videoWidth || !video.videoHeight) {
        if (targetIndex < seekTargets.length) {
          video.currentTime = seekTargets[targetIndex++];
        } else {
          fail(new Error("浏览器已读取视频时长，但无法解码出图像画面。可能是视频没有图像轨道，或使用了当前浏览器不支持的编码；请使用 H.264 MP4 或 VP9 WebM。"));
        }
        return;
      }
      frameRequested = true;
      const draw = () => {
        if (settled) return;
        const width = video.videoWidth;
        const height = video.videoHeight;
        if (!width || !height) {
          frameRequested = false;
          if (targetIndex < seekTargets.length) video.currentTime = seekTargets[targetIndex++];
          else fail(new Error("视频画面解码失败，请将视频转换为 H.264 MP4 或 VP9 WebM 后再上传。"));
          return;
        }
        const scale = Math.min(1, 1280 / width);
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        const context = canvas.getContext("2d");
        if (!context) {
          fail(new Error("浏览器无法创建封面画布。"));
          return;
        }
        try {
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
        } catch (error) {
          fail(new Error("读取视频画面失败：" + (error?.message || "浏览器解码异常。")));
          return;
        }
        canvas.toBlob((blob) => {
          if (!blob) {
            fail(new Error("封面图片生成失败，请检查视频画面。"));
            return;
          }
          if (settled) return;
          settled = true;
          cleanup();
          resolve(blob);
        }, "image/jpeg", 0.86);
      };
      if (typeof video.requestVideoFrameCallback === "function") {
        video.requestVideoFrameCallback(() => draw());
      } else {
        draw();
      }
    };
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.addEventListener("error", () => fail(new Error(
      "已上传视频无法解码（" + (video.error?.message || "媒体格式或编码不受浏览器支持") + "）。请使用 H.264 MP4 或 VP9 WebM。"
    )));
    video.addEventListener("loadeddata", captureFrame);
    video.addEventListener("canplay", captureFrame);
    video.addEventListener("seeked", captureFrame);
    video.addEventListener("loadedmetadata", () => {
      duration = video.duration;
      if (!Number.isFinite(duration) || duration <= 0) {
        fail(new Error("视频时长无效，无法生成封面。"));
        return;
      }
      const first = Math.min(Math.max(0.1, duration * 0.1), Math.max(0, duration - 0.05));
      const middle = Math.min(duration * 0.5, Math.max(0, duration - 0.05));
      const start = Math.min(0.05, Math.max(0, duration - 0.01));
      seekTargets.push(first);
      if (Math.abs(middle - first) > 0.1) seekTargets.push(middle);
      if (Math.abs(start - seekTargets[seekTargets.length - 1]) > 0.1) seekTargets.push(start);
      video.currentTime = seekTargets[targetIndex++];
    }, { once: true });
    video.src = objectUrl;
    video.load();
  });
}


async function createCatalogPosterBlob(title, category) {
  const width = 900, height = 1200;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("无法创建剧名海报画布。");
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#071426");
  gradient.addColorStop(0.55, "#132d4a");
  gradient.addColorStop(1, "#241b3d");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  context.globalAlpha = 0.22;
  for (let i = 0; i < 7; i++) {
    context.beginPath();
    context.arc(width * 0.82, height * 0.18, 90 + i * 58, 0, Math.PI * 2);
    context.strokeStyle = i % 2 ? "#75d5d0" : "#9b8cff";
    context.lineWidth = 2;
    context.stroke();
  }
  context.globalAlpha = 1;
  context.fillStyle = "rgba(255,255,255,0.10)";
  context.fillRect(64, 72, 250, 54);
  context.fillStyle = "#d7e8ff";
  context.font = "600 25px sans-serif";
  context.fillText("CCWU GLOBAL · CINEMA", 84, 108);
  context.fillStyle = "#8ce1dc";
  context.font = "600 30px sans-serif";
  context.fillText(String(category || "影视作品").slice(0, 18), 72, 760);
  context.fillStyle = "#ffffff";
  context.font = "700 66px sans-serif";
  const text = String(title || "未命名影视作品").trim();
  const maxWidth = width - 144;
  const chars = Array.from(text);
  const lines = [];
  let line = "";
  for (const char of chars) {
    const candidate = line + char;
    if (context.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = char;
    } else line = candidate;
  }
  if (line) lines.push(line);
  lines.slice(0, 3).forEach((item, index) => context.fillText(item, 72, 860 + index * 88));
  context.fillStyle = "rgba(255,255,255,0.62)";
  context.font = "400 24px sans-serif";
  context.fillText("OFFICIAL TITLE COVER", 72, 1100);
  return await new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("剧名海报图片编码失败。")), "image/jpeg", 0.9);
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
let cache = { dramas: [], episodes: [], ads: [] };

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

async function loadAll(){
 const [dramas,episodes]=await Promise.all([db.from("dramas").select("id,slug,title,title_zh,category,status,poster_path,published_at,created_at").order("created_at",{ascending:false}),db.from("episodes").select("id,drama_id,title,episode_number,season_number,status,video_path,duration_seconds,description,created_at").order("created_at",{ascending:false})]);
 cache.dramas=dramas.data||[];cache.episodes=episodes.data||[];const errors=[dramas,episodes].filter(x=>x.error).map(x=>x.error.message);
 $("kpiDramas").textContent=dramas.error?"—":cache.dramas.length;$("kpiEpisodes").textContent=episodes.error?"—":cache.episodes.length;$("kpiAds").textContent="AdSense";$("overviewText").textContent=errors.length?"部分数据读取失败："+errors.join("；"):"数据库连接正常，概览数据已更新。";
 await loadPublicCatalogReadiness();await loadAdditionalCatalogs();const counts=new Map();cache.episodes.forEach(e=>counts.set(e.drama_id,(counts.get(e.drama_id)||0)+1));
 $("dramaRows").innerHTML=cache.dramas.map(d=>`<tr><td>${esc(d.title||d.title_zh)}</td><td>${counts.get(d.id)||0}</td><td><span class="status">${esc(d.status)}</span></td><td>${d.created_at?new Date(d.created_at).toLocaleDateString():"—"}</td><td><button type="button" class="btn btn-outline" data-edit-drama="${esc(d.id)}">修改剧名</button> <button type="button" class="btn btn-secondary" data-toggle-drama="${esc(d.id)}" data-next-status="${d.status==="published"?"draft":"published"}">${d.status==="published"?"下架":"发布"}</button> <button type="button" class="btn btn-outline" data-delete-drama="${esc(d.id)}">删除</button></td></tr>`).join("")||'<tr><td colspan="5">暂无影视作品</td></tr>';
 renderEpisodeRows();
 fillSelect("subtitleDrama",cache.dramas.map(d=>({value:d.id,label:d.title||d.title_zh})),"暂无剧名");fillSelect("subtitleEpisode",[],"请先选择剧名");refreshSubtitleEpisodes();
}
let activeEpisodeListCategory=null;
function renderEpisodeRows(){const names=new Map(cache.dramas.map(d=>[d.id,d.title||d.title_zh]));const categories=new Map(cache.dramas.map(d=>[d.id,d.category]));const rows=cache.episodes.filter(e=>!activeEpisodeListCategory||categories.get(e.drama_id)===activeEpisodeListCategory);$("episodeRows").innerHTML=rows.map(e=>'<tr><td>'+esc(names.get(e.drama_id)||'—')+'</td><td>第'+e.episode_number+'集</td><td><span class="status">'+esc(e.status)+'</span></td><td>'+(e.video_path?'已上传':'未上传')+'</td><td><button type="button" class="btn btn-outline" data-edit-episode="'+esc(e.id)+'">修改集数</button> <button type="button" class="btn btn-secondary" data-toggle-episode="'+esc(e.id)+'" data-next-status="'+(e.status==='published'?'draft':'published')+'">'+(e.status==='published'?'下架':'发布')+'</button> <button type="button" class="btn btn-outline" data-delete-episode="'+esc(e.id)+'">删除</button></td></tr>').join('')||'<tr><td colspan="5">'+(activeEpisodeListCategory?'该分类暂无剧集':'暂无剧集')+'</td></tr>';}
document.addEventListener('click',event=>{const tab=event.target.closest('[data-episode-category]');if(!tab)return;activeEpisodeListCategory=tab.dataset.episodeCategory;document.querySelectorAll('[data-episode-category]').forEach(button=>{const active=button===tab;button.setAttribute('aria-pressed',String(active));button.classList.toggle('btn-primary',active);button.classList.toggle('btn-outline',!active);});renderEpisodeRows();});
function refreshSubtitleEpisodes(){const id=$("subtitleDrama")?.value;fillSelect("subtitleEpisode",cache.episodes.filter(e=>e.drama_id===id).map(e=>({value:e.id,label:`第${e.episode_number}集`} )),"该剧暂无集数");}
$("subtitleDrama")?.addEventListener("change",refreshSubtitleEpisodes);

async function manageDramaEpisode(event) {
 const ed=event.target.closest("[data-edit-drama],[data-edit-selected-drama]"), dd=event.target.closest("[data-delete-drama],[data-delete-selected-drama]"), ee=event.target.closest("[data-edit-episode],[data-edit-selected-episode]"), de=event.target.closest("[data-delete-episode],[data-delete-selected-episode]");
 if(ed?.hasAttribute("data-edit-selected-drama"))ed.dataset.editDrama=$("subtitleDrama").value;
 if(dd?.hasAttribute("data-delete-selected-drama"))dd.dataset.deleteDrama=$("subtitleDrama").value;
 if(ee?.hasAttribute("data-edit-selected-episode"))ee.dataset.editEpisode=$("subtitleEpisode").value;
 if(de?.hasAttribute("data-delete-selected-episode"))de.dataset.deleteEpisode=$("subtitleEpisode").value;
 if(!ed&&!dd&&!ee&&!de)return;
 const button=event.target.closest("button"); if(button)button.disabled=true;
 try {
  if(ed){const row=cache.dramas.find(x=>x.id===ed.dataset.editDrama);if(!row)return;const value=window.prompt("修改剧名：",row.title||row.title_zh||"");if(value===null)return;if(!value.trim())throw Error("剧名不能为空。");const {error}=await db.from("dramas").update({title:value.trim(),title_zh:value.trim()}).eq("id",row.id);if(error)throw error;}
  if(ee){const row=cache.episodes.find(x=>x.id===ee.dataset.editEpisode);if(!row)return;const value=window.prompt("修改集数（只填写数字）：",String(row.episode_number));if(value===null)return;const number=Number(value);if(!Number.isInteger(number)||number<1)throw Error("集数必须是大于0的整数。");const {error}=await db.from("episodes").update({episode_number:number,title:"第"+number+"集"}).eq("id",row.id);if(error)throw error;}
  if(de){const row=cache.episodes.find(x=>x.id===de.dataset.deleteEpisode);if(!row)return;if(!window.confirm("确定删除第"+row.episode_number+"集？此操作无法撤销。"))return;const tracks=await db.from("subtitle_tracks").select("storage_path,file_url").eq("episode_id",row.id);if(tracks.error)throw tracks.error;const {error}=await db.from("episodes").delete().eq("id",row.id);if(error)throw new Error("删除失败（可能仍有观看记录、广告或推广数据引用）："+error.message);if(row.video_path)await db.storage.from("ccwu-cinema-videos").remove([row.video_path]);const paths=[...new Set((tracks.data||[]).map(x=>x.storage_path||x.file_url).filter(Boolean))];if(paths.length)await db.storage.from("ccwu-cinema-subtitles").remove(paths);}
  if(dd){const row=cache.dramas.find(x=>x.id===dd.dataset.deleteDrama);if(!row)return;if(cache.episodes.some(x=>x.drama_id===row.id))throw Error("请先删除该剧名下的全部剧集，再删除剧名。");if(!window.confirm("确定删除剧名“"+(row.title||row.title_zh)+"”？此操作无法撤销。"))return;const {error}=await db.from("dramas").delete().eq("id",row.id);if(error)throw error;}
  await loadAll();
 } catch(error){window.alert(error.message||"操作失败。");}
 finally{if(button)button.disabled=false;}
}
document.addEventListener("click",manageDramaEpisode);



async function loadAdditionalCatalogs(){
 const [services,tutorials]=await Promise.all([db.from("service_catalog").select("id,title,is_published").order("created_at",{ascending:false}),db.from("tutorials").select("id,title,status").order("created_at",{ascending:false})]);
 $("serviceCatalogRows").innerHTML=services.error?'<tr><td colspan="3">'+esc(services.error.message)+'</td></tr>':(services.data||[]).map(x=>'<tr><td>'+esc(x.title)+'</td><td>'+(x.is_published?'已发布':'草稿')+'</td><td><button class="btn btn-outline" type="button" data-catalog-toggle="service" data-id="'+esc(x.id)+'" data-active="'+x.is_published+'">'+(x.is_published?'下架':'发布')+'</button></td></tr>').join('')||'<tr><td colspan="3">暂无数字服务</td></tr>';
 $("tutorialRows").innerHTML=tutorials.error?'<tr><td colspan="3">'+esc(tutorials.error.message)+'</td></tr>':(tutorials.data||[]).map(x=>'<tr><td>'+esc(x.title)+'</td><td>'+esc(x.status)+'</td><td><button class="btn btn-outline" type="button" data-catalog-toggle="tutorial" data-id="'+esc(x.id)+'" data-active="'+(x.status==='published')+'">'+(x.status==='published'?'下架':'发布')+'</button></td></tr>').join('')||'<tr><td colspan="3">暂无教程</td></tr>';
}
async function uploadCatalogAsset(file,kind){
 if(!file)return null;const vids=["video/mp4","video/webm"],docs=["application/pdf","application/zip","text/plain","image/png","image/jpeg","image/webp"],video=kind==="video";
 if(video&&!vids.includes(file.type))throw Error("视频只支持 MP4 或 WebM。");if(!video&&!docs.includes(file.type))throw Error("文件仅支持 PDF、ZIP、TXT、PNG、JPG、WebP。");if(file.size>50*1024*1024)throw Error("单文件最大 50MB。");
 const ext=(file.name.split(".").pop()||"bin").toLowerCase(),path=`catalog/${crypto.randomUUID()}.${ext}`;const {error}=await db.storage.from("ccwu-catalog-assets").upload(path,file,{upsert:false,contentType:file.type});if(error)throw error;return path;
}
async function submitSimpleCatalog(event,kind){
 event.preventDefault();const service=kind==="service",form=event.currentTarget,msg=service?"serviceCatalogMsg":"tutorialMsg",title=$(service?"serviceTitle":"tutorialTitle").value.trim(),desc=$(service?"serviceDescription":"tutorialSummary").value.trim();
 const inputs=form.querySelectorAll('input[type="file"]'),video=inputs[0].files?.[0],asset=inputs[1].files?.[0],button=form.querySelector('button[type="submit"]');if(button)button.disabled=true;
 try{if(!title)throw Error("请填写名称。");const vp=await uploadCatalogAsset(video,"video"),fp=await uploadCatalogAsset(asset,"file"),slug=(service?"service-":"tutorial-")+crypto.randomUUID().replace(/-/g,"").slice(0,16);
 const row=service?{slug,title,category:"other",description:desc||null,video_path:vp,file_path:fp,is_published:false}:{slug,title,category:"general",summary:desc||null,body_md:desc||null,video_path:vp,file_path:fp,status:"draft"};
 const {error}=await db.from(service?"service_catalog":"tutorials").insert(row);if(error)throw error;form.reset();setMessage(msg,"已保存为草稿。");await loadAdditionalCatalogs();await loadPublicCatalogReadiness();
 }catch(error){setMessage(msg,error.message||"保存失败。",true);}finally{if(button)button.disabled=false;}
}
$("serviceCatalogForm").addEventListener("submit",e=>submitSimpleCatalog(e,"service"));$("tutorialForm").addEventListener("submit",e=>submitSimpleCatalog(e,"tutorial"));
document.addEventListener("click",async event=>{const b=event.target instanceof Element?event.target.closest("[data-catalog-toggle]"):null;if(!b||b.disabled)return;const service=b.dataset.catalogToggle==="service",table=service?"service_catalog":"tutorials",next=b.dataset.active!=="true";b.disabled=true;try{const {error}=await db.from(table).update(service?{is_published:next}:{status:next?"published":"draft"}).eq("id",b.dataset.id);if(error)throw error;await loadAdditionalCatalogs();await loadPublicCatalogReadiness();}catch(error){alert("目录状态更新失败："+error.message);}finally{b.disabled=false;}});

async function updateContentStatus(table, id, nextStatus, messageId) {
  const row = table === "dramas" ? cache.dramas.find((item) => item.id === id) : cache.episodes.find((item) => item.id === id);
  const targetMessage = table === "dramas" ? "dramaMsg" : "episodeMsg";
  if (!row) return setMessage(targetMessage, "状态更新失败：找不到当前记录，请刷新列表后重试。", true);

  let parent = null;
  let parentWasChanged = false;
  let originalParentStatus = null;
  let originalParentPublishedAt = null;

  // Validate every episode publishing prerequisite before changing the parent drama.
  if (nextStatus === "published" && table === "episodes") {
    if (!row.video_path || /^https?:\/\//i.test(row.video_path)) {
      return setMessage(targetMessage, "发布失败：请先上传视频或填写有效的 Storage 相对路径。", true);
    }
    if (!row.duration_seconds || row.duration_seconds < 1) {
      return setMessage(targetMessage, "发布失败：请先检查视频时长是否有效。", true);
    }
    parent = cache.dramas.find((item) => item.id === row.drama_id);
    if (!parent) {
      return setMessage(targetMessage, "发布失败：找不到所属剧名记录，请检查剧集归档关系。", true);
    }
    if (parent.status !== "published") {
      originalParentStatus = parent.status;
      originalParentPublishedAt = parent.published_at ?? null;
      let generatedPosterPath = null;
      if (!parent.poster_path) {
        setMessage(targetMessage, "正在从已上传的视频提取所属剧名封面…");
        const { data: videoBlob, error: downloadError } = await db.storage
          .from("ccwu-cinema-videos").download(row.video_path);
        if (downloadError || !videoBlob) {
          throw new Error("自动生成所属剧名海报失败：无法读取已上传视频。" + (downloadError?.message || ""));
        }
        let posterBlob;
        try {
          posterBlob = await createPosterBlob(videoBlob, /\.webm$/i.test(row.video_path) ? "video/webm" : "video/mp4");
        } catch (frameError) {
          console.warn("[CCWU Admin] Video frame unavailable; generating a clearly designed title cover instead.", frameError);
          setMessage(targetMessage, "视频画面暂不可解码，正在生成剧名文字海报…");
          try {
            posterBlob = await createCatalogPosterBlob(parent.title || parent.title_zh || row.title, parent.category);
          } catch (posterError) {
            throw new Error("视频封面提取失败，文字海报备用方案也失败：" + (posterError?.message || "无法生成海报。"));
          }
        }
        generatedPosterPath = `dramas/${parent.id}/${crypto.randomUUID()}.jpg`;
        const posterUpload = await db.storage.from("ccwu-cinema-posters").upload(
          generatedPosterPath, posterBlob,
          { cacheControl: "31536000", upsert: false, contentType: "image/jpeg" }
        );
        if (posterUpload.error) {
          throw new Error("自动上传所属剧名海报失败：" + posterUpload.error.message);
        }
      }
      const parentValues = {
        status: "published",
        published_at: new Date().toISOString(),
        ...(generatedPosterPath ? { poster_path: generatedPosterPath } : {})
      };
      const parentUpdate = await db.from("dramas")
        .update(parentValues)
        .eq("id", parent.id)
        .select("id,status,poster_path")
        .maybeSingle();
      if (parentUpdate.error || !parentUpdate.data) {
        if (generatedPosterPath) {
          await db.storage.from("ccwu-cinema-posters").remove([generatedPosterPath]);
        }
        return setMessage(targetMessage, "自动发布所属剧名失败：" +
          (parentUpdate.error?.message || "数据库没有返回更新记录，剧集尚未发布。"), true);
      }
      parentWasChanged = true;
      parent.status = "published";
      if (generatedPosterPath) parent.poster_path = generatedPosterPath;
    }
  }

  const values = table === "dramas"
    ? { status: nextStatus, published_at: nextStatus === "published" ? new Date().toISOString() : null }
    : { status: nextStatus };
  const { data, error } = await db.from(table).update(values).eq("id", id).select("id,status").maybeSingle();

  if (error || !data) {
    let rollbackNote = "";
    if (parentWasChanged && parent) {
      const rollback = await db.from("dramas")
        .update({ status: originalParentStatus, published_at: originalParentPublishedAt })
        .eq("id", parent.id)
        .select("id")
        .maybeSingle();
      if (rollback.error || !rollback.data) {
        rollbackNote = "；并且所属剧名状态回滚未能确认，请刷新后台核对";
      } else {
        parent.status = originalParentStatus;
        parent.published_at = originalParentPublishedAt;
      }
    }
    const detail = error ? error.message : "数据库没有返回更新记录，请检查 staff 写入权限及记录是否仍存在";
    return setMessage(targetMessage, "状态更新失败：" + detail + rollbackNote, true);
  }

  setMessage(
    targetMessage,
    nextStatus === "published"
      ? (table === "dramas" ? "影视作品已发布。还需发布至少一集，主页才会显示。" : "剧集已发布，主页将在对应分类显示该作品。")
      : "内容已下架。"
  );
  await loadAll();
}
document.addEventListener("click", async (event) => {
  const target = event.target instanceof Element ? event.target : event.target?.parentElement;
  if (!target) return;
  const dramaButton = target.closest("[data-toggle-drama]");
  if (dramaButton) {
    if (dramaButton.disabled) return;
    dramaButton.disabled = true;
    try { await updateContentStatus("dramas", dramaButton.dataset.toggleDrama, dramaButton.dataset.nextStatus, "dramaMsg"); }
    catch (error) { console.error("[CCWU Admin] Drama publish action failed", error); setMessage("dramaMsg", "发布操作失败：" + (error?.message || "未知错误"), true); }
    finally { dramaButton.disabled = false; }
    return;
  }
  const episodeButton = target.closest("[data-toggle-episode]");
  if (episodeButton) {
    if (episodeButton.disabled) return;
    episodeButton.disabled = true;
    try { await updateContentStatus("episodes", episodeButton.dataset.toggleEpisode, episodeButton.dataset.nextStatus, "episodeMsg"); }
    catch (error) { console.error("[CCWU Admin] Episode publish action failed", error); setMessage("episodeMsg", "发布操作失败：" + (error?.message || "未知错误"), true); }
    finally { episodeButton.disabled = false; }
  }
});
let activeUploadCategory="选推荐";document.addEventListener("click",event=>{const channel=event.target.closest("[data-upload-category]");if(!channel)return;activeUploadCategory=channel.dataset.uploadCategory;$("dramaCategory").value=activeUploadCategory;document.querySelectorAll("[data-upload-category]").forEach(button=>{const active=button===channel;button.setAttribute("aria-pressed",String(active));button.classList.toggle("btn-primary",active);button.classList.toggle("btn-outline",!active);});$("uploadChannelHint").textContent="当前上传通道："+activeUploadCategory+"。作品将自动归入对应主页分区；同名作品在不同通道分别归档。";});
$("episodeForm").addEventListener("submit",async event=>{
 event.preventDefault();const submit=event.submitter||event.target.querySelector("button");if(submit)submit.disabled=true;let path=null,created=null,saved=false;
 try{const title=$("dramaTitle").value.trim(),category=$("dramaCategory").value,num=Number($("episodeNo").value),desc=$("episodeDescription").value.trim(),file=$("videoFile").files?.[0];if(!title)throw Error("请输入剧名。");if(!["选推荐","最新上线","热门短剧","电影专区","纪录片"].includes(category))throw Error("请选择主页分类。");if(!Number.isInteger(num)||num<1)throw Error("请输入有效集数。");if(!file)throw Error("请选择视频文件。");if(!["video/mp4","video/webm"].includes(file.type))throw Error("视频只支持 MP4/WebM。");if(file.size > 50 * 1024 * 1024)throw Error("视频最大 50MB。");
 const duration=await getVideoDuration(file);let drama=cache.dramas.find(d=>(d.title||d.title_zh)===title&&d.category===category),id=drama?.id;if(!id){const slug="drama-"+crypto.randomUUID().replace(/-/g,"").slice(0,16),res=await db.from("dramas").insert({title,title_zh:title,slug,category,status:"draft"}).select("id").single();if(res.error)throw res.error;id=res.data.id;created=id;}else{const {data:existingEpisode,error:duplicateCheckError}=await db.from("episodes").select("id").eq("drama_id",id).eq("episode_number",num).maybeSingle();if(duplicateCheckError)throw new Error("检查集数是否重复失败："+duplicateCheckError.message);if(existingEpisode)throw new Error(`《${title}》第${num}集已经存在（当前记录保留未动）。请在下方剧集列表中修改现有记录，或选择尚未使用的集数；系统不会覆盖或删除原视频。`);const {data:updatedDrama,error:categoryError}=await db.from("dramas").update({category}).eq("id",id).select("id").maybeSingle();if(categoryError)throw categoryError;if(!updatedDrama)throw Error("所属剧名分类更新失败：数据库没有返回更新记录。");}
 path=`episodes/${id}/${crypto.randomUUID()}.${file.type==="video/mp4"?"mp4":"webm"}`;setMessage("episodeMsg","正在上传视频…");await uploadResumable("ccwu-cinema-videos",path,file,p=>setMessage("episodeMsg",`正在上传视频：${p}%`));
 const {error}=await db.from("episodes").insert({drama_id:id,season_number:1,episode_number:num,title:`第${num}集`,description:desc||null,video_path:path,duration_seconds:duration,is_free:false,status:"draft"});if(error)throw error;saved=true;event.target.reset();$("episodeNo").value=1;setMessage("episodeMsg",`上传成功，已保存为草稿；主页分类：${category}。`);await loadAll();
 }catch(error){if(!saved&&path)await db.storage.from("ccwu-cinema-videos").remove([path]);if(!saved&&created)await db.from("dramas").delete().eq("id",created);setMessage("episodeMsg",error.message||"上传失败。",true);}finally{if(submit)submit.disabled=false;}
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

async function loadAdsenseSettings(){const {data,error}=await db.from("adsense_settings").select("publisher_id,ad_slot").eq("id",true).maybeSingle();if(error){setMessage("adsenseMsg","读取失败："+error.message,true);return;}if(data){$("adsensePublisher").value=data.publisher_id||"";$("adsenseSlot").value=data.ad_slot||"";}}
$("adsenseForm").addEventListener("submit",async event=>{event.preventDefault();const publisher=$("adsensePublisher").value.trim(),slot=$("adsenseSlot").value.trim();if(!/^ca-pub-[0-9]{16}$/.test(publisher)||!/^[0-9]{5,20}$/.test(slot)){setMessage("adsenseMsg","请检查发布商 ID 和广告单元 ID 格式。",true);return;}const {error}=await db.from("adsense_settings").upsert({id:true,publisher_id:publisher,ad_slot:slot,is_enabled:false,updated_at:new Date().toISOString(),updated_by:currentUser.id},{onConflict:"id"});setMessage("adsenseMsg",error?error.message:"AdSense 参数已保存；广告展示仍需完成 Google 审核和站点代码接入。",!!error);});



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
  await loadManualPaymentSubmissions();
  await loadAdsenseSettings();
};



// Manual payment review: approval is the only path that activates the purchased entitlement.
async function loadManualPaymentSubmissions(){
 const body=$("manualPaymentRows");if(!body)return;
 body.innerHTML='<tr><td colspan="9">正在读取待确认付款…</td></tr>';
 const [submissions,memberPlans,vpnPlans]=await Promise.all([
  db.from("manual_payment_submissions")
   .select("id,order_id,user_id,method,payer_reference,proof_path,status,created_at,service_orders!inner(order_no,item_type,item_id,amount,currency,status)")
   .eq("status","submitted").order("created_at",{ascending:true}).limit(100),
  db.from("membership_plans").select("id,name,code"),
  db.from("vpn_plans").select("id,name,code")
 ]);
 if(submissions.error){body.innerHTML='<tr><td colspan="9">读取失败：'+esc(submissions.error.message)+'</td></tr>';setMessage("manualPaymentReviewMsg","请检查管理员权限或数据库访问策略。",true);return;}
 const planMap=new Map([...(memberPlans.data||[]),...(vpnPlans.data||[])].map(x=>[x.id,x.name||x.code||"套餐信息不可用"]));
 const rows=await Promise.all((submissions.data||[]).map(async s=>{
  const o=s.service_orders||{};
  let proof="—";
  if(s.proof_path){
   const signed=await db.storage.from("ccwu-payment-proofs").createSignedUrl(s.proof_path,300);
   proof=signed.error?"凭证暂不可预览":'<a class="text-link" href="'+esc(signed.data.signedUrl)+'" target="_blank" rel="noopener noreferrer">查看凭证</a>';
  }
  return '<tr><td>'+esc(o.order_no||s.order_id.slice(0,8))+'</td><td>'+esc(s.user_id.slice(0,8))+'</td><td>'+esc(planMap.get(o.item_id)||o.item_type||"—")+'</td><td>'+esc(o.amount)+' '+esc(o.currency)+'</td><td>'+ (s.method==="wechat"?"微信":"支付宝")+'</td><td>'+esc(s.payer_reference)+'</td><td>'+proof+'</td><td>'+esc(formatDate(s.created_at))+'</td><td><button class="btn btn-primary" type="button" data-manual-payment-action="approve" data-id="'+esc(s.id)+'">确认收款</button> <button class="btn btn-outline" type="button" data-manual-payment-action="reject" data-id="'+esc(s.id)+'">拒绝</button></td></tr>';
 }));
 body.innerHTML=rows.join("")||'<tr><td colspan="9">目前没有待确认付款</td></tr>';
 setMessage("manualPaymentReviewMsg",submissions.data?.length?("共 "+submissions.data.length+" 笔待审核，请核对实际到账后再操作。"):"暂无待确认付款。");
}
$("refreshManualPayments")?.addEventListener("click",loadManualPaymentSubmissions);
document.addEventListener("click",async event=>{
 const button=event.target.closest("[data-manual-payment-action]");if(!button)return;
 const id=button.dataset.id,action=button.dataset.manualPaymentAction;
 if(!id)return;
 if(action==="approve"&&!window.confirm("请确认已在微信或支付宝账户核实实际到账。确认后系统会立即开通套餐。继续？"))return;
 let note=null;
 if(action==="reject"){
  note=window.prompt("请输入拒绝原因（可留空）：");
  if(note===null)return;
 }
 button.disabled=true;
 const siblings=button.parentElement.querySelectorAll("button");siblings.forEach(x=>x.disabled=true);
 setMessage("manualPaymentReviewMsg",action==="approve"?"正在确认到账并开通权益…":"正在拒绝该付款申请…");
 const result=action==="approve"
  ? await db.rpc("approve_manual_payment",{p_submission_id:id,p_admin_note:null})
  : await db.rpc("reject_manual_payment",{p_submission_id:id,p_admin_note:note});
 if(result.error){
  setMessage("manualPaymentReviewMsg","操作失败："+result.error.message,true);
  siblings.forEach(x=>x.disabled=false);return;
 }
 setMessage("manualPaymentReviewMsg",action==="approve"?"已确认收款，会员/VPN权益已自动开通。":"已拒绝该付款申请，订单已关闭。");
 await Promise.all([loadManualPaymentSubmissions(),loadOperations()]);
});

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
  const payload={alipay_enabled:false,wechat_enabled:false,instructions:"请扫码付款，并提交付款单号；管理员核实到账后开通服务。",updated_at:new Date().toISOString(),updated_by:currentUser.id};
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
const { data: { user } } = await db.auth.getUser();
if (user) await checkStaff(user);

