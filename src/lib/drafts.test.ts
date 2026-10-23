import { describe, expect, it, vi } from "vitest";
import { createDraftStore } from "./drafts";

describe("account-scoped message drafts", () => {
  it("keeps drafts and retry keys on failure, then clears only after acknowledgement", async () => {
    const store = createDraftStore(); store.edit("chat", " Hello ");
    const submit = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({});
    expect(await store.send("chat", submit)).toBe(false);
    expect(store.get("chat")).toMatchObject({ text: " Hello ", error: "offline", pending: false });
    expect(await store.send("chat", submit)).toBe(true);
    expect(submit.mock.calls[0]).toEqual(submit.mock.calls[1]);
    expect(store.get("chat")).toMatchObject({ text: "", error: "", attempt: null });
  });
  it("locks synchronously against rapid duplicate sends and edits in flight", async () => {
    const store = createDraftStore(); store.edit("chat", "Hello");
    let finish!: () => void;
    const submit = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    const first = store.send("chat", submit);
    store.edit("chat", "Changed");
    expect(store.get("chat").text).toBe("Hello");
    expect(await store.send("chat", submit)).toBe(false);
    expect(submit).toHaveBeenCalledTimes(1); finish(); await first;
  });
  it("isolates conversations and accounts, and ignores empty sends", async () => {
    const first = createDraftStore(); const second = createDraftStore(); const submit = vi.fn();
    first.edit("one", "Private draft"); first.edit("two", "Other draft");
    expect(second.get("one").text).toBe("");
    expect(first.get("one").text).toBe("Private draft");
    expect(await first.send("empty", submit)).toBe(false); expect(submit).not.toHaveBeenCalled();
  });
});
