window.CCWU_ADMIN_MODULE_VERSION = "2.0.3";
console.info("[CCWU Admin] ES module 2.0.3 loaded");
// CCWU Global Admin module 2.0.3 — explicit ES module entrypoint
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.CCWU_BUILD_VERSION = "2.0.3";
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
let currentUser = null;
let cache = { dramas: [], episodes: [], ads: [], promos: [] };

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
  const { data, error } = await db.rpc("is_staff");
  if (error || data !== true) {
    await db.auth.signOut();
    currentUser = null;
    setMessage("loginMsg", error ? `权限验证失败：${error.message}` : "此账户没有后台 staff 权限。", true);
    return;
  }
  $("loginPanel").classList.add("hidden");
  $("dashboard").classList.remove("hidden");
  $("adminUser").textContent = user.email || "管理员";
  await loadAll();
}

function fillSelect(id, options, emptyText) {
  const node = $(id);
  node.innerHTML = options.length
    ? options.map((item) => `<option value="${esc(item.value)}">${esc(item.label)}</option>`).join("")
    : `<option value="">${esc(emptyText)}</option>`;
  node.disabled = options.length === 0;
}

async function loadAll() {
  $("overviewText").textContent = "正在读取数据库……";
  const results = await Promise.all([
    db.from("dramas").select("id,slug,title,status,created_at").order("created_at", { ascending: false }),
    db.from("episodes").select("id,drama_id,title,episode_number,season_number,status").order("created_at", { ascending: false }),
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

  $("dramaRows").innerHTML = cache.dramas.map((drama) =>
    `<tr><td>${esc(drama.title)}</td><td><span class="status">${esc(drama.status)}</span></td><td>${drama.created_at ? new Date(drama.created_at).toLocaleDateString() : "—"}</td></tr>`
  ).join("") || `<tr><td colspan="3">${results[0].error ? "读取失败" : "暂无影视作品"}</td></tr>`;

  fillSelect("dramaSelect", cache.dramas.map((drama) => ({
    value: drama.id, label: drama.title
  })), "请先新增影视作品");
  const dramaById = new Map(cache.dramas.map((drama) => [drama.id, drama.title]));
  const episodeOptions = cache.episodes.map((episode) => ({
    value: episode.id,
    label: `${dramaById.get(episode.drama_id) || "未命名作品"} · ${episode.title || `第${episode.episode_number}集`}`
  }));
  fillSelect("promoEpisode", episodeOptions, "请先新增剧集");

  $("adRows").innerHTML = cache.ads.map((ad) =>
    `<tr><td>${esc(ad.ad_type)}</td><td>${ad.episode_id ? "指定剧集" : "全站默认"}</td><td><span class="status">${ad.is_active ? "启用" : "关闭"}</span></td><td>${esc((ad.ad_tag_url || "").slice(0, 48) || "未设置")}</td></tr>`
  ).join("") || `<tr><td colspan="4">${results[2].error ? "读取失败" : "暂无广告配置"}</td></tr>`;

  $("promoRows").innerHTML = cache.promos.map((promo) => {
    const episode = cache.episodes.find((item) => item.id === promo.episode_id);
    const safeUrl = /^https?:\/\//i.test(promo.target_url || "") ? promo.target_url : "";
    return `<tr><td>${esc(promo.title)}</td><td>${esc(episode?.title || "—")}</td><td><span class="status">${promo.is_active ? "启用" : "关闭"}</span></td><td>${safeUrl ? `<a target="_blank" rel="noopener noreferrer" href="${esc(safeUrl)}">打开链接</a>` : "无有效链接"}</td></tr>`;
  }).join("") || `<tr><td colspan="4">${results[3].error ? "读取失败" : "暂无推广配置"}</td></tr>`;
}

$("dramaForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const slug = $("dramaSlug").value.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    setMessage("dramaMsg", "slug 仅可使用小写英文字母、数字和连字符。", true);
    return;
  }
  const { error } = await db.from("dramas").insert({
    title: $("dramaTitle").value.trim(),
    slug,
    synopsis: $("dramaSynopsis").value.trim() || null,
    poster_path: $("dramaPoster").value.trim() || null,
    release_year: $("dramaYear").value ? Number($("dramaYear").value) : null,
    status: "draft"
  });
  setMessage("dramaMsg", error ? error.message : "影视作品草稿已保存。", !!error);
  if (!error) {
    event.target.reset();
    await loadAll();
  }
});

$("episodeForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!$("dramaSelect").value) {
    setMessage("episodeMsg", "请先新增影视作品。", true);
    return;
  }
  const { error } = await db.from("episodes").insert({
    drama_id: $("dramaSelect").value,
    season_number: 1,
    episode_number: Number($("episodeNo").value),
    title: $("episodeTitle").value.trim(),
    video_path: $("videoPath").value.trim() || null,
    duration_seconds: $("duration").value ? Number($("duration").value) : null,
    is_free: $("isFree").checked,
    status: "draft"
  });
  setMessage("episodeMsg", error ? error.message : "剧集草稿已保存。", !!error);
  if (!error) {
    event.target.reset();
    await loadAll();
  }
});

$("adForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const adType = $("adType").value;
  if (adType === "midroll" && !Number($("adOffset").value)) {
    setMessage("adMsg", "中插广告必须填写大于 0 的插播秒数。", true);
    return;
  }
  const { error } = await db.from("video_ad_configs").insert({
    episode_id: $("adEpisode").value.trim() || null,
    slot_key: $("adSlot").value.trim(),
    ad_type: adType,
    ad_provider: "google_ima",
    ad_tag_url: $("adTag").value.trim(),
    midroll_offset_seconds: adType === "midroll" ? Number($("adOffset").value) : null,
    frequency_cap_hours: $("adCap").value ? Number($("adCap").value) : 0,
    members_exempt: $("adMembers").checked,
    is_active: $("adActive").checked
  });
  setMessage("adMsg", error ? error.message : "广告配置已保存。注意：保存配置不代表广告已获批或可真实投放。", !!error);
  if (!error) {
    event.target.reset();
    $("adSlot").value = "default-video";
    $("adMembers").checked = true;
    await loadAll();
  }
});

$("promoForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!$("promoEpisode").value) {
    setMessage("promoMsg", "请先新增至少一集剧集。", true);
    return;
  }
  const { error } = await db.from("episode_promotions").insert({
    episode_id: $("promoEpisode").value,
    title: $("promoTitle").value.trim(),
    description: $("promoDesc").value.trim() || null,
    target_url: $("promoUrl").value.trim(),
    button_label: $("promoButton").value.trim() || "立即了解",
    placement: $("promoPlacement").value,
    affiliate_network: $("promoNetwork").value.trim() || null,
    disclosure_text: "推广链接可能产生佣金",
    sort_order: 0,
    is_active: $("promoActive").checked
  });
  setMessage("promoMsg", error ? error.message : "推广配置已保存。当前版本尚未统计点击或佣金。", !!error);
  if (!error) {
    event.target.reset();
    $("promoButton").value = "立即了解";
    await loadAll();
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
  if (!error) { event.target.reset(); $("memberPlanDays").value = 30; $("memberPlanActive").checked = true; await loadPlans(); }
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
  if (!error) { event.target.reset(); $("vpnPlanDays").value = 30; $("vpnPlanDevices").value = 3; $("vpnPlanActive").checked = true; await loadPlans(); }
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
  const [orders, members, vpns, refunds, profiles, memberPlans, vpnPlans] = await Promise.all([
    db.from("service_orders").select("id,user_id,order_no,item_type,amount,currency,status,created_at").order("created_at", { ascending: false }).limit(100),
    db.from("membership_subscriptions").select("id,user_id,plan_id,status,starts_at,ends_at,created_at").order("created_at", { ascending: false }).limit(100),
    db.from("vpn_subscriptions").select("id,user_id,plan_id,status,starts_at,ends_at,provider_reference,created_at").order("created_at", { ascending: false }).limit(100),
    db.from("refund_requests").select("id,order_id,user_id,reason,status,created_at").order("created_at", { ascending: false }).limit(100),
    db.from("profiles").select("id,display_name"),
    db.from("membership_plans").select("id,name,code"),
    db.from("vpn_plans").select("id,name,code,device_limit")
  ]);
  const resultErrors = [orders, members, vpns, refunds, profiles, memberPlans, vpnPlans]
    .map((r, i) => r.error ? `${["订单","会员订阅","VPN订阅","退款申请","用户资料","会员套餐","VPN套餐"][i]}：${r.error.message}` : null)
    .filter(Boolean);
  const data = (result) => result.data || [];
  const profileMap = new Map(data(profiles).map((x) => [x.id, x.display_name || x.id.slice(0, 8)]));
  const memberPlanMap = new Map(data(memberPlans).map((x) => [x.id, x.name || x.code || x.id.slice(0, 8)]));
  const vpnPlanMap = new Map(data(vpnPlans).map((x) => [x.id, `${x.name || x.code || x.id.slice(0, 8)}${x.device_limit ? `（${x.device_limit}台设备）` : ""}`]));
  const orderMap = new Map(data(orders).map((x) => [x.id, x.order_no || x.id.slice(0, 8)]));
  $("kpiOrders").textContent = orders.error ? "—" : data(orders).length;
  $("kpiMembers").textContent = members.error ? "—" : data(members).length;
  $("kpiVpn").textContent = vpns.error ? "—" : data(vpns).length;
  $("kpiRefunds").textContent = refunds.error ? "—" : data(refunds).length;

  renderRows("orderRows", data(orders).map((x) => `<tr><td>${esc(x.order_no || x.id)}</td><td>${esc(profileMap.get(x.user_id) || x.user_id?.slice(0, 8) || "—")}</td><td>${esc(x.item_type)}</td><td>${esc(x.amount)} ${esc(x.currency)}</td><td><span class="status">${esc(x.status)}</span></td><td>${esc(formatDate(x.created_at))}</td></tr>`), 6, orders.error ? "订单读取失败" : "暂无订单");
  renderRows("memberRows", data(members).map((x) => `<tr><td>${esc(profileMap.get(x.user_id) || x.user_id?.slice(0, 8) || "—")}</td><td>${esc(memberPlanMap.get(x.plan_id) || "套餐信息不可用")}</td><td><span class="status">${esc(x.status)}</span></td><td>${esc(formatDate(x.starts_at))}</td><td>${esc(formatDate(x.ends_at))}</td></tr>`), 5, members.error ? "会员订阅读取失败" : "暂无会员订阅");
  renderRows("vpnRows", data(vpns).map((x) => `<tr><td>${esc(profileMap.get(x.user_id) || x.user_id?.slice(0, 8) || "—")}</td><td>${esc(vpnPlanMap.get(x.plan_id) || "套餐信息不可用")}</td><td><span class="status">${esc(x.status)}</span></td><td>${esc(x.provider_reference || "—")}</td><td>${esc(formatDate(x.ends_at))}</td></tr>`), 5, vpns.error ? "VPN 订阅读取失败" : "暂无 VPN 订阅");
  renderRows("refundRows", data(refunds).map((x) => `<tr><td>${esc(x.id.slice(0, 8))}</td><td>${esc(orderMap.get(x.order_id) || x.order_id?.slice(0, 8) || "—")}</td><td>${esc(profileMap.get(x.user_id) || x.user_id?.slice(0, 8) || "—")}</td><td>${esc(x.reason || "—")}</td><td><span class="status">${esc(x.status)}</span></td><td>${esc(formatDate(x.created_at))}</td></tr>`), 6, refunds.error ? "退款申请读取失败" : "暂无退款申请");
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
 $("manualPayInstructions").value=settings.instructions||"请扫码付款，并提交付款单号；管理员核实到账后开通服务。";
 await Promise.all([showSavedQr(currentQrPaths.alipay_qr_path,"alipayQrPreview","支付宝二维码"),showSavedQr(currentQrPaths.wechat_qr_path,"wechatQrPreview","微信二维码")]);
}
$("manualQrForm")?.addEventListener("submit",async event=>{
 event.preventDefault();setMessage("manualQrMsg","正在上传并保存…");
 try{
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
  const action=row.is_enabled
   ?'<button class="btn btn-outline" type="button" data-toggle-native-payment="'+esc(row.code)+'" data-enable="false">停用</button>'
   :'<button class="btn btn-primary" type="button" data-toggle-native-payment="'+esc(row.code)+'" data-enable="true"'+(ready?"":" disabled")+'>启用</button>';
  return '<tr><td>'+esc(name)+'</td><td>'+esc(row.asset)+'</td><td>'+esc(row.environment)+'</td><td>'+esc(readyText)+'</td><td>'+(row.is_enabled?'<span class="status-pill">已启用</span>':'<span class="muted">关闭</span>')+'</td><td>'+action+'</td></tr>';
 }).join("")||'<tr><td colspan="6">暂无自动收款通道记录</td></tr>';
 if(!statusResult.error)setMessage("nativePaymentStatus","通道状态已刷新。凭据状态只显示是否存在配置，不会读取或展示密钥。");
}
$("refreshNativePaymentMethods")?.addEventListener("click",loadNativePaymentMethods);
document.addEventListener("click",async event=>{
 const button=event.target.closest("[data-toggle-native-payment]");
 if(!button)return;
 const enable=button.dataset.enable==="true",code=button.dataset.toggleNativePayment;
 if(enable&&!confirm("请确认该支付通道的测试/正式凭据已经核实。启用后客户可能创建真实支付订单。继续？"))return;
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

