import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = (id) => document.getElementById(id);
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));
const dateText = (value) => value ? new Date(value).toLocaleString("zh-CN") : "—";
const statusText = (value) => ({
  active: "生效中", pending: "处理中", paid: "已付款", expired: "已到期",
  cancelled: "已取消", canceled: "已取消", failed: "失败", past_due: "待续费",
  refunded: "已退款", completed: "已完成"
}[String(value || "").toLowerCase()] || value || "—");
const subscriptionStatusText = (row) => {
  const status = String(row.status || "").toLowerCase();
  const now = Date.now();
  const startsAt = row.starts_at ? Date.parse(row.starts_at) : null;
  const endsAt = row.ends_at ? Date.parse(row.ends_at) : null;
  if (status === "active" && Number.isFinite(startsAt) && startsAt > now) return "尚未生效";
  if (status === "active" && Number.isFinite(endsAt) && endsAt <= now) return "已到期";
  return statusText(status);
};
const isSubscriptionCurrentlyActive = (row) => {
  if (String(row.status || "").toLowerCase() !== "active") return false;
  const now = Date.now();
  const startsAt = row.starts_at ? Date.parse(row.starts_at) : null;
  const endsAt = row.ends_at ? Date.parse(row.ends_at) : null;
  return (!Number.isFinite(startsAt) || startsAt <= now) && (!Number.isFinite(endsAt) || endsAt > now);
};
const moneyText = (amount, currency) => {
  const code = String(currency || "USD").toUpperCase();
  try { return new Intl.NumberFormat("zh-CN", { style: "currency", currency: code }).format(Number(amount)); }
  catch { return Number(amount).toFixed(2) + " " + code; }
};
let currentUser = null;

function showMessage(id, message, isError = false) {
  const node = $(id);
  if (!node) return;
  node.textContent = message;
  node.classList.toggle("error", isError);
}
function renderRows(id, rows, columns, emptyText) {
  const node = $(id);
  if (!node) return;
  node.innerHTML = rows.length
    ? rows.map((row) => "<tr>" + columns(row) + "</tr>").join("")
    : '<tr><td colspan="' + (id === "orderRows" ? 5 : 4) + '" class="account-empty">' + esc(emptyText) + "</td></tr>";
}

async function loadAccount(user) {
  currentUser = user;
  $("accountLoginPrompt").classList.add("hidden");
  $("accountDashboard").classList.remove("hidden");
  $("accountEmail").textContent = user.email || "已登录账户";
  $("accountMessage").textContent = "正在读取账户数据……";

  const [profile, memberships, vpns, orders, memberPlans, vpnPlans] = await Promise.all([
    db.from("profiles").select("id,display_name").eq("id", user.id).maybeSingle(),
    db.from("membership_subscriptions").select("plan_id,status,starts_at,ends_at,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
    db.from("vpn_subscriptions").select("plan_id,status,starts_at,ends_at,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
    db.from("service_orders").select("order_no,item_type,amount,currency,status,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
    db.from("membership_plans").select("id,name,code"),
    db.from("vpn_plans").select("id,name,code")
  ]);

  $("displayName").value = profile.data?.display_name || user.user_metadata?.name || "";
  if (profile.error) { console.warn("[CCWU Account] Profile read failed", profile.error); showMessage("profileMessage", "个人资料暂时无法读取，请稍后重试。", true); }
  else if (!profile.data) showMessage("profileMessage", "尚未找到个人资料记录；其他账户数据仍可查看。");

  const memberMap = new Map((memberPlans.data || []).map((plan) => [plan.id, plan.name || plan.code || "会员套餐"]));
  const vpnMap = new Map((vpnPlans.data || []).map((plan) => [plan.id, plan.name || plan.code || "VPN 套餐"]));
  const memberRows = memberships.data || [];
  const vpnRows = vpns.data || [];
  const orderRows = orders.data || [];

  $("membershipCount").textContent = memberRows.filter(isSubscriptionCurrentlyActive).length;
  $("vpnCount").textContent = vpnRows.filter(isSubscriptionCurrentlyActive).length;

  renderRows("membershipRows", memberRows, (row) =>
    "<td>" + esc(memberMap.get(row.plan_id) || ("套餐 " + String(row.plan_id).slice(0, 8))) + "</td>" +
    "<td>" + esc(subscriptionStatusText(row)) + "</td><td>" + esc(dateText(row.starts_at)) + "</td><td>" + esc(dateText(row.ends_at)) + "</td>",
    memberships.error ? "会员订阅读取失败" : "暂无会员订阅记录");
  renderRows("vpnRows", vpnRows, (row) =>
    "<td>" + esc(vpnMap.get(row.plan_id) || ("套餐 " + String(row.plan_id).slice(0, 8))) + "</td>" +
    "<td>" + esc(statusText(row.status)) + "</td><td>" + esc(dateText(row.starts_at)) + "</td><td>" + esc(dateText(row.ends_at)) + "</td>",
    vpns.error ? "VPN 订阅读取失败" : "暂无 VPN 订阅记录");
  renderRows("orderRows", orderRows, (row) =>
    "<td>" + esc(row.order_no) + "</td><td>" + esc(row.item_type === "membership" ? "会员" : row.item_type === "vpn" ? "VPN" : row.item_type) + "</td>" +
    "<td>" + esc(moneyText(row.amount, row.currency)) + "</td><td>" + esc(statusText(row.status)) + "</td><td>" + esc(dateText(row.created_at)) + "</td>",
    orders.error ? "订单读取失败" : "暂无服务订单");

  const errors = [
    memberships.error && "会员订阅读取失败",
    vpns.error && "VPN 订阅读取失败",
    orders.error && "订单读取失败",
    memberPlans.error && "会员套餐名称暂不可用",
    vpnPlans.error && "VPN 套餐名称暂不可用"
  ].filter(Boolean);
  showMessage("accountMessage", errors.length ? "部分账户数据暂不可读取：" + errors.join("；") : "账户数据已更新。仅显示当前登录账户有权访问的记录。", errors.length > 0);
}

$("profileForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser) return;
  const displayName = $("displayName").value.trim();
  if (!displayName || displayName.length > 80) {
    showMessage("profileMessage", "显示名称不能为空，且不能超过 80 个字符。", true);
    return;
  }
  const button = $("saveProfile");
  button.disabled = true;
  showMessage("profileMessage", "正在保存……");
  try {
    const { data, error } = await db.from("profiles").update({ display_name: displayName })
      .eq("id", currentUser.id).select("id,display_name").maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("未找到可更新的个人资料记录。");
    showMessage("profileMessage", "个人资料已保存。");
  } catch (error) {
    console.warn("[CCWU Account] Profile update failed", error);
    showMessage("profileMessage", "个人资料保存失败，请稍后重试。", true);
  } finally {
    button.disabled = false;
  }
});

$("logoutButton").addEventListener("click", async () => {
  $("logoutButton").disabled = true;
  const { error } = await db.auth.signOut();
  if (error) {
    console.warn("[CCWU Account] Sign-out failed", error);
    showMessage("accountMessage", "退出登录失败，请检查网络后重试。", true);
    $("logoutButton").disabled = false;
    return;
  }
  location.href = "./";
});

const { data: { user }, error } = await db.auth.getUser();
if (error) { console.warn("[CCWU Account] User verification failed", error); showMessage("accountMessage", "账户验证失败，请刷新页面后重试。", true); }
if (user) await loadAccount(user);
else $("accountLoginPrompt").classList.remove("hidden");

db.auth.onAuthStateChange((_event, session) => {
  if (session?.user && !currentUser) loadAccount(session.user);
  if (!session?.user && currentUser) location.reload();
});
