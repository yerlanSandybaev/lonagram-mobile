import { Pastels } from "../constants/palette";

export type DiscoverCard = {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  avatarSeed: string;
  city: string | null;
  intentions: string[];
  sharedInterests: string[];
  matchReasons: string[];
  twinAvailable: boolean;
  datingEligible: boolean;
  datingState: "none" | "liked";
  connectionState: "none" | "incoming" | "outgoing";
};

export type MiddleAction =
  | { kind: "like"; label: "Like"; disabled: false }
  | { kind: "liked"; label: "Liked"; disabled: true }
  | { kind: "connect"; label: "Connect"; disabled: false }
  | { kind: "sent"; label: "Sent"; disabled: true }
  | { kind: "review"; label: "Review"; disabled: false };

// The middle button of the Discover action bar. Dating-eligible people get a
// private, mutual Like; everyone else gets a real-chat Connect request.
export function middleAction(card: Pick<DiscoverCard, "datingEligible" | "datingState" | "connectionState">): MiddleAction {
  if (card.datingEligible) {
    return card.datingState === "liked"
      ? { kind: "liked", label: "Liked", disabled: true }
      : { kind: "like", label: "Like", disabled: false };
  }
  if (card.connectionState === "incoming") return { kind: "review", label: "Review", disabled: false };
  if (card.connectionState === "outgoing") return { kind: "sent", label: "Sent", disabled: true };
  return { kind: "connect", label: "Connect", disabled: false };
}

export function privacyLine(card: Pick<DiscoverCard, "twinAvailable" | "displayName">): string {
  return card.twinAvailable
    ? `You talk to their twin first. ${card.displayName} can read the chat. A real chat opens only if you both say yes.`
    : "Their twin is off right now. A real chat still opens only if you both say yes.";
}

export function chipsFor(card: Pick<DiscoverCard, "intentions" | "sharedInterests">, intentionLabel: (value: string) => string = titleCase) {
  return [
    ...card.intentions.map((value) => ({ label: intentionLabel(value), shared: false })),
    ...card.sharedInterests.slice(0, 3).map((interest) => ({ label: `${interest} · shared`, shared: true })),
  ];
}

function titleCase(value: string) {
  const text = value.replace(/[_-]+/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function initials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}

const TONES = [Pastels.peach.bg, "#FFD0DE", "#CFE4FF", Pastels.green.bg, Pastels.yellow.bg, "#E0D6FF"];
// Same hash as the web's avatarTone so a person gets the same pastel everywhere.
export function avatarTone(seed: string): string {
  let hash = 0;
  for (const char of seed) hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  return TONES[hash % TONES.length];
}

type Call = <T>(operation: string, input?: unknown, key?: string) => Promise<T>;
type RunIntent = <T>(scope: string, submit: (key: string) => Promise<T>) => Promise<T>;
type LegacyPerson = Omit<DiscoverCard, "avatarSeed" | "matchReasons" | "datingEligible"> & { avatarSeed?: string };

export function createDiscoverApi(call: Call, runIntent: RunIntent) {
  // `discover.list` ships with the newer web adapter. Until the server knows the
  // operation we fall back to the dating list, which only has dating matches.
  let listSupported: boolean | undefined;
  let ignoreSupported: boolean | undefined;
  const missing = (error: unknown) => (error as { code?: string } | null)?.code === "not_found";
  return {
    get capabilities() {
      return { list: listSupported, ignore: ignoreSupported };
    },
    async list(options: { query?: string; offset?: number; limit?: number } = {}): Promise<DiscoverCard[]> {
      const { query = "", offset = 0, limit = 20 } = options;
      if (listSupported !== false) {
        try {
          const cards = await call<DiscoverCard[]>("discover.list", { query: query.trim() || undefined, offset, limit });
          listSupported = true;
          return cards;
        } catch (error) {
          if (!missing(error)) throw error;
          listSupported = false;
        }
      }
      const people = await call<LegacyPerson[]>("dating.discover");
      const needle = query.trim().toLowerCase();
      return people
        .filter((person) => !needle || `${person.displayName} ${person.username} ${person.bio}`.toLowerCase().includes(needle))
        .slice(offset, offset + limit)
        .map((person) => ({ ...person, avatarSeed: person.avatarSeed ?? person.id, matchReasons: [], datingEligible: true }));
    },
    // Resolves true when the server removed the person, false when the operation does not exist yet.
    async ignore(otherId: string): Promise<boolean> {
      if (ignoreSupported === false) return false;
      try {
        await runIntent(`ignore:${otherId}`, (key) => call("discover.ignore", { otherId }, key));
        ignoreSupported = true;
        return true;
      } catch (error) {
        if (!missing(error)) throw error;
        ignoreSupported = false;
        return false;
      }
    },
  };
}
