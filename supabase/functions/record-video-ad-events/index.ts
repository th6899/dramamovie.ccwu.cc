import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const decode = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
};
const encode = (bytes: Uint8Array) => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};
async function verifyToken(token: string, secret: string) {
  if (token.length > 8192) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  try {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const valid = await crypto.subtle.verify("HMAC", key, decode(parts[1]).buffer.slice(decode(parts[1]).byteOffset, decode(parts[1]).byteOffset + decode(parts[1]).byteLength) as ArrayBuffer, new TextEncoder().encode(parts[0]).buffer as ArrayBuffer);
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(decode(parts[0])));
    if (!payload || !Number.isInteger(payload.exp) || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);
  try {
    const secret = Deno.env.get("CCWU_EVENT_SIGNING_SECRET") || "";
    const url = Deno.env.get("SUPABASE_URL") || "";
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!secret || secret.length < 32 || !url || !service) return json({ error: "SERVER_CONFIGURATION_INCOMPLETE" }, 503);
    const body = await req.json().catch(() => null);
    if (!body || typeof body.token !== "string" || !Array.isArray(body.events) || body.events.length < 1 || body.events.length > 30) {
      return json({ error: "INVALID_EVENT_BATCH" }, 400);
    }
    const payload = await verifyToken(body.token, secret);
    if (!payload || payload.type !== "ad_events" || !/^[0-9a-f-]{36}$/i.test(payload.episode_id || "") ||
        !/^[0-9a-f-]{36}$/i.test(payload.nonce || "") || !Array.isArray(payload.config_ids) ||
        payload.config_ids.length < 1 || payload.config_ids.length > 50 ||
        !payload.config_ids.every((id: unknown) => typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id))) {
      return json({ error: "INVALID_OR_EXPIRED_TOKEN" }, 401);
    }
    const events = body.events.map((event: Record<string, unknown>) => ({
      config_id: event?.config_id,
      event_type: event?.event_type,
      session_fingerprint: typeof event?.session_fingerprint === "string" ? event.session_fingerprint.slice(0, 128) : "",
      error_code: typeof event?.error_code === "string" ? event.error_code.slice(0, 128) : "",
    }));
    if (events.some((event: { config_id: unknown; event_type: unknown }) =>
      typeof event.config_id !== "string" || !payload.config_ids.includes(event.config_id) ||
      typeof event.event_type !== "string" ||
      !["ad_request","impression","start","first_quartile","midpoint","third_quartile","complete","skip","click","error"].includes(event.event_type))) {
      return json({ error: "INVALID_EVENT" }, 400);
    }
    const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data, error } = await admin.rpc("record_video_ad_events", {
      p_episode_id: payload.episode_id,
      p_event_token_id: payload.nonce,
      p_allowed_config_ids: payload.config_ids,
      p_events: events,
    });
    if (error) return json({ error: "EVENT_WRITE_FAILED" }, 503);
    return json({ ok: true, accepted: data ?? 0 });
  } catch {
    return json({ error: "EVENT_INGESTION_UNAVAILABLE" }, 503);
  }
});
