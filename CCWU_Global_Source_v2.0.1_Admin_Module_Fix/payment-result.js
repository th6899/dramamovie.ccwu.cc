import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const orderId = params.get("order_id");
const landingStatus = params.get("status");
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
async function refresh() {
  if (landingStatus === "cancelled") {
    $("resultTitle").textContent = "你已返回网站";
    $("resultMessage").textContent = "本次结账没有从 Stripe 成功返回。订单不会因此获得权益；你可以重新发起购买。";
  }
  if (!orderId) { $("orderInfo").textContent = "未提供订单编号。"; return; }
  const { data: { user } } = await db.auth.getUser();
  if (!user) { $("orderInfo").textContent = "请先登录购买时使用的账户，再查看订单状态。"; return; }
  const { data, error } = await db.from("service_orders").select("order_no,item_type,amount,currency,status,created_at").eq("id", orderId).eq("user_id", user.id).maybeSingle();
  if (error || !data) { $("orderInfo").textContent = "暂时无法读取订单，请稍后再试。"; return; }
  $("orderInfo").innerHTML = `<b>订单号：</b>${esc(data.order_no)}<br><b>商品：</b>${esc(data.item_type)}<br><b>金额：</b>${esc(data.amount)} ${esc(data.currency)}<br><b>状态：</b>${esc(data.status)}`;
  if (data.status === "paid") {
    $("resultTitle").textContent = "支付已确认";
    $("resultMessage").textContent = "订单已由服务器验证并记录相应订阅。VPN 实际节点/账号仍需供应商开通接口完成配置。";
  } else if (data.status === "pending") {
    $("resultTitle").textContent = "正在等待支付确认";
    $("resultMessage").textContent = "如果你已付款，请稍等片刻后重新查询。只有服务器验签并核对订单后才会开通权益。";
  } else {
    $("resultTitle").textContent = "订单状态：" + data.status;
    $("resultMessage").textContent = "如有疑问，请联系网站客服并提供订单号。";
  }
}
$("refreshStatus").addEventListener("click", refresh);
await refresh();
