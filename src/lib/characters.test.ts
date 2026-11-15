import { describe, expect, it, vi } from "vitest";
import { CHARACTERS, characterDisclaimer, createCharacterApi, findCharacter, monogram, searchCharacters } from "./characters";

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
