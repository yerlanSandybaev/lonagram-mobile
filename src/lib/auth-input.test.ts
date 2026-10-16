import { describe, expect, it } from "vitest";

import { validateSignIn, validateSignUp } from "./auth-input";

const validSignUp = {
  email: "maya@example.com",
  password: "lonagram-demo",
  username: "Maya_Chen",
  displayName: " Maya Chen ",
  is18Plus: true,
};

describe("validateSignUp", () => {
  it("matches the website signup contract and the profile trigger metadata", () => {
    const result = validateSignUp(validSignUp);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.username).toBe("maya_chen");
    expect(result.value.displayName).toBe("Maya Chen");
    expect(result.value.data).toEqual({
      is_18_plus: true,
      username: "maya_chen",
      display_name: "Maya Chen",
    });
  });

  it("requires the 18+ confirmation", () => {
    const result = validateSignUp({ ...validSignUp, is18Plus: false });
    expect(result).toEqual({ ok: false, error: "Lonagram is for adults 18 and older." });
  });

  it("rejects usernames the profiles table would reject", () => {
    const result = validateSignUp({ ...validSignUp, username: "ab" });
    expect(result.ok).toBe(false);
  });
});

describe("validateSignIn", () => {
  it("uses the same incorrect-credentials message as the website", () => {
    expect(validateSignIn({ email: "not-an-email", password: "short" })).toEqual({
      ok: false,
      error: "Email or password is incorrect.",
    });
  });
});
