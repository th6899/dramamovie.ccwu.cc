const host = window.location.hostname.toLowerCase();
const isTestHost =
  host === "ccwu-global-test.pages.dev" ||
  host.endsWith(".ccwu-global-test.pages.dev") ||
  host === "localhost" ||
  host === "127.0.0.1";
const isProductionHost = [
  "hub.ccwu.cc",
  "dramamovie.ccwu.cc",
  "ccwu.cc",
  "ccwu-global.pages.dev",
].includes(host);

if (!isTestHost && !isProductionHost) {
  throw new Error("Unknown CCWU deployment host. Refusing to select a Supabase project.");
}

export const SUPABASE_URL = isTestHost
  ? "https://uvtzhzgirgwjzsmcdgej.supabase.co"
  : "https://zkvfsuhlcrafgdbyxevr.supabase.co";

export const SUPABASE_ANON_KEY = isTestHost
  ? "sb_publishable_OBRm6NHT8WZNTs7o5oyD-g_jKZAoLSn"
  : "sb_publishable_EUG-5Vfy-iOA6aOdzNk69Q_ndFyv3zv";

export const SITE_NAME = "CCWU GLOBAL";
