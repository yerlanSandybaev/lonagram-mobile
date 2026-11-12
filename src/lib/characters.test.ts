import { describe, expect, it } from "vitest";
import { CHARACTERS, characterDisclaimer, findCharacter, monogram, searchCharacters } from "./characters";

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
