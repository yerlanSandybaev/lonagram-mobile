import { describe, expect, it } from "vitest";

import { isUsername, signInEmail, validateSignIn, validateSignUp } from "./auth-input";

const validSignUp = {
  password: "lonagram-demo",
  username: " Maya_Chen ",
  is18Plus: true,
};

describe("validateSignUp", () => {
  it("is username and password, like the website, with no email needed", () => {
    expect(validateSignUp(validSignUp)).toEqual({ ok: true, value: { username: "maya_chen", password: "lonagram-demo" } });
  });

  it("keeps an optional email, lowercased, and rejects a malformed one", () => {
    expect(validateSignUp({ ...validSignUp, email: " Maya@Example.com " })).toEqual({
      ok: true,
      value: { username: "maya_chen", password: "lonagram-demo", email: "maya@example.com" },
    });
    expect(validateSignUp({ ...validSignUp, email: "maya@" })).toEqual({ ok: false, error: "Enter a valid email address, or leave it blank." });
  });

  it("requires the 18+ confirmation", () => {
    const result = validateSignUp({ ...validSignUp, is18Plus: false });
    expect(result).toEqual({ ok: false, error: "Lonagram is for adults 18 and older." });
  });

  it("rejects usernames the profiles table would reject and passwords outside 8–128", () => {
    expect(validateSignUp({ ...validSignUp, username: "ab" }).ok).toBe(false);
    expect(validateSignUp({ ...validSignUp, password: "short" }).ok).toBe(false);
    expect(validateSignUp({ ...validSignUp, password: "x".repeat(129) }).ok).toBe(false);
  });
});

describe("validateSignIn", () => {
  it("uses the same incorrect-credentials message as the website", () => {
    expect(validateSignIn({ email: "not-an-email", password: "short" })).toEqual({
      ok: false,
      error: "Email, username or password is incorrect.",
    });
  });

  it("accepts a username and maps it to the web's internal account address", () => {
    expect(validateSignIn({ email: " Maya_Chen ", password: "lonagram-demo" })).toEqual({
      ok: true,
      value: { email: "maya_chen@accounts.lonagram.invalid", password: "lonagram-demo" },
    });
  });

  it("still accepts a normal email unchanged", () => {
    expect(signInEmail(" maya@example.com ")).toBe("maya@example.com");
  });

  it("rejects malformed usernames and emails", () => {
    expect(signInEmail("ab")).toBeNull();
    expect(signInEmail("has space")).toBeNull();
    expect(signInEmail("a@b")).toBeNull();
  });
});

describe("isUsername", () => {
  it("tells usernames from email addresses", () => {
    expect(isUsername(" Maya_Chen ")).toBe(true);
    expect(isUsername("maya@example.com")).toBe(false);
  });
});
