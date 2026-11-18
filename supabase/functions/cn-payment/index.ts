import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
import QRCode from "npm:qrcode@1.5.4";

async function makeQrSvg(value: string): Promise<string> {
  return await QRCode.toString(value, { type: "svg", width: 240, margin: 2 });
}

const encoder = new TextEncoder();
const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("APP_ORIGIN") || "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}
function plain(status: number, body: string) {
  return new Response(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}
function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}
function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const size = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) { out.set(part, offset); offset += part.length; }
  return out;
}
function derLength(n: number): Uint8Array {
  if (n < 128) return new Uint8Array([n]);
  const bytes: number[] = [];
  let x = n;
  while (x > 0) { bytes.unshift(x & 255); x >>>= 8; }
  return new Uint8Array([0x80 | bytes.length, ...bytes]);
}
function der(tag: number, body: Uint8Array): Uint8Array {
  return concatBytes(new Uint8Array([tag]), derLength(body.length), body);
}
const rsaAlgorithmIdentifier = new Uint8Array([
  0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00,
]);
function pemDer(pem: string): { label: string; der: Uint8Array } {
  const match = pem.trim().match(/-----BEGIN ([^-]+)-----([\s\S]+?)-----END \1-----/);
  if (!match) throw new Error("invalid_pem");
  return { label: match[1], der: base64ToBytes(match[2].replace(/\s/g, "")) };
}
function pkcs1PrivateToPkcs8(pkcs1: Uint8Array): Uint8Array {
  const version = new Uint8Array([0x02, 0x01, 0x00]);
  return der(0x30, concatBytes(version, rsaAlgorithmIdentifier, der(0x04, pkcs1)));
}
function pkcs1PublicToSpki(pkcs1: Uint8Array): Uint8Array {
  const bitString = der(0x03, concatBytes(new Uint8Array([0]), pkcs1));
  return der(0x30, concatBytes(rsaAlgorithmIdentifier, bitString));
}
async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const parsed = pemDer(pem);
  let raw = parsed.der;
  if (parsed.label === "RSA PRIVATE KEY") raw = pkcs1PrivateToPkcs8(raw);
  else if (parsed.label !== "PRIVATE KEY") throw new Error("unsupported_private_key_format");
  return await crypto.subtle.importKey(
    "pkcs8", raw, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"],
  );
}
async function importPublicKey(pem: string): Promise<CryptoKey> {
  const parsed = pemDer(pem);
  let raw = parsed.der;
  if (parsed.label === "RSA PUBLIC KEY") raw = pkcs1PublicToSpki(raw);
  else if (parsed.label !== "PUBLIC KEY") throw new Error("unsupported_public_key_format");
  return await crypto.subtle.importKey(
    "spki", raw, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"],
  );
}
async function rsaSign(privatePem: string, message: string): Promise<string> {
  const key = await importPrivateKey(privatePem);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, encoder.encode(message));
  return bytesToBase64(new Uint8Array(signature));
}
async function rsaVerify(publicPem: string, message: string, signature: string): Promise<boolean> {
  const key = await importPublicKey(publicPem);
  return await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5", key, base64ToBytes(signature), encoder.encode(message),
  );
}
async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function serviceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  let key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (secretKeys) {
    try {
      const parsed = JSON.parse(secretKeys);
      key = parsed.service_role || parsed.serviceRole || key;
    } catch {
      // Keep the standard service-role environment variable as the fallback.
    }
  }
  if (!url || !key) throw new Error("supabase_service_configuration_missing");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
function userClient(authorization: string) {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if (!url || !key) throw new Error("supabase_public_configuration_missing");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });
}
function validUuid(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}
function alipayTimestamp(): string {
  const d = new Date();
  return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0") + "-" +
    String(d.getUTCDate()).padStart(2, "0") + " " + String(d.getUTCHours()).padStart(2, "0") + ":" +
    String(d.getUTCMinutes()).padStart(2, "0") + ":" + String(d.getUTCSeconds()).padStart(2, "0");
}
function alipaySignContent(params: Record<string, string>): string {
  return Object.entries(params)
    .filter(([k, v]) => k !== "sign" && k !== "sign_type" && v !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => k + "=" + v)
    .join("&");
}
function notifyUrl(provider: string): string {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const configured = Deno.env.get(provider === "alipay" ? "ALIPAY_NOTIFY_URL" : "WECHATPAY_NOTIFY_URL");
  const value = configured || (supabaseUrl ? supabaseUrl.replace(/\/$/, "") + "/functions/v1/cn-payment" : "");
  if (!value) throw new Error("payment_notify_url_missing");
  const u = new URL(value);
  if (u.protocol !== "https:" || u.search || u.hash) throw new Error("invalid_payment_notify_url");
  return value;
}
async function createAlipayQr(order: Record<string, unknown>, expiry: string): Promise<{ qr: string; session: string }> {
  const appId = Deno.env.get("ALIPAY_APP_ID") || "";
  const privateKey = Deno.env.get("ALIPAY_MERCHANT_PRIVATE_KEY") || "";
  const publicKey = Deno.env.get("ALIPAY_PUBLIC_KEY") || "";
  const gateway = Deno.env.get("ALIPAY_GATEWAY") || "https://openapi-sandbox.dl.alipaydev.com/gateway.do";
  const environment = String(order.environment || "");
  if (!appId || !privateKey || !publicKey) throw new Error("alipay_test_credentials_missing");
  const u = new URL(gateway);
  if (u.protocol !== "https:" || u.pathname !== "/gateway.do" || u.search || u.hash) {
    throw new Error("invalid_alipay_gateway");
  }
  if (environment === "test" && !["openapi-sandbox.dl.alipaydev.com", "openapi.alipaydev.com", "mapi.alipaydev.com"].includes(u.hostname)) {
    throw new Error("alipay_test_gateway_required");
  }
  if (environment === "live" && (Deno.env.get("ALIPAY_LIVE_PAYMENTS_ENABLED") !== "true" || u.hostname !== "openapi.alipay.com")) {
    throw new Error("alipay_live_payments_not_enabled");
  }
  if (environment !== "test" && environment !== "live") throw new Error("invalid_alipay_environment");
  const outTradeNo = String(order.order_no || "");
  const total = Number(order.amount);
  if (!outTradeNo || !Number.isFinite(total) || total <= 0) throw new Error("invalid_cn_order");
  const biz = {
    out_trade_no: outTradeNo,
    total_amount: total.toFixed(2),
    subject: String(order.title || "CCWU subscription").slice(0, 128),
    timeout_express: "30m",
    qr_code_timeout_express: "30m",
  };
  const params: Record<string, string> = {
    app_id: appId,
    method: "alipay.trade.precreate",
    format: "JSON",
    charset: "utf-8",
    sign_type: "RSA2",
    timestamp: alipayTimestamp(),
    version: "1.0",
    notify_url: notifyUrl("alipay"),
    biz_content: JSON.stringify(biz),
  };
  params.sign = await rsaSign(privateKey, alipaySignContent(params));
  const response = await fetch(gateway, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded; charset=utf-8", "Accept": "application/json" },
    body: new URLSearchParams(params).toString(),
  });
  const raw = await response.text();
  if (!response.ok) throw new Error("alipay_gateway_http_" + response.status);
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(raw); } catch { throw new Error("alipay_invalid_gateway_response"); }
  const result = parsed.alipay_trade_precreate_response as Record<string, unknown> | undefined;
  if (!result || result.code !== "10000" || result.out_trade_no !== outTradeNo || typeof result.qr_code !== "string") {
    throw new Error("alipay_precreate_rejected_" + String(result?.sub_code || result?.code || "unknown"));
  }
  if (typeof parsed.sign === "string") {
    const signed = "alipay_trade_precreate_response=" + JSON.stringify(result);
    if (!await rsaVerify(publicKey, signed, parsed.sign)) throw new Error("alipay_response_signature_invalid");
  } else {
    throw new Error("alipay_response_signature_missing");
  }
  return { qr: result.qr_code, session: outTradeNo };
}
async function verifyWeChatMessage(
  raw: string, headers: Headers, publicKey: string, expectedSerial: string,
): Promise<boolean> {
  const serial = headers.get("Wechatpay-Serial") || "";
  const timestamp = headers.get("Wechatpay-Timestamp") || "";
  const nonce = headers.get("Wechatpay-Nonce") || "";
  const signature = headers.get("Wechatpay-Signature") || "";
  if (!serial || serial !== expectedSerial || !timestamp || !nonce || !signature) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;
  return await rsaVerify(publicKey, timestamp + "\n" + nonce + "\n" + raw + "\n", signature);
}
async function createWeChatQr(order: Record<string, unknown>, expiry: string): Promise<{ qr: string; session: string }> {
  const environment = String(order.environment || "");
  if (environment === "test") throw new Error("wechatpay_api_v3_has_no_independent_sandbox");
  if (environment !== "live" || Deno.env.get("WECHATPAY_LIVE_PAYMENTS_ENABLED") !== "true") {
    throw new Error("wechatpay_live_payments_not_enabled");
  }
  const appId = Deno.env.get("WECHATPAY_APP_ID") || "";
  const mchId = Deno.env.get("WECHATPAY_MCHID") || "";
  const merchantSerial = Deno.env.get("WECHATPAY_MERCHANT_SERIAL_NO") || "";
  const privateKey = Deno.env.get("WECHATPAY_MERCHANT_PRIVATE_KEY") || "";
  const platformSerial = Deno.env.get("WECHATPAY_PLATFORM_SERIAL") || "";
  const platformPublicKey = Deno.env.get("WECHATPAY_PLATFORM_PUBLIC_KEY") || "";
  if (!appId || !mchId || !merchantSerial || !privateKey || !platformSerial || !platformPublicKey) {
    throw new Error("wechatpay_credentials_missing");
  }
  const outTradeNo = String(order.order_no || "");
  const total = Math.round(Number(order.amount) * 100);
  if (!outTradeNo || !Number.isSafeInteger(total) || total <= 0) throw new Error("invalid_cn_order");
  const body = JSON.stringify({
    appid: appId,
    mchid: mchId,
    description: String(order.title || "CCWU subscription").slice(0, 120),
    out_trade_no: outTradeNo,
    time_expire: new Date(expiry).toISOString(),
    notify_url: notifyUrl("wechat_pay"),
    amount: { total, currency: "CNY" },
  });
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const canonical = "POST\n/v3/pay/transactions/native\n" + timestamp + "\n" + nonce + "\n" + body + "\n";
  const signature = await rsaSign(privateKey, canonical);
  const authorization = 'WECHATPAY2-SHA256-RSA2048 mchid="' + mchId + '",nonce_str="' + nonce +
    '",timestamp="' + timestamp + '",serial_no="' + merchantSerial + '",signature="' + signature + '"';
  const response = await fetch("https://api.mch.weixin.qq.com/v3/pay/transactions/native", {
    method: "POST",
    headers: {
      "Authorization": authorization,
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
    body,
  });
  const raw = await response.text();
  if (!response.ok) throw new Error("wechatpay_gateway_http_" + response.status);
  if (!await verifyWeChatMessage(raw, response.headers, platformPublicKey, platformSerial)) {
    throw new Error("wechatpay_response_signature_invalid");
  }
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(raw); } catch { throw new Error("wechatpay_invalid_gateway_response"); }
  if (typeof parsed.code_url !== "string" || !parsed.code_url.startsWith("weixin://")) {
    throw new Error("wechatpay_native_order_rejected");
  }
  return { qr: parsed.code_url, session: outTradeNo };
}
async function markCreationFailed(service: ReturnType<typeof serviceClient>, orderId: string, provider: string) {
  await service.from("payment_transactions").update({ status: "failed" })
    .eq("order_id", orderId).eq("provider", provider).in("status", ["created", "pending"]);
  await service.from("service_orders").update({ status: "failed", payment_closed_at: new Date().toISOString() })
    .eq("id", orderId).eq("status", "pending");
}
async function handleCreate(req: Request) {
  const authorization = req.headers.get("Authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return json(401, { error: "authentication_required" });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return json(400, { error: "invalid_request" });
  const provider = String((body as Record<string, unknown>).provider || "");
  const itemType = String((body as Record<string, unknown>).item_type || "");
  const itemId = String((body as Record<string, unknown>).item_id || "");
  const requestKey = validUuid((body as Record<string, unknown>).request_key)
    ? String((body as Record<string, unknown>).request_key) : crypto.randomUUID();
  if (!["alipay", "wechat_pay"].includes(provider) || !["membership", "vpn"].includes(itemType) || !validUuid(itemId)) {
    return json(400, { error: "invalid_payment_request" });
  }
  const user = userClient(authorization);
  const { data: authData, error: authError } = await user.auth.getUser(match[1]);
  if (authError || !authData.user) return json(401, { error: "authentication_required" });
  const { data: order, error: orderError } = await user.rpc("create_cn_payment_order", {
    p_item_type: itemType, p_item_id: itemId, p_provider: provider, p_request_key: requestKey,
  });
  if (orderError || !order) {
    const msg = orderError?.message || "payment_order_creation_failed";
    return json(409, { error: msg.includes("payment_channel_unavailable") ? "payment_channel_unavailable" : "payment_order_creation_failed" });
  }
  const service = serviceClient();
  if (order.duplicate) {
    const { data: existing } = await user.rpc("get_my_cn_payment_order", { p_order_no: order.order_no });
    if (existing?.provider_qr_code && existing.status === "pending" &&
        (!existing.payment_expires_at || new Date(existing.payment_expires_at).getTime() > Date.now())) {
      return json(200, {
        ok: true, duplicate: true, provider, order_no: existing.order_no, amount: existing.amount,
        currency: existing.currency, status: existing.status, qr_code: existing.provider_qr_code,
        qr_svg: await makeQrSvg(existing.provider_qr_code),
        expires_at: existing.payment_expires_at,
      });
    }
    return json(409, { error: "existing_order_has_no_active_qr", order_no: order.order_no });
  }
  const { data: orderRow, error: orderReadError } = await service.from("service_orders")
    .select("payment_expires_at").eq("id", order.order_id).single();
  if (orderReadError || !orderRow?.payment_expires_at) {
    await markCreationFailed(service, String(order.order_id), provider);
    return json(500, { error: "payment_expiry_not_initialized" });
  }
  let session: { qr: string; session: string };
  try {
    session = provider === "alipay"
      ? await createAlipayQr(order, String(orderRow.payment_expires_at))
      : await createWeChatQr(order, String(orderRow.payment_expires_at));
  } catch (e) {
    await markCreationFailed(service, String(order.order_id), provider);
    const message = e instanceof Error ? e.message : "provider_error";
    console.error("[cn-payment] provider creation failed:", message);
    return json(503, { error: message });
  }
  const { data: attached, error: attachError } = await service.rpc("attach_cn_payment_session", {
    p_order_id: order.order_id,
    p_provider: provider,
    p_qr_code: session.qr,
    p_provider_session_id: session.session,
  });
  if (attachError || attached !== true) {
    await markCreationFailed(service, String(order.order_id), provider);
    return json(502, { error: "payment_session_persist_failed" });
  }
  return json(200, {
    ok: true, duplicate: false, provider, order_id: order.order_id, order_no: order.order_no,
    amount: order.amount, currency: order.currency, title: order.title, status: "pending",
    qr_code: session.qr, qr_svg: await makeQrSvg(session.qr), expires_at: orderRow.payment_expires_at,
  });
}
async function handleAlipayNotify(req: Request) {
  const raw = await req.text();
  const params = new URLSearchParams(raw);
  const publicKey = Deno.env.get("ALIPAY_PUBLIC_KEY") || "";
  const appId = Deno.env.get("ALIPAY_APP_ID") || "";
  if (!publicKey || !appId) return plain(503, "failure");
  const sign = params.get("sign") || "";
  if (params.get("sign_type") !== "RSA2" || !sign) return plain(400, "failure");
  const values: Record<string, string> = {};
  for (const [k, v] of params.entries()) values[k] = v;
  if (!await rsaVerify(publicKey, alipaySignContent(values), sign)) return plain(400, "failure");
  if (params.get("app_id") !== appId) return plain(400, "failure");
  const seller = Deno.env.get("ALIPAY_SELLER_ID");
  if (seller && params.get("seller_id") !== seller) return plain(400, "failure");
  const status = params.get("trade_status") || "";
  if (status !== "TRADE_SUCCESS" && status !== "TRADE_FINISHED") return plain(200, "success");
  const eventId = params.get("notify_id") || params.get("trade_no") || "";
  const tradeNo = params.get("trade_no") || "";
  const orderNo = params.get("out_trade_no") || "";
  const amount = Number(params.get("total_amount"));
  if (!eventId || !tradeNo || !orderNo || !Number.isFinite(amount) || amount <= 0) return plain(400, "failure");
  const service = serviceClient();
  const { data, error } = await service.rpc("process_cn_payment_success", {
    p_provider: "alipay",
    p_event_id: eventId,
    p_event_type: "TRADE_SUCCESS",
    p_provider_trade_no: tradeNo,
    p_order_no: orderNo,
    p_amount: amount,
    p_currency: "CNY",
    p_payload_hash: await sha256Hex(raw),
  });
  if (error) {
    console.error("[cn-payment] alipay settlement rejected:", error.message);
    return plain(500, "failure");
  }
  if (data?.ok === true || data?.duplicate === true || data?.ignored === true) return plain(200, "success");
  return plain(500, "failure");
}
async function decryptWeChatResource(resource: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (resource.algorithm !== "AEAD_AES_256_GCM") throw new Error("wechatpay_unsupported_resource_algorithm");
  const apiKey = Deno.env.get("WECHATPAY_API_V3_KEY") || "";
  if (encoder.encode(apiKey).length !== 32) throw new Error("wechatpay_api_v3_key_invalid");
  const key = await crypto.subtle.importKey("raw", encoder.encode(apiKey), "AES-GCM", false, ["decrypt"]);
  const plaintext = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: encoder.encode(String(resource.nonce || "")),
      additionalData: encoder.encode(String(resource.associated_data || "")),
      tagLength: 128,
    },
    key,
    base64ToBytes(String(resource.ciphertext || "")),
  );
  return JSON.parse(new TextDecoder().decode(plaintext));
}
async function handleWeChatNotify(req: Request) {
  const raw = await req.text();
  const publicKey = Deno.env.get("WECHATPAY_PLATFORM_PUBLIC_KEY") || "";
  const platformSerial = Deno.env.get("WECHATPAY_PLATFORM_SERIAL") || "";
  if (!publicKey || !platformSerial || !Deno.env.get("WECHATPAY_API_V3_KEY")) {
    return json(503, { code: "FAIL", message: "notification_verification_not_configured" });
  }
  if (!await verifyWeChatMessage(raw, req.headers, publicKey, platformSerial)) {
    return json(401, { code: "FAIL", message: "signature_invalid" });
  }
  let notice: Record<string, unknown>;
  try { notice = JSON.parse(raw); } catch { return json(400, { code: "FAIL", message: "invalid_json" }); }
  if (notice.event_type !== "TRANSACTION.SUCCESS") {
    return json(200, { code: "SUCCESS", message: "ignored_event_type" });
  }
  const resource = notice.resource as Record<string, unknown> | undefined;
  if (!resource) return json(400, { code: "FAIL", message: "missing_resource" });
  let transaction: Record<string, unknown>;
  try { transaction = await decryptWeChatResource(resource); } catch {
    return json(400, { code: "FAIL", message: "resource_decryption_failed" });
  }
  const appId = Deno.env.get("WECHATPAY_APP_ID") || "";
  const mchId = Deno.env.get("WECHATPAY_MCHID") || "";
  if (transaction.appid !== appId || transaction.mchid !== mchId) {
    return json(400, { code: "FAIL", message: "merchant_identity_mismatch" });
  }
  if (transaction.trade_state !== "SUCCESS") return json(200, { code: "SUCCESS", message: "ignored_non_success" });
  const amount = transaction.amount as Record<string, unknown> | undefined;
  const cents = Number(amount?.total);
  const orderNo = String(transaction.out_trade_no || "");
  const tradeNo = String(transaction.transaction_id || "");
  const eventId = String(notice.id || "");
  if (!eventId || !orderNo || !tradeNo || !Number.isSafeInteger(cents) || cents <= 0 || amount?.currency !== "CNY") {
    return json(400, { code: "FAIL", message: "invalid_transaction_fields" });
  }
  const service = serviceClient();
  const { data, error } = await service.rpc("process_cn_payment_success", {
    p_provider: "wechat_pay",
    p_event_id: eventId,
    p_event_type: "TRANSACTION.SUCCESS",
    p_provider_trade_no: tradeNo,
    p_order_no: orderNo,
    p_amount: cents / 100,
    p_currency: "CNY",
    p_payload_hash: await sha256Hex(raw),
  });
  if (error) {
    console.error("[cn-payment] wechat settlement rejected:", error.message);
    return json(500, { code: "FAIL", message: "settlement_failed" });
  }
  if (data?.ok === true || data?.duplicate === true || data?.ignored === true) {
    return json(200, { code: "SUCCESS", message: "成功" });
  }
  return json(500, { code: "FAIL", message: "settlement_failed" });
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });
  try {
    if (req.headers.has("Wechatpay-Signature")) return await handleWeChatNotify(req);
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/x-www-form-urlencoded")) return await handleAlipayNotify(req);
    return await handleCreate(req);
  } catch (e) {
    const message = e instanceof Error ? e.message : "internal_error";
    console.error("[cn-payment] request failed:", message);
    if (message === "authentication_required") return json(401, { error: message });
    return json(500, { error: "cn_payment_internal_error" });
  }
});
