import { describe, expect, it } from "vitest";

import { createChunkedSecureStorage, type KeyValueStore } from "./chunked-secure-storage";

function limitedStore(limit: number): KeyValueStore & { keys(): string[] } {
  const values = new Map<string, string>();
  return {
    keys: () => [...values.keys()],
    async getItem(key) {
      return values.get(key) ?? null;
    },
    async setItem(key, value) {
      const size = new TextEncoder().encode(value).length;
      if (size > limit) throw new Error(`value exceeds ${limit} bytes`);
      values.set(key, value);
    },
    async removeItem(key) {
      values.delete(key);
    },
  };
}

describe("createChunkedSecureStorage", () => {
  it("stores a short session in one secure-store entry", async () => {
    const backing = limitedStore(20);
    const storage = createChunkedSecureStorage(backing, 20);
    await storage.setItem("sb-auth-token", "short-session");
    expect(await storage.getItem("sb-auth-token")).toBe("short-session");
    expect(backing.keys()).toEqual(["sb-auth-token"]);
  });

  it("splits a session that would exceed the platform value limit", async () => {
    const backing = limitedStore(8);
    const storage = createChunkedSecureStorage(backing, 8);
    const session = "abcdefghijklmnopqrstuvwxyz";
    await storage.setItem("sb-auth-token", session);
    expect(await storage.getItem("sb-auth-token")).toBe(session);
    expect(backing.keys().every((key) => key !== "sb-auth-token")).toBe(true);
    for (const key of backing.keys()) {
      const value = await backing.getItem(key);
      expect(new TextEncoder().encode(value ?? "").length).toBeLessThanOrEqual(8);
    }
  });

  it("removes leftover chunks when the session shrinks", async () => {
    const backing = limitedStore(8);
    const storage = createChunkedSecureStorage(backing, 8);
    await storage.setItem("sb-auth-token", "abcdefghijklmnopqrstuvwxyz");
    await storage.setItem("sb-auth-token", "tiny");
    expect(await storage.getItem("sb-auth-token")).toBe("tiny");
    expect(backing.keys()).toEqual(["sb-auth-token"]);
  });
});
