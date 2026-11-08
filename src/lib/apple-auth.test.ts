import { describe, expect, it } from "vitest";
import { appleIdentityToken, createAppleNonce, isAppleCancel } from "./apple-auth";

describe("Apple nonce", () => {
  it("gives Apple the hash and Supabase the raw value", async () => {
    const nonce = await createAppleNonce(() => "ab-cd-ef", async (value) => `hash(${value})`);
    expect(nonce.raw).toBe("abcdef");
    expect(nonce.hashed).toBe("hash(abcdef)");
    expect(nonce.hashed).not.toBe(nonce.raw);
  });
});

describe("Apple credential", () => {
  it("requires an identity token", () => {
    expect(appleIdentityToken({ identityToken: " token " })).toBe("token");
    expect(appleIdentityToken({ identityToken: null })).toBeNull();
    expect(appleIdentityToken({ identityToken: "  " })).toBeNull();
    expect(appleIdentityToken(undefined)).toBeNull();
  });
  it("treats closing the Apple sheet as a cancel", () => {
    expect(isAppleCancel({ code: "ERR_REQUEST_CANCELED" })).toBe(true);
    expect(isAppleCancel(new Error("x"))).toBe(false);
  });
});
