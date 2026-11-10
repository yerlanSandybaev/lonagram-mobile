import { describe, expect, it } from "vitest";
import {
  MAX_INTERESTS,
  PERMISSION_KEYS,
  cleanUsername,
  deviceLanguage,
  presetPermissions,
  quickOnboardingInput,
  smallJpegDataUrl,
  stepOneError,
  stepTwoError,
  toggleInterest,
  twinGreeting,
} from "./quick-onboarding";

describe("privacy presets (same as the website)", () => {
  it("Private keeps the Twin unpublished and blocks Twin chats", () => {
    const { publishTwin, permissions } = presetPermissions("private");
    expect(publishTwin).toBe(false);
    expect(permissions.allowTwinChat).toBe(false);
    expect(permissions.shareInterests).toBe(true);
    expect(permissions.shareLanguages).toBe(true);
    expect(permissions.shareCity).toBe(false);
  });
  it("Balanced publishes but keeps city, values and experiences private", () => {
    const { publishTwin, permissions } = presetPermissions("balanced");
    expect(publishTwin).toBe(true);
    expect(permissions.allowTwinChat).toBe(true);
    expect(permissions.shareCity).toBe(false);
    expect(permissions.shareOpinionsAndValues).toBe(false);
    expect(permissions.shareApprovedExperiences).toBe(false);
    expect(permissions.shareCommunicationStyle).toBe(true);
  });
  it("Open shares everything, including city, with all 19 flags", () => {
    const { permissions } = presetPermissions("open");
    expect(Object.keys(permissions)).toHaveLength(19);
    expect(PERMISSION_KEYS.every((key) => permissions[key])).toBe(true);
  });
});

describe("onboarding input", () => {
  it("matches the website's three-step payload", () => {
    const interests = ["music", "travel", "books", "film", "football", "fitness", "cooking", "coffee", "chess"];
    const input = quickOnboardingInput({
      username: "erlan", displayName: " Erlan ", avatarUrl: null, interests, intentions: ["friendship"], languages: ["Kazakh"], preset: "balanced",
    });
    expect(input).toMatchObject({
      username: "erlan", displayName: "Erlan", bio: "", city: "", communicationStyle: "I adapt to the person",
      typicalResponseLength: "short", publishTwin: true, avatarUrl: null,
    });
    expect(input.topics).toEqual(interests.slice(0, 8));
    expect(input).not.toHaveProperty("adultConfirmation");
  });
  it("validates each step with the website's messages", () => {
    expect(stepOneError({ displayName: "", username: "erlan" })).toBe("Add your name.");
    expect(stepOneError({ displayName: "Erlan", username: "er" })).toMatch(/3–20/);
    expect(stepOneError({ displayName: "Erlan", username: "erlan" })).toBeNull();
    expect(stepTwoError({ interests: [], intentions: ["x"], languages: ["x"] })).toBe("Tap at least one thing you like.");
    expect(stepTwoError({ interests: ["x"], intentions: [], languages: ["x"] })).toBe("Choose what you are here for.");
    expect(stepTwoError({ interests: ["x"], intentions: ["x"], languages: [] })).toBe("Choose at least one language.");
  });
  it("toggles interests, ignores tiny ones and caps at 12", () => {
    expect(toggleInterest(["music"], "music")).toEqual([]);
    expect(toggleInterest([], " a ")).toEqual([]);
    expect(toggleInterest([], "  rock   climbing ")).toEqual(["rock climbing"]);
    const full = Array.from({ length: MAX_INTERESTS }, (_, i) => `item${i}`);
    expect(toggleInterest(full, "one more")).toBe(full);
  });
  it("cleans usernames and picks the phone language", () => {
    expect(cleanUsername("Erlan.S-63!")).toBe("erlans63");
    expect(deviceLanguage("kk-KZ")).toBe("Kazakh");
    expect(deviceLanguage("ru_RU")).toBe("Russian");
    expect(deviceLanguage("en-US")).toBe("English");
    expect(deviceLanguage(undefined)).toBe("English");
  });
  it("greets by first name", () => {
    expect(twinGreeting("Erlan Sandybaev")).toBe("Hi Erlan, I'm your Twin. I'll talk for you when you're away.");
  });
});

describe("photo resizing", () => {
  it("lowers quality until the data URL fits", async () => {
    const tried: number[] = [];
    const url = await smallJpegDataUrl(async (quality) => {
      tried.push(quality);
      return "x".repeat(quality > 0.6 ? 200_000 : 1000);
    });
    expect(tried).toEqual([0.85, 0.75, 0.6]);
    expect(url.startsWith("data:image/jpeg;base64,")).toBe(true);
  });
  it("gives up with a clear message", async () => {
    await expect(smallJpegDataUrl(async () => "x".repeat(300_000))).rejects.toThrow(/small enough/);
  });
});
