import { describe, expect, it, vi } from "vitest";
import { createMobileApi, type MobileFetch } from "./mobile-api";

const session = async () => ({ access_token: "fixture-user-token", expires_at: Math.floor(Date.now() / 1000) + 3600 });
describe("mobile HTTP transport", () => {
  it("sends the current bearer token and request key, without cookies or an actor", async () => {
    const request = vi.fn<MobileFetch>().mockResolvedValue(Response.json({ ok: true, data: { id: "fixture-message" } }));
    const call = createMobileApi("https://lonagram.example", session, request);
    expect(await call("messages.send", { conversationId: "fixture", body: "Hello" }, "fixture-key")).toEqual({ id: "fixture-message" });
    const [url, options] = request.mock.calls[0]!;
    expect(String(url)).toBe("https://lonagram.example/api/mobile/v1");
    expect(options).toMatchObject({ credentials: "omit", redirect: "error", headers: { Authorization: "Bearer fixture-user-token", "Idempotency-Key": "fixture-key" } });
    expect(JSON.parse(String(options?.body))).toEqual({ operation: "messages.send", input: { conversationId: "fixture", body: "Hello" } });
  });
  it.each([undefined, "http://example.com", "https://name:password@example.com", "https://example.com/rpc", "https://example.com/?token=value"])("refuses unsafe or missing API origin %s", async (origin) => {
    const request = vi.fn<MobileFetch>();
    await expect(createMobileApi(origin, session, request)("settings.get")).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
  });
  it("rejects missing and expired sessions without making a request", async () => {
    const request = vi.fn<MobileFetch>();
    for (const source of [async () => null, async () => ({ access_token: "expired", expires_at: 1 })]) {
      await expect(createMobileApi("https://lonagram.example", source, request)("settings.get")).rejects.toMatchObject({ status: 401 });
    }
    expect(request).not.toHaveBeenCalled();
  });
  it("preserves server safety and rate-limit errors without retries", async () => {
    const request = vi.fn<MobileFetch>().mockResolvedValue(Response.json({ ok: false, error: "Please wait", code: "user_rate" }, { status: 429 }));
    await expect(createMobileApi("https://lonagram.example", session, request)("twin.turn")).rejects.toMatchObject({ message: "Please wait", code: "user_rate", status: 429 });
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("does not retry ambiguous network failures or accept an HTML login page", async () => {
    const request = vi.fn<MobileFetch>().mockRejectedValue(new TypeError("offline"));
    await expect(createMobileApi("https://lonagram.example", session, request)("messages.send")).rejects.toMatchObject({ code: "network" });
    expect(request).toHaveBeenCalledTimes(1);
    request.mockResolvedValue(new Response("<html>Sign in</html>"));
    await expect(createMobileApi("https://lonagram.example", session, request)("settings.get")).rejects.toMatchObject({ code: "api" });
  });
});
