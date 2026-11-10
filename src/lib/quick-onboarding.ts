// Three-step onboarding, mirroring the website's quick onboarding.

export const SUGGESTED_INTERESTS = [
  "music", "travel", "books", "film", "football", "fitness", "cooking", "coffee",
  "photography", "design", "coding", "startups", "art", "gaming", "hiking", "chess",
] as const;
export const MAIN_LANGUAGES = ["Kazakh", "Russian", "English"] as const;
export const OTHER_LANGUAGES = ["Spanish", "French", "German", "Portuguese", "Mandarin", "Turkish", "Arabic", "Uzbek", "Kyrgyz", "Hindi", "Japanese", "Korean", "Italian"] as const;
export const INTENTIONS = [
  { id: "friendship", label: "Friendship" },
  { id: "dating", label: "Dating" },
  { id: "professional", label: "Professional networking" },
  { id: "casual", label: "Casual conversations" },
  { id: "shared_interests", label: "Shared interests" },
] as const;
export const MAX_INTERESTS = 12;

export type PrivacyPreset = "private" | "balanced" | "open";
export const PRESETS: { id: PrivacyPreset; title: string; text: string; recommended?: boolean }[] = [
  { id: "private", title: "Private", text: "Only you talk to your Twin. Publish it later when you are ready." },
  { id: "balanced", title: "Balanced", text: "People can talk to your Twin. It shares your interests and style, not your city or private notes.", recommended: true },
  { id: "open", title: "Open", text: "People can talk to your Twin, and it may also mention your city." },
];

export const PERMISSION_KEYS = [
  "allowTwinChat", "shareBio", "shareInterests", "shareCity", "shareIntentions", "shareLanguages", "sharePersonality", "shareTopics",
  "shareLookingFor", "shareCommunicationStyle", "shareHobbies", "shareInterestingConversation", "shareExpertise", "sharePreferredVocabulary",
  "shareTypicalResponseLength", "shareToneAndFormality", "shareHumorStyle", "shareOpinionsAndValues", "shareApprovedExperiences",
] as const;
export type PermissionFlags = Record<(typeof PERMISSION_KEYS)[number], boolean>;

// Same rules as the website's presetPermissions.
export function presetPermissions(preset: PrivacyPreset): { publishTwin: boolean; permissions: PermissionFlags } {
  const all = Object.fromEntries(PERMISSION_KEYS.map((key) => [key, preset !== "private"])) as PermissionFlags;
  if (preset === "open") return { publishTwin: true, permissions: all };
  if (preset === "balanced") return { publishTwin: true, permissions: { ...all, shareCity: false, shareOpinionsAndValues: false, shareApprovedExperiences: false } };
  return { publishTwin: false, permissions: { ...all, shareInterests: true, shareLanguages: true } };
}

// Preselect the phone's language: kk -> Kazakh, ru -> Russian, otherwise English.
export function deviceLanguage(locale: string | undefined): string {
  const code = (locale ?? "").toLowerCase().split(/[-_]/)[0];
  if (code === "kk") return "Kazakh";
  if (code === "ru") return "Russian";
  return "English";
}

export function toggleInterest(list: string[], raw: string): string[] {
  const value = raw.trim().replace(/\s+/g, " ").slice(0, 40);
  if (value.length < 2) return list;
  if (list.includes(value)) return list.filter((item) => item !== value);
  return list.length >= MAX_INTERESTS ? list : [...list, value];
}

export function cleanUsername(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);
}

export function stepOneError(input: { displayName: string; username: string }): string | null {
  if (!input.displayName.trim()) return "Add your name.";
  if (!/^[a-z0-9_]{3,20}$/.test(input.username)) return "Usernames use 3–20 lowercase letters, numbers or underscores.";
  return null;
}

export function stepTwoError(input: { interests: string[]; intentions: string[]; languages: string[] }): string | null {
  if (input.interests.length === 0) return "Tap at least one thing you like.";
  if (input.intentions.length === 0) return "Choose what you are here for.";
  if (input.languages.length === 0) return "Choose at least one language.";
  return null;
}

// The onboarding.complete input the website sends for the three-step flow.
export function quickOnboardingInput(input: {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  interests: string[];
  intentions: string[];
  languages: string[];
  preset: PrivacyPreset;
  adultConfirmation?: boolean;
}) {
  const { publishTwin, permissions } = presetPermissions(input.preset);
  return {
    username: input.username,
    displayName: input.displayName.trim(),
    bio: "",
    city: "",
    languages: input.languages,
    intentions: input.intentions,
    interests: input.interests,
    topics: input.interests.slice(0, 8),
    communicationStyle: "I adapt to the person",
    typicalResponseLength: "short" as const,
    permissions,
    publishTwin,
    avatarUrl: input.avatarUrl,
    ...(input.adultConfirmation ? { adultConfirmation: true as const } : {}),
  };
}

export function twinGreeting(displayName: string): string {
  const first = displayName.trim().split(/\s+/)[0] || "there";
  return `Hi ${first}, I'm your Twin. I'll talk for you when you're away.`;
}

// Shrinks a photo to a small JPEG data URL (≤ 512 px, ≤ ~170 KB) by lowering quality step by step.
export const PHOTO_MAX_SIDE = 512;
export const PHOTO_MAX_DATA_URL = 170_000;
export async function smallJpegDataUrl(encode: (quality: number) => Promise<string | undefined>): Promise<string> {
  for (const quality of [0.85, 0.75, 0.6, 0.45]) {
    const base64 = await encode(quality);
    if (!base64) continue;
    const url = `data:image/jpeg;base64,${base64}`;
    if (url.length <= PHOTO_MAX_DATA_URL) return url;
  }
  throw new Error("This photo could not be made small enough. Try another picture.");
}
