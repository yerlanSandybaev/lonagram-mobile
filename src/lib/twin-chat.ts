// View logic for a Twin chat (someone talking to a Twin), kept pure for tests.

export type TwinChatMessage = {
  id: string;
  speakerUserId: string;
  body: string;
  createdAt: string;
  fromPerson: boolean;
};
export type TwinChatThread = {
  conversation: { id: string; status: string };
  messages: TwinChatMessage[];
  other: { id: string; displayName: string; username: string; avatarUrl: string | null };
  initiatedBySelf: boolean;
};

export type TwinChatView = {
  /** True when I started the chat and talk to the other person's Twin. */
  visitor: boolean;
  title: string;
  status: "Twin chat" | "Read-only" | "Ended";
  /** Whose Twin answers in this chat. */
  twinOwnerId: string;
  twinLabel: string;
};

const possessive = (name: string) => `${name}'s`;

export function twinChatView(thread: TwinChatThread, selfId: string): TwinChatView {
  const visitor = thread.initiatedBySelf;
  const name = thread.other.displayName;
  const ended = thread.conversation.status !== "active";
  return {
    visitor,
    title: visitor ? `${possessive(name)} Twin` : `${name} · with your Twin`,
    status: ended ? "Ended" : visitor ? "Twin chat" : "Read-only",
    twinOwnerId: visitor ? thread.other.id : selfId,
    twinLabel: visitor ? `${possessive(name)} Twin` : "Your Twin",
  };
}

export type ChatRow = {
  message: TwinChatMessage;
  mine: boolean;
  /** Speaker name and time are shown once, at the start of a run by the same speaker. */
  header: { name: string; time: string } | null;
};

function speakerKey(message: TwinChatMessage) {
  return `${message.fromPerson ? "person" : "twin"}:${message.speakerUserId}`;
}

export function chatRows(
  thread: TwinChatThread,
  selfId: string,
  formatTime: (iso: string) => string = (iso) => iso.slice(11, 16),
): ChatRow[] {
  const view = twinChatView(thread, selfId);
  return thread.messages.map((message, index) => {
    const previous = thread.messages[index - 1];
    const mine = message.fromPerson && message.speakerUserId === selfId;
    const name = !message.fromPerson ? view.twinLabel : mine ? "You" : thread.other.displayName;
    const sameRun = previous && speakerKey(previous) === speakerKey(message);
    return { message, mine, header: sameRun ? null : { name, time: formatTime(message.createdAt) } };
  });
}

export type HomeForChat = {
  incoming: { request: { id: string; fromUserId: string; status: string } }[];
  outgoing: { request: { id: string; toUserId: string; status: string } }[];
  connections: { person: { id: string }; conversationId: string | null }[];
};

export type RealChatState =
  | { kind: "open"; conversationId: string | null; label: "Open real chat" }
  | { kind: "incoming"; requestId: string; label: "Accept real chat" }
  | { kind: "sent"; label: "Invitation sent" }
  | { kind: "none"; label: "Invite to real chat" };

// The one real-chat action shown at the bottom of a Twin chat.
export function realChatState(home: HomeForChat | undefined, otherId: string): RealChatState {
  const connection = home?.connections.find((item) => item.person.id === otherId);
  if (connection) return { kind: "open", conversationId: connection.conversationId, label: "Open real chat" };
  const incoming = home?.incoming.find((item) => item.request.fromUserId === otherId && item.request.status === "pending");
  if (incoming) return { kind: "incoming", requestId: incoming.request.id, label: "Accept real chat" };
  const outgoing = home?.outgoing.find((item) => item.request.toUserId === otherId && item.request.status === "pending");
  if (outgoing) return { kind: "sent", label: "Invitation sent" };
  return { kind: "none", label: "Invite to real chat" };
}

export type InboxThread = {
  id: string;
  status: string;
  direction: "incoming" | "outgoing";
  other: { displayName: string };
  preview: string;
  unread: boolean;
  muted?: boolean;
};

export function inboxTitle(thread: Pick<InboxThread, "direction" | "other">): string {
  return thread.direction === "outgoing" ? `${possessive(thread.other.displayName)} Twin` : `${thread.other.displayName} · with your Twin`;
}
