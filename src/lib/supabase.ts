import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";

import { parseMobileEnv } from "@/lib/env";
import { secureSessionStorage } from "@/lib/secure-session-storage";

const env = parseMobileEnv({
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
});

let client: SupabaseClient | null = null;
let refreshBound = false;

export function getMobileEnv() {
  return env;
}

export function getSupabase(): SupabaseClient | null {
  if (!env.configured || !env.supabaseUrl || !env.supabaseKey) return null;
  if (!client) {
    client = createClient(env.supabaseUrl, env.supabaseKey, {
      auth: {
        storage: secureSessionStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: "pkce",
      },
    });
  }
  if (!refreshBound && Platform.OS !== "web") {
    refreshBound = true;
    AppState.addEventListener("change", (state) => {
      if (state === "active") void client?.auth.startAutoRefresh();
      else void client?.auth.stopAutoRefresh();
    });
  }
  return client;
}
