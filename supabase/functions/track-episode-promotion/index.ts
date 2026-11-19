import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const decode = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
};
async function verifyToken(token: string, secret: string) {
  if (token.length > 4096) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  try {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    if (!await crypto.subtle.verify("HMAC", key, decode(parts[1]), new TextEncoder().encode(parts[0]))) return null;
    const payload = JSON.parse(new TextDecoder().decode(decode(parts[0])));
    if (!payload || payload.type !== "promotion_click" || !Number.isInteger(payload.exp) ||
        payload.exp < Math.floor(Date.now() / 1000) ||
        !/^[0-9a-f-]{36}$/i.test(payload.promotion_id || "") ||
        !/^[0-9a-f-]{36}$/i.test(payload.episode_id || "") ||
        !/^[0-9a-f-]{36}$/i.test(payload.nonce || "")) return null;
    return payload;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method !== "GET") return new Response("Method not allowed", { status: 405, headers: { "cache-control": "no-store" } });
  try {
    const token = new URL(req.url).searchParams.get("token") || "";
    const secret = Deno.env.get("CCWU_EVENT_SIGNING_SECRET") || "";
    const url = Deno.env.get("SUPABASE_URL") || "";
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!secret || secret.length < 32 || !url || !service) return new Response("Tracking unavailable", { status: 503 });
    const payload = await verifyToken(token, secret);
    if (!payload) return new Response("Invalid or expired promotion link", { status: 400, headers: { "cache-control": "no-store" } });
    const referrer = req.headers.get("referer") || "";
    let referrerDomain: string | null = null;
    try { referrerDomain = new URL(referrer).hostname.slice(0, 253).toLowerCase(); } catch {}
    const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: target, error } = await admin.rpc("record_episode_promotion_click", {
      p_promotion_id: payload.promotion_id,
      p_episode_id: payload.episode_id,
      p_click_nonce: payload.nonce,
      p_referrer_domain: referrerDomain,
    });
    if (error || typeof target !== "string") return new Response("Promotion is no longer available", { status: 404, headers: { "cache-control": "no-store" } });
    let destination: URL;
    try { destination = new URL(target); } catch { return new Response("Invalid destination", { status: 400 }); }
    const host = destination.hostname.toLowerCase();
    const isIp = host.startsWith("[") || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host);
    if (destination.protocol !== "https:" || destination.username || destination.password ||
        (destination.port && destination.port !== "443") || host === "localhost" ||
        host.endsWith(".localhost") || host.endsWith(".local") || isIp) {
      return new Response("Invalid destination", { status: 400 });
    }
    return new Response(null, { status: 302, headers: { location: destination.toString(), "cache-control": "no-store, max-age=0", "referrer-policy": "no-referrer" } });
  } catch {
    return new Response("Tracking unavailable", { status: 503, headers: { "cache-control": "no-store" } });
  }
});
