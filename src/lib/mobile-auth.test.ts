import { describe, expect, it, vi } from "vitest";
import type { MobileFetch } from "./mobile-api";
import { createMobileAuth } from "./mobile-auth";

const session = { access_token: "a", refresh_token: "r", expires_at: 123 };

describe("mobile username auth", () => {
  it("signs up through the website without any token and returns the session", async () => {
    const request = vi.fn<MobileFetch>().mockResolvedValue(Response.json({ ok: true, data: { session, userId: "u1", onboardingComplete: false } }));
    const auth = createMobileAuth("https://lonagram.example", request);
    const result = await auth.signUp({ username: "maya", password: "lonagram-demo", is18Plus: true, email: "maya@example.com" });
    expect(result).toEqual({ ok: true, session, userId: "u1", onboardingComplete: false });
    const [url, options] = request.mock.calls[0]!;
    expect(url).toBe("https://lonagram.example/api/mobile/v1/auth");
    expect(options.credentials).toBe("omit");
    expect(options.redirect).toBe("error");
    expect(options.headers).not.toHaveProperty("Authorization");
    expect(JSON.parse(String(options.body))).toEqual({ operation: "auth.signUp", input: { username: "maya", password: "lonagram-demo", is18Plus: true, email: "maya@example.com" } });
  });

  it("passes server errors through with their code", async () => {
    const request = vi.fn<MobileFetch>().mockResolvedValue(Response.json({ ok: false, error: "Username or password is incorrect.", code: "invalid_credentials" }, { status: 401 }));
    const result = await createMobileAuth("https://lonagram.example", request).signIn({ username: "maya", password: "wrong-pass" });
    expect(result).toEqual({ ok: false, error: "Username or password is incorrect.", code: "invalid_credentials", status: 401 });
  });

  it("reports not_deployed while the website still answers with its 404 page", async () => {
    const page = vi.fn<MobileFetch>().mockResolvedValue(new Response("<html>Not found</html>", { status: 404 }));
    expect(await createMobileAuth("https://lonagram.example", page).signIn({ username: "maya", password: "lonagram-demo" })).toMatchObject({ ok: false, code: "not_deployed" });
  });

  it("does not treat a response without a session as success", async () => {
    const request = vi.fn<MobileFetch>().mockResolvedValue(Response.json({ ok: true, data: { userId: "u1" } }));
    expect(await createMobileAuth("https://lonagram.example", request).signIn({ username: "maya", password: "lonagram-demo" })).toMatchObject({ ok: false });
  });

  it("reports network failures and missing configuration", async () => {
    const offline = vi.fn<MobileFetch>().mockRejectedValue(new TypeError("Network request failed"));
    expect(await createMobileAuth("https://lonagram.example", offline).signIn({ username: "maya", password: "lonagram-demo" })).toMatchObject({ ok: false, code: "network" });
    expect(await createMobileAuth(undefined, offline).signIn({ username: "maya", password: "lonagram-demo" })).toMatchObject({ ok: false, code: "configuration" });
  });
});
