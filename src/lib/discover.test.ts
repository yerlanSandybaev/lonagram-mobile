import { describe, expect, it, vi } from "vitest";
import { avatarTone, chipsFor, createDiscoverApi, initials, middleAction, privacyLine, type DiscoverCard } from "./discover";

const card = (over: Partial<DiscoverCard> = {}): DiscoverCard => ({
  id: "u1", username: "aida", displayName: "Aida", bio: "", avatarUrl: null, avatarSeed: "seed", city: null,
  intentions: ["friendship"], sharedInterests: ["chess"], matchReasons: [], twinAvailable: true,
  datingEligible: false, datingState: "none", connectionState: "none", ...over,
});

describe("Discover middle button", () => {
  it("maps every dating and connection state", () => {
    expect(middleAction(card({ datingEligible: true }))).toMatchObject({ kind: "like", label: "Like", disabled: false });
    expect(middleAction(card({ datingEligible: true, datingState: "liked" }))).toMatchObject({ kind: "liked", label: "Liked", disabled: true });
    expect(middleAction(card())).toMatchObject({ kind: "connect", label: "Connect", disabled: false });
    expect(middleAction(card({ connectionState: "outgoing" }))).toMatchObject({ kind: "sent", label: "Sent", disabled: true });
    expect(middleAction(card({ connectionState: "incoming" }))).toMatchObject({ kind: "review", label: "Review", disabled: false });
  });
  it("lets dating eligibility win over a pending connection", () => {
    expect(middleAction(card({ datingEligible: true, connectionState: "outgoing" })).kind).toBe("like");
  });
});

describe("Discover card text", () => {
  it("explains the privacy rule and the twin being off", () => {
    expect(privacyLine(card())).toContain("You talk to their Twin first. Aida can read the chat.");
    expect(privacyLine(card({ twinAvailable: false }))).toMatch(/^Their Twin is off right now/);
  });
  it("builds chips with at most three shared interests", () => {
    const chips = chipsFor(card({ intentions: ["friendship", "dating"], sharedInterests: ["a", "b", "c", "d"] }));
    expect(chips.map((chip) => chip.label)).toEqual(["Friendship", "Dating", "a · shared", "b · shared", "c · shared"]);
    expect(chips.filter((chip) => chip.shared)).toHaveLength(3);
  });
  it("gives a stable pastel and initials", () => {
    expect(avatarTone("seed")).toBe(avatarTone("seed"));
    expect(initials("Aida Nur Sultan")).toBe("AN");
  });
});

describe("Discover data layer", () => {
  const notFound = Object.assign(new Error("missing"), { code: "not_found" });
  it("uses discover.list and passes search and paging", async () => {
    const call = vi.fn().mockResolvedValue([card()]);
    const api = createDiscoverApi(call as never, (_s, run) => run("k"));
    expect(await api.list({ query: " chess ", offset: 20, limit: 20 })).toHaveLength(1);
    expect(call).toHaveBeenCalledWith("discover.list", { query: "chess", offset: 20, limit: 20 });
    expect(api.capabilities.list).toBe(true);
  });
  it("falls back to the dating list once discover.list is not_found", async () => {
    const call = vi.fn(async (op: string) => {
      if (op === "discover.list") throw notFound;
      return [{ ...card(), avatarSeed: undefined }];
    });
    const api = createDiscoverApi(call as never, (_s, run) => run("k"));
    const first = await api.list();
    expect(first[0]).toMatchObject({ datingEligible: true, avatarSeed: "u1", matchReasons: [] });
    await api.list();
    expect(call.mock.calls.filter(([op]) => op === "discover.list")).toHaveLength(1);
    expect(api.capabilities.list).toBe(false);
  });
  it("rethrows other list errors", async () => {
    const api = createDiscoverApi((async () => { throw Object.assign(new Error("boom"), { code: "api" }); }) as never, (_s, run) => run("k"));
    await expect(api.list()).rejects.toThrow("boom");
  });
  it("ignore sends the person with an idempotency key and reports unsupported servers", async () => {
    const call = vi.fn().mockResolvedValue({});
    const api = createDiscoverApi(call as never, (_s, run) => run("key-1"));
    expect(await api.ignore("u9")).toBe(true);
    expect(call).toHaveBeenCalledWith("discover.ignore", { otherId: "u9" }, "key-1");
    const missing = createDiscoverApi((async () => { throw notFound; }) as never, (_s, run) => run("k"));
    expect(await missing.ignore("u9")).toBe(false);
    expect(missing.capabilities.ignore).toBe(false);
  });
});
