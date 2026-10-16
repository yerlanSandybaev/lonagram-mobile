import { describe, expect, it } from "vitest";

import { parseMobileEnv } from "./env";

function jwt(role: string): string {
  const header = globalThis.btoa(JSON.stringify({ alg: "none", typ: "JWT" }));
  const payload = globalThis.btoa(JSON.stringify({ role }));
  return `${header}.${payload}.signature`;
}

describe("parseMobileEnv", () => {
  it("stays unconfigured when the public values are empty", () => {
    expect(parseMobileEnv({})).toEqual({ configured: false });
  });

  it("ignores server-only secret names", () => {
    expect(
      parseMobileEnv({
        SUPABASE_SERVICE_ROLE_KEY: "super-secret",
        OPENAI_API_KEY: "sk-test",
        LONAGRAM_API_SECRET: "shared-secret",
      }),
    ).toEqual({ configured: false });
  });

  it("accepts the publishable key", () => {
    expect(
      parseMobileEnv({
        EXPO_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
      }),
    ).toMatchObject({ configured: true, supabaseUrl: "https://example.supabase.co" });
  });

  it("accepts the website anon key alias", () => {
    const anon = jwt("anon");
    const env = parseMobileEnv({
      EXPO_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      EXPO_PUBLIC_SUPABASE_ANON_KEY: anon,
    });
    expect(env.configured).toBe(true);
    expect(env.supabaseKey).toBe(anon);
  });

  it("refuses a service-role JWT without echoing the key", () => {
    const secret = jwt("service_role");
    const env = parseMobileEnv({
      EXPO_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: secret,
    });
    expect(env.configured).toBe(false);
    expect(env.error).toContain("secret key");
    expect(env.error).not.toContain(secret);
    expect(env.supabaseKey).toBeUndefined();
  });

  it("refuses a new-style secret key prefix", () => {
    const env = parseMobileEnv({
      EXPO_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_secret_example",
    });
    expect(env.configured).toBe(false);
    expect(env.supabaseKey).toBeUndefined();
  });
});
