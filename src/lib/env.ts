export type MobileEnv = {
  supabaseUrl?: string;
  supabaseKey?: string;
  configured: boolean;
  error?: string;
};

const SECRET_KEY_PREFIXES = ["sb_secret_", "sb_service_role_"];

function blank(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function decodeBase64Url(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4);
  return globalThis.atob(padded);
}

function jwtRole(token: string): string | null {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const parsed = JSON.parse(decodeBase64Url(payload)) as { role?: unknown };
    return typeof parsed.role === "string" ? parsed.role : null;
  } catch {
    return null;
  }
}

function isSecretKey(key: string): boolean {
  const normalized = key.toLowerCase();
  if (SECRET_KEY_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return true;
  return jwtRole(key) === "service_role";
}

export function parseMobileEnv(source: Record<string, string | undefined>): MobileEnv {
  const supabaseUrl = blank(source.EXPO_PUBLIC_SUPABASE_URL);
  const supabaseKey =
    blank(source.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ?? blank(source.EXPO_PUBLIC_SUPABASE_ANON_KEY);

  if (!supabaseUrl && !supabaseKey) {
    return { configured: false };
  }
  if (!supabaseUrl || !supabaseKey) {
    return {
      configured: false,
      error:
        "Set both EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, or leave both empty.",
    };
  }
  if (!isHttpUrl(supabaseUrl)) {
    return { configured: false, error: "EXPO_PUBLIC_SUPABASE_URL must be an http or https URL." };
  }
  if (isSecretKey(supabaseKey)) {
    return {
      configured: false,
      error: "The Supabase key is a secret key. Use the publishable or anon key.",
    };
  }
  return { supabaseUrl, supabaseKey, configured: true };
}
