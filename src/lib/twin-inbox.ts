// Twin Inbox view logic, the same rules as the website (domain/conversation-groups.ts and
// domain/twin-inbox.ts). Pure so it can be tested without React Native.

export type InboxThread = {
  id: string;
  other: { id: string; displayName: string };
  preview: string;
  unread: boolean;
  status: string;
  direction: "incoming" | "outgoing";
  updatedAt: string;
  muted?: boolean;
};

export type InboxFilter = "all" | "outgoing" | "incoming" | "unread" | "muted";
export const INBOX_FILTERS: { id: InboxFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "outgoing", label: "With their Twins" },
  { id: "incoming", label: "With my Twin" },
  { id: "unread", label: "Unread" },
  { id: "muted", label: "Muted" },
];

export function parseFilter(value: unknown): InboxFilter {
  return INBOX_FILTERS.some((item) => item.id === value) ? (value as InboxFilter) : "all";
}

// Sessions with the same person in the same direction, newest first. The first is the row,
// the rest are its "earlier chats".
export function groupTwinThreads<T extends InboxThread>(threads: T[]): T[][] {
  const groups = new Map<string, T[]>();
  for (const thread of [...threads].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id))) {
    const key = JSON.stringify([thread.other.id, thread.direction]);
    const group = groups.get(key) ?? [];
    group.push(thread);
    groups.set(key, group);
  }
  return [...groups.values()];
}

// Only the latest session decides which view a group belongs to. Muted chats show only under Muted.
export function filterTwinInbox<T extends InboxThread>(threads: T[], filter: InboxFilter): T[][] {
  return groupTwinThreads(threads).filter(([latest]) => {
    if (filter === "muted") return Boolean(latest.muted);
    if (latest.muted) return false;
    if (filter === "unread") return latest.unread;
    if (filter === "incoming" || filter === "outgoing") return latest.direction === filter;
    return true;
  });
}

// Ongoing and Past sections, by the latest session's status.
export function inboxSections<T extends InboxThread>(groups: T[][]) {
  return {
    ongoing: groups.filter(([latest]) => latest.status === "active"),
    past: groups.filter(([latest]) => latest.status !== "active"),
  };
}

export function rowTitle(thread: InboxThread): string {
  return thread.direction === "outgoing" ? `${thread.other.displayName}’s Twin` : `${thread.other.displayName} · with your Twin`;
}

export function rowSubtitle(thread: InboxThread): string {
  const base = thread.direction === "outgoing" ? "You talk to their Twin" : "Read-only for you";
  return `${base}${thread.status !== "active" ? " · Ended" : ""}${thread.muted ? " · Muted" : ""}`;
}

export function earlierLabel(count: number): string {
  return `${count} earlier ${count === 1 ? "chat" : "chats"}`;
}

export function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}
