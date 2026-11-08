import { describe, expect, it, vi } from "vitest";
import {
  MEMORY_FULL,
  applyMemoryChange,
  applyReply,
  applyUndo,
  beginSend,
  chipsFor,
  createPrivateTwinApi,
  failSend,
  initialChat,
  isMissingOperation,
  memoryUpdateInput,
  needsShareConfirmation,
  reconcileMemories,
  type TwinMemory,
} from "./private-twin";
import { uuidv4 } from "./uuid";

const memory = (over: Partial<TwinMemory> = {}): TwinMemory => ({
  id: "m1", response: "Loves slow films", visibility: "private", approved: true, sensitive: false, ...over,
});

describe("sending and retrying", () => {
  it("reuses the request id when the same text is retried", () => {
    const first = beginSend(initialChat(), "I moved to Astana", "id-1");
    const failed = failSend(first.state, "id-1", "Connection interrupted");
    expect(failed.lines.at(-1)).toMatchObject({ id: "id-1", status: "failed" });
    const retry = beginSend(failed, "I moved to Astana", "id-2");
    expect(retry.requestId).toBe("id-1");
    expect(retry.state.lines.filter((line) => line.role === "you")).toHaveLength(1);
    expect(retry.state.lines.at(-1)?.status).toBe("sending");
  });
  it("uses a new request id for different text", () => {
    const first = beginSend(initialChat(), "one", "id-1");
    expect(beginSend(first.state, "two", "id-2").requestId).toBe("id-2");
  });
  it("starts a fresh id after a successful reply", () => {
    const sent = beginSend(initialChat(), "hello", "id-1");
    const done = applyReply(sent.state, "id-1", "hello", { text: "Hi!" });
    expect(done.attempt).toBeNull();
    expect(beginSend(done, "hello", "id-9").requestId).toBe("id-9");
  });
});

describe("history", () => {
  it("keeps only the last 8 lines and sends them with the next message", () => {
    let state = initialChat();
    for (let i = 0; i < 6; i += 1) {
      const sent = beginSend(state, `m${i}`, `id-${i}`);
      state = applyReply(sent.state, sent.requestId, `m${i}`, { text: `r${i}` });
    }
    expect(state.history).toHaveLength(8);
    expect(state.history[0]).toEqual({ role: "you", text: "m2" });
    expect(beginSend(state, "next", "x").history).toHaveLength(8);
  });
  it("is cleared by resetHistory and skipped when the provider is unavailable", () => {
    const sent = beginSend(initialChat(), "hi", "a");
    const reset = applyReply(sent.state, "a", "hi", { text: "ok", resetHistory: true });
    expect(reset.history).toEqual([]);
    const down = applyReply(beginSend(initialChat(), "hi", "b").state, "b", "hi", { text: "offline", providerUnavailable: true });
    expect(down.history).toEqual([]);
  });
});

describe("remembered chips and undo", () => {
  it("shows Remembered with a sensitive tag and updates memory after a reply", () => {
    const sent = beginSend(initialChat(), "my therapy is Tuesday", "a");
    const mem = memory({ id: "m9", response: "Therapy on Tuesdays", sensitive: true });
    const state = applyReply(sent.state, "a", "x", { text: "Noted.", memories: [mem] });
    expect(state.targetMemoryId).toBe("m9");
    const chips = chipsFor(state.lines.find((line) => line.id === "a")!, state.memories);
    expect(chips).toEqual([{ kind: "remembered", memory: mem, sensitive: true }]);
  });
  it("labels shared and suggested memories without an Undo chip", () => {
    const line = { id: "a", role: "you" as const, text: "x", memoryIds: ["s", "p"] };
    const kinds = chipsFor(line, [memory({ id: "s", visibility: "shared" }), memory({ id: "p", approved: false })]).map((chip) => chip.kind);
    expect(kinds).toEqual(["shared", "suggested"]);
  });
  it("undo forgets the fact, shows Forgotten, and clears the dialogue", () => {
    const sent = beginSend(initialChat(), "x", "a");
    const mem = memory();
    const saved = applyReply(sent.state, "a", "x", { text: "ok", memories: [mem] });
    const undone = applyUndo(saved, "a", mem);
    expect(undone.history).toEqual([]);
    expect(undone.targetMemoryId).toBeUndefined();
    expect(undone.memories).toHaveLength(0);
    expect(chipsFor(undone.lines.find((line) => line.id === "a")!, undone.memories)).toEqual([{ kind: "forgotten", text: "Loves slow films" }]);
  });
  it("reports a full memory and applies forgottenId", () => {
    const sent = beginSend(initialChat(), "x", "a");
    expect(applyReply(sent.state, "a", "x", { text: "ok", memoriesSkipped: true }).error).toBe(MEMORY_FULL);
    const mem = memory();
    const saved = applyReply(beginSend(initialChat(), "x", "b").state, "b", "x", { text: "ok", memories: [mem] });
    const forgotten = applyReply(beginSend(saved, "forget it", "c").state, "c", "forget it", { text: "Forgotten", forgottenId: "m1" });
    expect(forgotten.memories).toHaveLength(0);
    expect(forgotten.targetMemoryId).toBeUndefined();
  });
  it("memory changes made elsewhere reset the dialogue", () => {
    const mem = memory();
    const saved = applyReply(beginSend(initialChat(), "x", "a").state, "a", "x", { text: "ok", memories: [mem] });
    const changed = applyMemoryChange(saved, { memory: { ...mem, visibility: "shared" } });
    expect(changed.history).toEqual([]);
    expect(changed.memories[0].visibility).toBe("shared");
    expect(reconcileMemories(saved, [])).toMatchObject({ memories: [], history: [] });
    expect(reconcileMemories(saved, [mem])).toBe(saved);
  });
});

describe("confirm before sharing a sensitive note", () => {
  it("requires confirmation only to share a private sensitive memory", () => {
    expect(needsShareConfirmation(memory({ sensitive: true }))).toBe(true);
    expect(needsShareConfirmation(memory({ sensitive: true, visibility: "shared" }))).toBe(false);
    expect(needsShareConfirmation(memory())).toBe(false);
  });
  it("refuses to build a share request without confirmation", () => {
    const sensitive = memory({ sensitive: true });
    expect(() => memoryUpdateInput(sensitive, "share")).toThrow(/Confirm/);
    expect(memoryUpdateInput(sensitive, "share", { confirmSensitive: true })).toEqual({ id: "m1", intent: "share", confirmSensitive: true });
    expect(memoryUpdateInput(memory(), "share")).toEqual({ id: "m1", intent: "share" });
    expect(memoryUpdateInput(memory(), "edit", { text: " new " })).toEqual({ id: "m1", intent: "edit", text: "new" });
  });
});

describe("private twin API", () => {
  it("sends the request id as both input and Idempotency-Key and trims history to 8", async () => {
    const call = vi.fn().mockResolvedValue({ text: "hi" });
    const api = createPrivateTwinApi(call as never, (_s, run) => run("k"));
    const history = Array.from({ length: 12 }, (_, i) => ({ role: "you" as const, text: String(i) }));
    await api.talk({ cue: "hello", requestId: "11111111-1111-4111-8111-111111111111", history });
    const [op, input, key] = call.mock.calls[0];
    expect(op).toBe("twin.private.talk");
    expect(key).toBe("11111111-1111-4111-8111-111111111111");
    expect((input as { history: unknown[] }).history).toHaveLength(8);
    expect((input as { requestId: string }).requestId).toBe(key);
  });
  it("never calls the server to share a sensitive note unconfirmed", async () => {
    const call = vi.fn();
    const api = createPrivateTwinApi(call as never, (_s, run) => run("k"));
    expect(() => api.updateMemory(memory({ sensitive: true }), "share")).toThrow(/Confirm/);
    expect(call).not.toHaveBeenCalled();
  });
  it("detects operations the server does not have yet", () => {
    expect(isMissingOperation(Object.assign(new Error("x"), { code: "not_found" }))).toBe(true);
    expect(isMissingOperation(new Error("x"))).toBe(false);
  });
});

describe("uuid", () => {
  it("formats a v4 id from random bytes", () => {
    const id = uuidv4({ getRandomValues: (array) => array.fill(255) });
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(uuidv4({})).toMatch(/^[0-9a-f-]{36}$/);
  });
});
