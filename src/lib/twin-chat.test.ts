import { describe, expect, it, vi } from "vitest";
import { chatRows, inboxTitle, realChatState, twinChatView, type TwinChatThread } from "./twin-chat";
import { createPrivateTwinApi, questionPrompt } from "./private-twin";

const thread = (over: Partial<TwinChatThread> = {}): TwinChatThread => ({
  conversation: { id: "c1", status: "active" },
  other: { id: "aidana", displayName: "Aidana", username: "aidana", avatarUrl: null },
  initiatedBySelf: true,
  messages: [],
  ...over,
});
const msg = (id: string, speakerUserId: string, fromPerson: boolean, createdAt = "2026-11-11T10:00:00Z") => ({ id, speakerUserId, fromPerson, body: id, createdAt });

describe("Twin chat header", () => {
  it("visitor sees the other person's Twin", () => {
    expect(twinChatView(thread(), "me")).toMatchObject({ visitor: true, title: "Aidana's Twin", status: "Twin chat", twinOwnerId: "aidana", twinLabel: "Aidana's Twin" });
  });
  it("owner sees who is talking to their Twin, read-only", () => {
    expect(twinChatView(thread({ initiatedBySelf: false }), "me")).toMatchObject({ visitor: false, title: "Aidana · with your Twin", status: "Read-only", twinLabel: "Your Twin" });
  });
  it("ended chats say Ended", () => {
    expect(twinChatView(thread({ conversation: { id: "c1", status: "stopped" } }), "me").status).toBe("Ended");
  });
});

describe("message runs", () => {
  it("shows name and time once per run and marks my own messages", () => {
    const rows = chatRows(thread({ messages: [msg("a", "me", true), msg("b", "me", true), msg("c", "aidana", false), msg("d", "aidana", false), msg("e", "me", true)] }), "me");
    expect(rows.map((row) => row.header?.name ?? null)).toEqual(["You", null, "Aidana's Twin", null, "You"]);
    expect(rows.map((row) => row.mine)).toEqual([true, true, false, false, true]);
    expect(rows[0].header?.time).toBe("10:00");
  });
  it("labels the Twin as Your Twin when someone talks to mine", () => {
    const rows = chatRows(thread({ initiatedBySelf: false, messages: [msg("a", "aidana", true), msg("b", "me", false)] }), "me");
    expect(rows.map((row) => row.header?.name)).toEqual(["Aidana", "Your Twin"]);
    expect(rows[0].mine).toBe(false);
  });
});

describe("real chat action", () => {
  const empty = { incoming: [], outgoing: [], connections: [] };
  it("covers invite, sent, accept and open", () => {
    expect(realChatState(empty, "aidana")).toEqual({ kind: "none", label: "Invite to real chat" });
    expect(realChatState({ ...empty, outgoing: [{ request: { id: "r", toUserId: "aidana", status: "pending" } }] }, "aidana").kind).toBe("sent");
    expect(realChatState({ ...empty, incoming: [{ request: { id: "r2", fromUserId: "aidana", status: "pending" } }] }, "aidana")).toEqual({ kind: "incoming", requestId: "r2", label: "Accept real chat" });
    expect(realChatState({ ...empty, connections: [{ person: { id: "aidana" }, conversationId: "d1" }] }, "aidana")).toEqual({ kind: "open", conversationId: "d1", label: "Open real chat" });
    expect(realChatState(undefined, "aidana").kind).toBe("none");
  });
});

describe("Twin Inbox", () => {
  it("titles chats by direction", () => {
    expect(inboxTitle({ direction: "outgoing", other: { displayName: "Aidana" } })).toBe("Aidana's Twin");
    expect(inboxTitle({ direction: "incoming", other: { displayName: "Yerlan" } })).toBe("Yerlan · with your Twin");
  });
});

describe("visitor questions on Home", () => {
  it("reads like a Twin message", () => {
    expect(questionPrompt({ visitorName: "Aidana", text: "Do you climb?" })).toBe("Aidana asked: “Do you climb?” What should I say?");
  });
  it("answers with scope auto, or skips", async () => {
    const call = vi.fn().mockResolvedValue({ done: "visitor" });
    const api = createPrivateTwinApi(call as never, (_s, run) => run("key"));
    await api.answerQuestion({ id: "q1" }, " Outdoors ");
    expect(call).toHaveBeenCalledWith("twin.question.answer", { messageId: "q1", scope: "auto", answer: "Outdoors" }, "key");
    await api.answerQuestion({ id: "q1" }, null);
    expect(call).toHaveBeenLastCalledWith("twin.question.answer", { messageId: "q1", scope: "skip" }, "key");
    await api.listQuestions();
    expect(call).toHaveBeenLastCalledWith("twin.question.list");
  });
});
