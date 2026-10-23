import { describe, expect, it, vi } from "vitest";
import { createIntentRunner } from "./request-intents";

describe("request intent keys", () => {
  it("deduplicates in-flight actions and keeps the key after an uncertain failure", async () => {
    const run = createIntentRunner(); const keys: string[] = [];
    const send = vi.fn(async (key: string) => { keys.push(key); throw new Error("offline"); });
    const first = run("fixture", send); const duplicate = run("fixture", send);
    expect(duplicate).toBe(first); await expect(first).rejects.toThrow("offline");
    await expect(run("fixture", send)).rejects.toThrow("offline");
    expect(keys[0]).toBe(keys[1]); expect(send).toHaveBeenCalledTimes(2);
  });
  it("rotates the key after success or a definitive rejection", async () => {
    const run = createIntentRunner(); const keys: string[] = [];
    const send = async (key: string) => { keys.push(key); return true; };
    await run("fixture", send); await run("fixture", send);
    expect(keys[0]).not.toBe(keys[1]);
    await expect(run("fixture", async (key) => { keys.push(key); throw { status: 403 }; })).rejects.toMatchObject({ status: 403 });
    await run("fixture", send); expect(keys[2]).not.toBe(keys[3]);
  });
});
