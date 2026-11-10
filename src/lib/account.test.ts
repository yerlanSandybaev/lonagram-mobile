import { describe, expect, it, vi } from "vitest";
import { changePassword, forgotPasswordUrl, publicTwinUrl, setRecoveryEmail, signOutOtherDevices, validateNewPassword, type AccountAuthClient } from "./account";

function fake(overrides: Record<string, unknown> = {}) {
  const auth = {
    updateUser: vi.fn().mockResolvedValue({ error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    ...overrides,
  };
  return { client: { auth } as unknown as AccountAuthClient, auth };
}

describe("recovery email", () => {
  it("asks Supabase to email a confirmation link that returns to the web confirm route", async () => {
    const { client, auth } = fake();
    const result = await setRecoveryEmail(client, " me@example.com ", "https://lonagram.com/");
    expect(auth.updateUser).toHaveBeenCalledWith({ email: "me@example.com" }, { emailRedirectTo: "https://lonagram.com/auth/confirm?type=email_change" });
    expect(result.ok).toBe(true);
    expect((result as { notice: string }).notice).toContain("cannot be recovered");
  });
  it("rejects malformed addresses without calling the server", async () => {
    const { client, auth } = fake();
    expect(await setRecoveryEmail(client, "nope", "https://lonagram.com")).toEqual({ ok: false, error: "Enter a valid email address." });
    expect(auth.updateUser).not.toHaveBeenCalled();
  });
  it("never reveals that an address is already registered", async () => {
    const { client } = fake({ updateUser: vi.fn().mockResolvedValue({ error: { message: "A user with this email address has already been registered" } }) });
    const result = await setRecoveryEmail(client, "taken@example.com", "https://lonagram.com");
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toMatch(/registered|already|exists|taken/i);
  });
});

describe("change password", () => {
  it("validates length and confirmation first", () => {
    expect(validateNewPassword("short", "short")).toMatch(/at least 8/);
    expect(validateNewPassword("longenough1", "different1")).toMatch(/do not match/);
    expect(validateNewPassword("longenough1", "longenough1")).toBeNull();
  });
  it("re-checks the current password before updating", async () => {
    const { client, auth } = fake();
    const result = await changePassword(client, { email: "a@b.co", current: "old-pass-1", next: "new-pass-12", confirm: "new-pass-12" });
    expect(result.ok).toBe(true);
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: "a@b.co", password: "old-pass-1" });
    expect(auth.updateUser).toHaveBeenCalledWith({ password: "new-pass-12" });
    expect(auth.signInWithPassword.mock.invocationCallOrder[0]).toBeLessThan(auth.updateUser.mock.invocationCallOrder[0]);
  });
  it("stops when the current password is wrong", async () => {
    const { client, auth } = fake({ signInWithPassword: vi.fn().mockResolvedValue({ error: { message: "bad" } }) });
    expect(await changePassword(client, { email: "a@b.co", current: "wrong", next: "new-pass-12", confirm: "new-pass-12" })).toEqual({ ok: false, error: "Your current password is incorrect." });
    expect(auth.updateUser).not.toHaveBeenCalled();
  });
  it("requires the current password", async () => {
    const { client } = fake();
    expect((await changePassword(client, { email: "a@b.co", current: "", next: "new-pass-12", confirm: "new-pass-12" })).ok).toBe(false);
  });
});

describe("other devices and forgot password", () => {
  it("signs out only other sessions", async () => {
    const { client, auth } = fake();
    expect((await signOutOtherDevices(client)).ok).toBe(true);
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "others" });
  });
  it("opens the web forgot-password page", () => {
    expect(forgotPasswordUrl("https://lonagram.com/")).toBe("https://lonagram.com/forgot-password");
    expect(forgotPasswordUrl(undefined)).toBeNull();
  });
  it("builds the public Twin page link", () => {
    expect(publicTwinUrl("erlan_s", "https://lonagram.com/")).toBe("https://lonagram.com/t/erlan_s");
  });
});
