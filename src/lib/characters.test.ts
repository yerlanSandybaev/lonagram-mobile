import { describe, expect, it, vi } from "vitest";
import { CHARACTERS, characterChatNote, characterDisclaimer, characterYears, createCharacterApi, splitSources, findCharacter, monogram, searchCharacters } from "./characters";

describe("characters", () => {
  it("has Aristotle with the website's data", () => {
    const aristotle = findCharacter("aristotle")!;
    expect(aristotle.lifetime).toBe("384–322 BC");
    expect(aristotle.tone).toBe("#F3E3B5");
    expect(aristotle.starters).toHaveLength(4);
    expect(monogram(aristotle)).toBe("A");
    expect(characterDisclaimer(aristotle)).toContain("It is not the real person, and it can be wrong.");
  });
  it("has unique slugs", () => {
    expect(new Set(CHARACTERS.map((c) => c.slug)).size).toBe(CHARACTERS.length);
  });
  it("searches name, role and known-for words", () => {
    expect(searchCharacters("")).toEqual(CHARACTERS);
    expect(searchCharacters("aris")).toHaveLength(1);
    expect(searchCharacters("philosopher")).toHaveLength(1);
    expect(searchCharacters("golden mean")).toHaveLength(1);
    expect(searchCharacters("napoleon")).toHaveLength(0);
  });
});

describe("character api", () => {
  it("uses the request id as the Idempotency-Key and trims the message", async () => {
    const call = vi.fn(async () => ({ id: "c1", text: "Hello" }));
    const api = createCharacterApi(call as never);
    const id = "11111111-1111-4111-8111-111111111111";
    await api.send("aristotle", "  What is a happy life?  ", id);
    expect(call).toHaveBeenCalledWith("character.chat.send", { slug: "aristotle", cue: "What is a happy life?", requestId: id }, id);
    await api.history("aristotle");
    await api.clear("aristotle");
    await api.list();
    expect(call.mock.calls.map((c) => (c as unknown[])[0])).toEqual(["character.chat.send", "character.chat.get", "character.chat.clear", "characters.list"]);
  });
  it("finds characters in a server list", () => {
    expect(findCharacter("plato", [{ ...CHARACTERS[0], slug: "plato", name: "Plato" }])?.name).toBe("Plato");
  });
});

describe("fiction and the News Twin", () => {
  const holmes = { ...CHARACTERS[0], slug: "sherlock-holmes", name: "Sherlock Holmes", lifetime: "1854–", fiction: "the stories of Arthur Conan Doyle" };
  const news = { ...CHARACTERS[0], slug: "news-twin", name: "News Twin", lifetime: "Live", webSearch: true, works: [], timeline: [] };
  it("labels cards and footers like the website", () => {
    expect(characterYears(CHARACTERS[0])).toBe("384–322 BC");
    expect(characterYears(holmes)).toBe("Fiction");
    expect(characterDisclaimer(holmes)).toBe("This is a Character Twin of a fictional character, based on the stories of Arthur Conan Doyle. It is an AI portrayal, not a real person, and it can be wrong.");
    expect(characterDisclaimer(news)).toContain("searches the web");
    expect(characterChatNote(news)).toBe("Searches the web and shows its sources. It can still be wrong, so check them.");
    expect(characterChatNote(holmes)).toBe("A Twin of a fictional character, built from the stories of Arthur Conan Doyle.");
    expect(characterChatNote(CHARACTERS[0])).toBe("A Twin, an AI portrayal built from the historical record, so it can be wrong.");
  });
  it("splits the News Twin's sources off a reply", () => {
    const reply = "Inflation slowed in October (Reuters).\n\nSources:\nInflation eases — https://www.reuters.com/a\nhttps://kursiv.media/b\nnot a link";
    const { body, sources } = splitSources(reply);
    expect(body).toBe("Inflation slowed in October (Reuters).");
    expect(sources).toEqual([
      { url: "https://www.reuters.com/a", label: "Inflation eases", host: "reuters.com" },
      { url: "https://kursiv.media/b", label: "kursiv.media", host: "kursiv.media" },
    ]);
  });
  it("leaves other replies unchanged", () => {
    expect(splitSources("Сәлем! Қалайсың?")).toEqual({ body: "Сәлем! Қалайсың?", sources: [] });
  });
});
