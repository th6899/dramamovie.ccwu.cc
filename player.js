import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const dramaId = params.get("drama");
const episodeId = params.get("episode");
const video = $("contentVideo");
let playback = null;
let adsLoader = null;
let adsManager = null;
let imaDisplay = null;
let activeAdRequest = false;
let midrollDone = new Set();
let postrollDone = false;
function getAdViewerSessionId() {
  const key = "ccwu_ad_viewer_session_v1";
  try {
    const existing = localStorage.getItem(key);
    if (existing && /^[0-9a-f-]{36}$/i.test(existing)) return existing;
    const created = crypto.randomUUID();
    localStorage.setItem(key, created);
    return created;
  } catch {
    // Private browsing/storage restrictions limit anonymous caps to this page session.
    return crypto.randomUUID();
  }
}
const adSessionFingerprint = getAdViewerSessionId();
let adEventQueue = [];
let adEventFlushInFlight = false;
let adEventRetryTimer = null;
let activeSlot = null;
let adRequestSequence = 0;
let activeAdRequestId = 0;
let activeLoaderErrorHandler = null;

const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));

function setStatus(message, isError = false) {
  $("playerStatus").textContent = message;
  $("playerStatus").classList.toggle("error-message", isError);
}

async function showEpisodeList() {
  setStatus("请从下方选择已发布剧集。");
  if (!dramaId) return;
  const { data, error } = await db.from("episodes")
    .select("id,title,episode_number,is_free,status")
    .eq("drama_id", dramaId)
    .eq("status", "published")
    .order("episode_number");
  if (error) {
    $("episodeList").textContent = "暂时无法读取剧集列表。";
    return;
  }
  $("episodeList").innerHTML = (data || []).map((item) =>
    '<p><a class="text-link" href="player.html?episode=' + encodeURIComponent(item.id) +
    '">第 ' + esc(item.episode_number) + " 集 · " + esc(item.title) +
    (item.is_free ? "（免费）" : "（会员）") + "</a></p>"
  ).join("") || "暂无已发布剧集";
}

function renderSubtitles(rows) {
  video.querySelectorAll("track[data-ccwu]").forEach((node) => node.remove());
  (rows || []).forEach((item, index) => {
    if (!item.url || !item.language_code) return;
    const track = document.createElement("track");
    track.dataset.ccwu = "true";
    track.kind = "subtitles";
    track.src = item.url;
    track.srclang = item.language_code;
    track.label = item.label || item.language_code;
    if (index === 0) track.default = true;
    video.appendChild(track);
  });
}

function renderPromotions(rows) {
  const root = $("promotions");
  root.replaceChildren();
  (rows || []).forEach((item) => {
    if (!item.target_url) return;
    const article = document.createElement("article");
    article.className = "promo";
    const title = document.createElement("b");
    title.textContent = item.title || "合作推荐";
    const description = document.createElement("p");
    description.textContent = item.description || "";
    const disclosure = document.createElement("small");
    disclosure.textContent = item.disclosure_text || "此内容包含推广链接";
    const link = document.createElement("a");
    link.href = item.tracking_url || item.target_url;
    link.target = "_blank";
    link.rel = "sponsored noopener noreferrer";
    link.textContent = item.button_label || "立即了解";
    article.append(title, description, disclosure, document.createElement("br"), link);
    root.appendChild(article);
  });
}

function resumeContent(requestId = activeAdRequestId) {
  // Ignore callbacks from a stale IMA request after a newer slot has started.
  if (requestId !== activeAdRequestId) return;
  activeAdRequest = false;
  if (activeLoaderErrorHandler && adsLoader) {
    adsLoader.removeEventListener(google.ima.AdErrorEvent.Type.AD_ERROR, activeLoaderErrorHandler);
    activeLoaderErrorHandler = null;
  }
  if (adsManager) {
    try { adsManager.destroy(); } catch {}
    adsManager = null;
  }
  $("adContainer").replaceChildren();
  // A post-roll runs after the content has ended; resuming the media element
  // here would restart the episode from the beginning.
  if (activeSlot?.ad_type !== "postroll" && !video.ended) {
    video.play().catch(() => {});
  }
  activeSlot = null;
}

async function flushAdEvents() {
  if (adEventFlushInFlight || !playback?.ad_event_token || !adEventQueue.length) return;
  adEventFlushInFlight = true;
  try {
    while (adEventQueue.length) {
      const batch = adEventQueue.slice(0, 30);
      const { error } = await db.functions.invoke("record-video-ad-events", {
        body: { token: playback.ad_event_token, events: batch }
      });
      if (error) throw error;
      // Remove events only after the server confirms the batch was accepted.
      adEventQueue.splice(0, batch.length);
    }
  } catch (error) {
    console.warn("[CCWU Player] Ad event ingestion failed; queued events will be retried", error);
    if (!adEventRetryTimer) {
      adEventRetryTimer = setTimeout(() => {
        adEventRetryTimer = null;
        void flushAdEvents();
      }, 5000);
    }
  } finally {
    adEventFlushInFlight = false;
  }
}
function queueAdEvent(slot, eventType, errorCode = "") {
  if (!playback?.ad_event_token || !slot?.id) return;
  adEventQueue.push({ config_id: slot.id, event_type: eventType, session_fingerprint: adSessionFingerprint, error_code: errorCode });
  void flushAdEvents();
}
function attachImaTracking(manager, slot) {
  const map = [
    [google.ima.AdEvent.Type.IMPRESSION, "impression"],
    [google.ima.AdEvent.Type.STARTED, "start"],
    [google.ima.AdEvent.Type.FIRST_QUARTILE, "first_quartile"],
    [google.ima.AdEvent.Type.MIDPOINT, "midpoint"],
    [google.ima.AdEvent.Type.THIRD_QUARTILE, "third_quartile"],
    [google.ima.AdEvent.Type.COMPLETE, "complete"],
    [google.ima.AdEvent.Type.SKIPPED, "skip"],
    [google.ima.AdEvent.Type.CLICK, "click"]
  ];
  map.forEach(([imaType, eventType]) => manager.addEventListener(imaType, () => queueAdEvent(slot, eventType)));
}

function setupIma() {
  if (!window.google?.ima) return false;
  if (adsLoader) return true;
  try {
    imaDisplay = new google.ima.AdDisplayContainer($("adContainer"), video);
    adsLoader = new google.ima.AdsLoader(imaDisplay);
    adsLoader.addEventListener(
      google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
      (event) => {
        const requestId = event.getUserRequestContext?.();
        if (!Number.isInteger(requestId) || requestId !== activeAdRequestId || !activeAdRequest || !activeSlot) {
          try { event.getAdsManager(video).destroy(); } catch {}
          return;
        }
        const slot = activeSlot;
        try {
          adsManager = event.getAdsManager(video);
          attachImaTracking(adsManager, slot);
          adsManager.addEventListener(google.ima.AdErrorEvent.Type.AD_ERROR, (error) => {
            queueAdEvent(slot, "error", error?.getError?.()?.getErrorCode?.()?.toString?.() || "IMA_ERROR");
            resumeContent(requestId);
          });
          adsManager.addEventListener(google.ima.AdEvent.Type.ALL_ADS_COMPLETED, () => resumeContent(requestId));
          adsManager.addEventListener(google.ima.AdEvent.Type.CONTENT_RESUME_REQUESTED, () => resumeContent(requestId));
          adsManager.init(video.clientWidth || 640, video.clientHeight || 360, google.ima.ViewMode.NORMAL);
          adsManager.start();
        } catch {
          resumeContent(requestId);
        }
      }
    );
    return true;
  } catch (error) {
    console.warn("[CCWU Player] IMA initialization failed", error);
    return false;
  }
}

function requestAd(slot) {
  if (!slot?.ad_tag_url || !setupIma()) {
    $("adStatus").textContent = "广告暂不可用，继续播放正片。";
    video.play().catch(() => {});
    return;
  }
  if (activeAdRequest) return;
  activeAdRequest = true;
  const requestId = ++adRequestSequence;
  activeAdRequestId = requestId;
  activeSlot = slot;
  queueAdEvent(slot, "ad_request");
  video.pause();
  $("adStatus").textContent = "正在加载广告…";
  try {
    imaDisplay.initialize();
    const request = new google.ima.AdsRequest();
    request.adTagUrl = slot.ad_tag_url;
    request.userRequestContext = requestId;
    if (activeLoaderErrorHandler) {
      adsLoader.removeEventListener(google.ima.AdErrorEvent.Type.AD_ERROR, activeLoaderErrorHandler);
    }
    activeLoaderErrorHandler = () => resumeContent(requestId);
    adsLoader.addEventListener(google.ima.AdErrorEvent.Type.AD_ERROR, activeLoaderErrorHandler);
    request.linearAdSlotWidth = video.clientWidth || 640;
    request.linearAdSlotHeight = video.clientHeight || 360;
    request.nonLinearAdSlotWidth = video.clientWidth || 640;
    request.nonLinearAdSlotHeight = Math.max(90, Math.round((video.clientHeight || 360) / 3));
    adsLoader.requestAds(request);
  } catch {
    resumeContent(requestId);
  }
}

function pickAd(type) {
  // The Edge Function already filters slots to this episode or site-wide defaults.
  return (playback?.ad_slots || []).find((item) => item.ad_type === type) || null;
}

async function loadPlayback() {
  if (!episodeId) return showEpisodeList();
  setStatus("正在验证观看权限并获取安全播放链接…");
  const { data, error } = await db.functions.invoke("get-episode-playback", {
    body: { episode_id: episodeId, viewer_session_id: adSessionFingerprint }
  });
  if (error || !data?.ok) {
    const status = error?.context?.status;
    if (status === 401 || status === 403 || data?.error === "MEMBERSHIP_REQUIRED") {
      setStatus("此剧集需要有效会员。请登录购买账户并确认会员状态后重试。", true);
    } else if (data?.error === "MEDIA_NOT_CONFIGURED") {
      setStatus("剧集已发布，但尚未配置视频文件。", true);
    } else {
      setStatus("暂时无法取得播放权限或视频链接，请稍后重试。", true);
    }
    return;
  }
  playback = data;
  $("episodeTitle").textContent = (data.drama?.title || "影视") + " · " +
    (data.episode?.title || "剧集");
  setStatus(data.access === "free" ? "免费剧集" : "会员专享剧集");
  $("adStatus").textContent = data.ad_slots?.length ? "广告配置已读取" : "当前无可用广告";
  video.src = data.video_url;
  renderSubtitles(data.subtitles);
  renderPromotions(data.promotions);
  video.load();
}

$("startPlayback").addEventListener("click", () => {
  if (!playback) return;
  const pre = pickAd("preroll");
  if (pre) requestAd(pre);
  else video.play().catch(() => setStatus("请点击播放器播放按钮。"));
});

video.addEventListener("timeupdate", () => {
  if (!playback || activeAdRequest) return;
  const slot = pickAd("midroll");
  if (!slot || !Number.isFinite(Number(slot.midroll_offset_seconds))) return;
  if (video.currentTime >= Number(slot.midroll_offset_seconds) && !midrollDone.has(slot.id)) {
    midrollDone.add(slot.id);
    requestAd(slot);
  }
});

video.addEventListener("ended", () => {
  if (postrollDone) return;
  const slot = pickAd("postroll");
  if (slot) {
    postrollDone = true;
    requestAd(slot);
  }
});

loadPlayback().catch((error) => {
  console.error("[CCWU Player] Playback initialization failed", error);
  setStatus("播放器初始化失败，请刷新页面后重试。", true);
});
