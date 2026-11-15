import { describe, expect, it } from "vitest";
import { earlierLabel, filterTwinInbox, groupTwinThreads, inboxSections, parseFilter, rowSubtitle, rowTitle, type InboxThread } from "./twin-inbox";

const thread = (over: Partial<InboxThread> = {}): InboxThread => ({
  id: "t1",
  other: { id: "p1", displayName: "Aidana" },
  preview: "Hi",
  unread: false,
  status: "active",
  direction: "outgoing",
  updatedAt: "2026-11-10T10:00:00Z",
  ...over,
});

describe("twin inbox", () => {
  it("groups sessions with the same person and direction, newest first", () => {
    const groups = groupTwinThreads([
      thread({ id: "old", updatedAt: "2026-11-01T10:00:00Z" }),
      thread({ id: "new" }),
      thread({ id: "in", direction: "incoming" }),
    ]);
    expect(groups).toHaveLength(2);
    const outgoing = groups.find((group) => group[0].direction === "outgoing")!;
    expect(outgoing.map((item) => item.id)).toEqual(["new", "old"]);
  });
  it("filters by the latest session and hides muted chats except under Muted", () => {
    const list = [
      thread({ id: "a", unread: true }),
      thread({ id: "b", other: { id: "p2", displayName: "Yerlan" }, direction: "incoming" }),
      thread({ id: "c", other: { id: "p3", displayName: "Dana" }, muted: true }),
    ];
    const ids = (filter: Parameters<typeof filterTwinInbox>[1]) => filterTwinInbox(list, filter).map(([latest]) => latest.id).sort();
    expect(ids("all")).toEqual(["a", "b"]);
    expect(ids("outgoing")).toEqual(["a"]);
    expect(ids("incoming")).toEqual(["b"]);
    expect(ids("unread")).toEqual(["a"]);
    expect(ids("muted")).toEqual(["c"]);
  });
  it("splits Ongoing and Past and writes row text like the website", () => {
    const ended = thread({ id: "x", status: "ended", direction: "incoming", other: { id: "p2", displayName: "Yerlan" }, muted: true });
    const { ongoing, past } = inboxSections([[thread()], [ended]]);
    expect(ongoing).toHaveLength(1);
    expect(past).toHaveLength(1);
    expect(rowTitle(thread())).toBe("Aidana’s Twin");
    expect(rowSubtitle(thread())).toBe("You talk to their Twin");
    expect(rowTitle(ended)).toBe("Yerlan · with your Twin");
    expect(rowSubtitle(ended)).toBe("Read-only for you · Ended · Muted");
    expect(earlierLabel(1)).toBe("1 earlier chat");
    expect(earlierLabel(3)).toBe("3 earlier chats");
  });
  it("accepts only known filters", () => {
    expect(parseFilter("incoming")).toBe("incoming");
    expect(parseFilter("nope")).toBe("all");
    expect(parseFilter(undefined)).toBe("all");
  });
});
