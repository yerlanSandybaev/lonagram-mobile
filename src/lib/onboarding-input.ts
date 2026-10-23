// Preserve existing advanced Twin settings without sending row ownership fields.
const fields = [
  "username",
  "displayName",
  "bio",
  "avatarUrl",
  "city",
  "languages",
  "intentions",
  "personality",
  "topics",
  "lookingFor",
  "communicationStyle",
  "hobbies",
  "interestingConversation",
  "publicIntroduction",
  "expertise",
  "preferredVocabulary",
  "typicalResponseLength",
  "toneAndFormality",
  "humorStyle",
  "opinionsAndValues",
  "approvedExperiences",
  "topicsToAvoid",
  "neverDisclose",
  "maxTurns",
  "tokenBudget",
];
export function onboardingFields(profile: object, twin: object) {
  const source = { ...profile, ...twin } as Record<string, unknown>;
  return Object.fromEntries(
    fields
      .filter((field) => source[field] !== undefined)
      .map((field) => [field, source[field]]),
  );
}
