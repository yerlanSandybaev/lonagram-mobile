// Private chat between a user and their own Twin, plus the memories it keeps.
// Everything here is pure (or takes the API as an argument) so it can be tested
// without React Native.

export type DialogueRole = "you" | "twin";
export type DialogueLine = { role: DialogueRole; text: string };
export type TwinMemory = {
  id: string;
  response: string;
  visibility: "private" | "shared";
  approved: boolean;
  sensitive: boolean;
};
export type TalkReply = {
  text: string;
  memory?: TwinMemory;
  memories?: TwinMemory[];
  memoriesSkipped?: boolean;
  forgottenId?: string;
  resetHistory?: boolean;
  providerUnavailable?: boolean;
};
export type MemoryIntent = "remember" | "share" | "private" | "edit" | "delete";
export type MemoryChange = { memory?: TwinMemory; deletedId?: string };

export type ChatLine = {
  id: string;
  role: DialogueRole;
  text: string;
  status?: "sending" | "failed";
  memoryIds?: string[];
  forgotten?: string[];
};
export type ChatState = {
  lines: ChatLine[];
  memories: TwinMemory[];
  history: DialogueLine[];
  targetMemoryId?: string;
  attempt: { id: string; text: string } | null;
  error: string;
};

export const HISTORY_LIMIT = 8;
export const WELCOME = "Hey, I'm here. What's on your mind?";
export const MEMORY_FULL = "Your Twin's memory is full. Delete old notes under Your Twin's memories to save new ones.";
export const SENSITIVE_CONFIRM = "This is about a sensitive topic. Share it with other people?";

export function initialChat(): ChatState {
  return { lines: [{ id: "welcome", role: "twin", text: WELCOME }], memories: [], history: [], attempt: null, error: "" };
}

const recent = (history: DialogueLine[]) => history.slice(-HISTORY_LIMIT);
const savedIn = (reply: TalkReply) => (reply.memories?.length ? reply.memories : reply.memory ? [reply.memory] : []);

// A retry of the same text reuses the same request id, so the server can tell it is the same message.
export function beginSend(state: ChatState, text: string, freshId: string) {
  const body = text.trim();
  const attempt = state.attempt?.text === body ? state.attempt : { id: freshId, text: body };
  const exists = state.lines.some((line) => line.id === attempt.id);
  const lines: ChatLine[] = exists
    ? state.lines.map((line) => (line.id === attempt.id ? { ...line, status: "sending" as const } : line))
    : [...state.lines, { id: attempt.id, role: "you" as const, text: body, status: "sending" as const }];
  return {
    requestId: attempt.id,
    history: recent(state.history),
    state: { ...state, lines, attempt, error: "" },
  };
}

export function failSend(state: ChatState, requestId: string, message: string): ChatState {
  return {
    ...state,
    error: message,
    lines: state.lines.map((line) => (line.id === requestId ? { ...line, status: "failed" as const } : line)),
  };
}

export function applyReply(state: ChatState, requestId: string, text: string, reply: TalkReply): ChatState {
  const saved = savedIn(reply);
  const lines: ChatLine[] = [
    ...state.lines.map((line) =>
      line.id === requestId ? { ...line, status: undefined, memoryIds: saved.map((item) => item.id) } : line,
    ),
    { id: `${requestId}:reply`, role: "twin" as const, text: reply.text },
  ];
  let history = state.history;
  if (reply.resetHistory) history = [];
  else if (!reply.providerUnavailable) history = recent([...history, { role: "you", text }, { role: "twin", text: reply.text }]);
  let memories = saved.length ? [...saved, ...state.memories.filter((item) => !saved.some((s) => s.id === item.id))] : state.memories;
  let targetMemoryId = saved.length ? saved[0].id : state.targetMemoryId;
  if (reply.forgottenId) {
    memories = memories.filter((item) => item.id !== reply.forgottenId);
    targetMemoryId = undefined;
  }
  return { ...state, lines, history, memories, targetMemoryId, attempt: null, error: reply.memoriesSkipped ? MEMORY_FULL : "" };
}

// Undo of a just-remembered fact. Forgetting also clears the short dialogue so the old fact is not replayed.
export function applyUndo(state: ChatState, lineId: string, memory: TwinMemory): ChatState {
  return {
    ...state,
    error: "",
    history: [],
    targetMemoryId: state.targetMemoryId === memory.id ? undefined : state.targetMemoryId,
    memories: state.memories.filter((item) => item.id !== memory.id),
    lines: state.lines.map((line) => (line.id === lineId ? { ...line, forgotten: [...(line.forgotten ?? []), memory.response] } : line)),
  };
}

// A memory changed elsewhere (the memories screen). Old dialogue must not bring a changed fact back.
export function applyMemoryChange(state: ChatState, change: MemoryChange): ChatState {
  let memories = state.memories;
  if (change.deletedId) memories = memories.filter((item) => item.id !== change.deletedId);
  if (change.memory) {
    const updated = change.memory;
    memories = memories.some((item) => item.id === updated.id) ? memories.map((item) => (item.id === updated.id ? updated : item)) : memories;
  }
  return { ...state, memories, history: [], targetMemoryId: undefined };
}

// Sync chip data with the latest memory list (e.g. after returning from the memories screen).
export function reconcileMemories(state: ChatState, latest: TwinMemory[]): ChatState {
  const byId = new Map(latest.map((item) => [item.id, item]));
  let changed = false;
  const memories: TwinMemory[] = [];
  for (const item of state.memories) {
    const fresh = byId.get(item.id);
    if (!fresh) {
      changed = true;
      continue;
    }
    if (JSON.stringify(fresh) !== JSON.stringify(item)) changed = true;
    memories.push(fresh);
  }
  return changed ? { ...state, memories, history: [], targetMemoryId: undefined } : state;
}

export type Chip =
  | { kind: "remembered"; memory: TwinMemory; sensitive: boolean }
  | { kind: "shared"; memory: TwinMemory }
  | { kind: "suggested"; memory: TwinMemory }
  | { kind: "forgotten"; text: string };

// What to show under a message: Remembered (with Undo), shared / suggested notes, and Forgotten lines.
export function chipsFor(line: ChatLine, memories: TwinMemory[]): Chip[] {
  const chips: Chip[] = [];
  for (const id of line.memoryIds ?? []) {
    const memory = memories.find((item) => item.id === id);
    if (!memory) continue;
    if (memory.visibility === "shared") chips.push({ kind: "shared", memory });
    else if (!memory.approved) chips.push({ kind: "suggested", memory });
    else chips.push({ kind: "remembered", memory, sensitive: memory.sensitive });
  }
  for (const text of line.forgotten ?? []) chips.push({ kind: "forgotten", text });
  return chips;
}

export function needsShareConfirmation(memory: Pick<TwinMemory, "visibility" | "sensitive">): boolean {
  return memory.visibility !== "shared" && memory.sensitive;
}

export function memoryLabel(memory: TwinMemory): string {
  if (memory.visibility === "shared" && memory.approved) return "Shared";
  return memory.approved ? "Remembered" : "Suggested";
}

export function memoryUpdateInput(
  memory: TwinMemory,
  intent: MemoryIntent,
  options: { text?: string; confirmSensitive?: boolean } = {},
) {
  if (intent === "share" && needsShareConfirmation(memory) && options.confirmSensitive !== true) {
    throw new Error("Confirm before sharing a sensitive note.");
  }
  const text = options.text?.trim();
  if (intent === "edit" && !text) throw new Error("Write the memory text first.");
  return {
    id: memory.id,
    intent,
    ...(intent === "edit" ? { text } : {}),
    ...(intent === "share" && memory.sensitive ? { confirmSensitive: true } : {}),
  };
}

type Call = <T>(operation: string, input?: unknown, key?: string) => Promise<T>;
type RunIntent = <T>(scope: string, submit: (key: string) => Promise<T>) => Promise<T>;

export function isMissingOperation(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === "not_found";
}

export function createPrivateTwinApi(call: Call, runIntent: RunIntent) {
  return {
    talk(input: { cue: string; requestId: string; history?: DialogueLine[]; targetMemoryId?: string }) {
      const { history, targetMemoryId, ...rest } = input;
      return call<TalkReply>(
        "twin.private.talk",
        { ...rest, ...(history?.length ? { history: recent(history) } : {}), ...(targetMemoryId ? { targetMemoryId } : {}) },
        input.requestId,
      );
    },
    listMemories() {
      return call<TwinMemory[]>("twin.memory.list");
    },
    updateMemory(memory: TwinMemory, intent: MemoryIntent, options: { text?: string; confirmSensitive?: boolean } = {}) {
      const payload = memoryUpdateInput(memory, intent, options);
      return runIntent(`memory:${memory.id}:${intent}:${payload.text ?? ""}`, (key) => call<MemoryChange>("twin.memory.update", payload, key));
    },
  };
}
