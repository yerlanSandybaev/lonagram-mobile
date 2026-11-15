// Character Twins: AI portrayals of historical people. Not user accounts, no owner.
// The app reads them from characters.list. CHARACTERS is only what shows before
// that first load (and offline); keep it in step with the website's src/domain/characters.ts.

export type Character = {
  slug: string;
  name: string;
  lifetime: string; // "384–322 BC"
  place: string; // "Stagira · Athens"
  role: string;
  tagline: string;
  about: string[];
  knownFor: string[];
  works: string[];
  timeline: { year: string; text: string }[];
  starters: string[];
  // Monogram background. Text on it is always dark, in both themes.
  tone: string;
};

export const CHARACTER_INK = "#1B1533";

export const CHARACTERS: Character[] = [
  {
    slug: "aristotle",
    name: "Aristotle",
    lifetime: "384–322 BC",
    place: "Stagira · Athens",
    role: "Philosopher and scientist",
    tagline: "Ask about happiness, friendship, virtue, politics or how to think clearly.",
    about: [
      "Greek philosopher born in Stagira in 384 BC. He studied at Plato's Academy in Athens for about twenty years, then tutored the young Alexander the Great.",
      "In 335 BC he founded his own school in Athens, the Lyceum. He wrote on logic, ethics, politics, biology, physics, poetry and rhetoric, and shaped Western thought for two thousand years.",
    ],
    knownFor: ["Golden mean", "Eudaimonia (flourishing)", "Formal logic", "Four causes", "Friendship", "Biology"],
    works: ["Nicomachean Ethics", "Politics", "Metaphysics", "Poetics", "Rhetoric", "Physics", "On the Soul", "History of Animals", "Organon"],
    timeline: [
      { year: "384 BC", text: "Born in Stagira, northern Greece. His father was a court physician in Macedon." },
      { year: "367 BC", text: "Joins Plato's Academy in Athens, aged about 17." },
      { year: "347 BC", text: "Plato dies. Aristotle leaves Athens and studies sea life on the island of Lesbos." },
      { year: "343 BC", text: "Becomes tutor to the 13-year-old Alexander of Macedon." },
      { year: "335 BC", text: "Returns to Athens and founds the Lyceum. His students are called Peripatetics." },
      { year: "323 BC", text: "Alexander dies. Aristotle leaves Athens for Chalcis." },
      { year: "322 BC", text: "Dies in Chalcis, aged about 62." },
    ],
    starters: [
      "What is a happy life?",
      "How do I know who my real friends are?",
      "How can I be braver?",
      "What would you think of social media?",
    ],
    tone: "#F3E3B5",
  },
];

export function findCharacter(slug: string | undefined, list: Character[] = CHARACTERS): Character | undefined {
  return list.find((character) => character.slug === slug);
}

export function monogram(character: Pick<Character, "name">): string {
  return character.name.trim().charAt(0).toUpperCase();
}

export function characterDisclaimer(character: Pick<Character, "name">): string {
  return `This is a Character Twin: an AI portrayal of ${character.name} built from what is known about ${character.name}'s life and work. It is not the real person, and it can be wrong.`;
}

// Search by name, role or "known for" words.
export function searchCharacters(query: string, list: Character[] = CHARACTERS): Character[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return list;
  return list.filter((character) => {
    const haystack = [character.name, character.role, ...character.knownFor].join(" ").toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
}

// Chat with a Character Twin. Each chat is private to its writer and saved on the server.
export type CharacterLine = { id: string; role: "you" | "character"; text: string };

type Call = <T>(operation: string, input?: unknown, key?: string) => Promise<T>;

export function createCharacterApi(call: Call) {
  return {
    list() {
      return call<Character[]>("characters.list");
    },
    history(slug: string) {
      return call<CharacterLine[]>("character.chat.get", { slug });
    },
    // The request id is also the Idempotency-Key. Reuse both when retrying the same message.
    send(slug: string, cue: string, requestId: string) {
      return call<{ id: string; text: string }>("character.chat.send", { slug, cue: cue.trim(), requestId }, requestId);
    },
    clear(slug: string) {
      return call<{ cleared: true }>("character.chat.clear", { slug });
    },
  };
}
