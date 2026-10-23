import { mobileApi } from "@/lib/api";
import { createIntentRunner } from "@/lib/request-intents";
const intent = createIntentRunner();

export type Profile = {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  city: string | null;
  languages: string[];
  intentions: string[];
  onboardingComplete: boolean;
  is18Plus?: boolean;
};
export type TwinProfile = {
  personality: string;
  topics: string[];
  lookingFor: string;
  communicationStyle: string;
  hobbies: string;
  interestingConversation: string;
  publicIntroduction: string;
  enabled: boolean;
};
export type TwinPermissions = {
  allowTwinChat: boolean;
  shareBio: boolean;
  shareInterests: boolean;
  shareCity: boolean;
  shareIntentions: boolean;
  shareLanguages: boolean;
  sharePersonality: boolean;
  shareTopics: boolean;
  shareLookingFor: boolean;
  shareCommunicationStyle: boolean;
  shareHobbies: boolean;
  shareInterestingConversation: boolean;
};
export type Person = Profile & {
  interests: string[];
  sharedInterests: string[];
  twinAvailable: boolean;
  connectionState: "none" | "incoming" | "outgoing";
  datingState: "none" | "liked";
};
export type AppNotification = {
  id: string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};
export type ConnectionRequest = {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: "pending" | "accepted" | "rejected" | "ignored";
  source: "discover" | "twin_chat" | "twin_signal";
  createdAt: string;
};
export type DirectMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};
export type MessageThread = {
  id: string;
  other: Profile;
  lastMessage: string;
  updatedAt: string;
  unread: number;
};
export type Bundle = {
  profile: Profile;
  interests: string[];
  twin: TwinProfile;
  permissions: TwinPermissions;
  blocks: { id: string; displayName: string; username: string }[];
};
export type DatingPreferences = {
  enabled: boolean;
  age: number | null;
  preferredMinAge: number;
  preferredMaxAge: number;
  locationScope: "same_city" | "anywhere";
  relationshipGoals: string[];
  values: string[];
  lifestyle: string[];
  dealBreakers: string[];
  communicationPace: string;
  preferredFirstDate: string;
};
export type TwinMessage = {
  id: string;
  speakerUserId: string;
  body: string;
  createdAt: string;
  fromPerson: boolean;
  personalKind?: "question" | "reply";
};
export type TwinThread = {
  conversation: { id: string; status: string };
  messages: TwinMessage[];
  other: Profile;
  initiatedBySelf: boolean;
  pendingQuestion: { id: string; body: string } | null;
};
export type TwinThreadSummary = {
  id: string;
  other: Profile;
  preview: string;
  unread: boolean;
};

// userId arguments remain for screen query keys. Identity is NEVER sent to the
// HTTP adapter: the server must derive it from the verified Supabase token.
export function loadMyBundle(_userId: string) {
  return mobileApi<Bundle>("settings.get");
}
export function saveProfile(
  _userId: string,
  profile: Omit<Profile, "id" | "onboardingComplete">,
  interests: string[],
) {
  return mobileApi("profile.update", { profile, interests });
}
export function completeOnboarding(input: unknown) {
  return mobileApi("onboarding.complete", input);
}
export function saveTwin(_userId: string, twin: TwinProfile) {
  const {
    personality,
    topics,
    lookingFor,
    communicationStyle,
    hobbies,
    interestingConversation,
    publicIntroduction,
    enabled,
  } = twin;
  return mobileApi("twin.update", {
    twin: {
      personality,
      topics,
      lookingFor,
      communicationStyle,
      hobbies,
      interestingConversation,
      publicIntroduction,
      enabled,
    },
  });
}
export function savePermissions(_userId: string, permissions: TwinPermissions) {
  const {
    allowTwinChat,
    shareBio,
    shareInterests,
    shareCity,
    shareIntentions,
    shareLanguages,
    sharePersonality,
    shareTopics,
    shareLookingFor,
    shareCommunicationStyle,
    shareHobbies,
    shareInterestingConversation,
  } = permissions;
  return mobileApi("permissions.update", {
    permissions: {
      allowTwinChat,
      shareBio,
      shareInterests,
      shareCity,
      shareIntentions,
      shareLanguages,
      sharePersonality,
      shareTopics,
      shareLookingFor,
      shareCommunicationStyle,
      shareHobbies,
      shareInterestingConversation,
    },
  });
}
export function loadDiscover(_userId: string) {
  return mobileApi<Person[]>("dating.discover");
}
export function loadDating() {
  return mobileApi<{ preferences: DatingPreferences }>("dating.get");
}
export function saveDatingPreferences(preferences: DatingPreferences) {
  return mobileApi("dating.update", { preferences });
}
export function likeDatingProfile(otherId: string, scope: string) {
  return intent(scope, (key) =>
    mobileApi<{ matched: boolean; conversationId: string | null }>(
      "dating.like",
      { otherId },
      key,
    ),
  );
}
export function requestConnection(
  _userId: string,
  otherId: string,
  source: "discover" | "twin_chat" = "discover",
  twinId?: string,
  key?: string,
) {
  return intent(
    `connect:${_userId}:${otherId}:${key ?? source}`,
    (requestKey) =>
      mobileApi("connection.request", { otherId, source, twinId }, requestKey),
  );
}
export async function loadRequests(_userId: string) {
  const home = await mobileApi<{
    incoming: { request: ConnectionRequest }[];
    outgoing: { request: ConnectionRequest }[];
  }>("home.get");
  return [...home.incoming, ...home.outgoing].map((item) => item.request);
}
export async function respondToRequest(
  _userId: string,
  request: ConnectionRequest,
  decision: "accepted" | "rejected" | "ignored",
) {
  const result = await intent(
    `connection:${_userId}:${request.id}:${decision}`,
    (key) =>
      mobileApi<{ conversationId: string | null }>(
        "connection.respond",
        { requestId: request.id, decision },
        key,
      ),
  );
  return result.conversationId;
}
export function loadNotifications(_userId: string) {
  return mobileApi<AppNotification[]>("notifications.list");
}
export function markNotificationRead(_userId: string, id?: string) {
  return mobileApi(
    id ? "notifications.read" : "notifications.readAll",
    id ? { id } : {},
  );
}
export function loadCounts() {
  return mobileApi<{ messages: number; notifications: number }>("unread.get");
}
export function blockUser(_userId: string, otherId: string) {
  return mobileApi("safety.block", { otherId });
}
export function unblockUser(otherId: string) {
  return mobileApi("safety.unblock", { otherId });
}
export function reportProfile(
  _userId: string,
  otherId: string,
  reason: string,
  details = "",
) {
  return intent(`report:${_userId}:${otherId}:${reason}:${details}`, (key) =>
    mobileApi(
      "safety.report",
      { targetUserId: otherId, targetType: "profile", reason, details },
      key,
    ),
  );
}
export function deleteAccount(username: string) {
  return mobileApi("account.delete", { username });
}
export async function loadMessages(
  conversationId: string,
): Promise<DirectMessage[]> {
  const thread = await mobileApi<{ messages: DirectMessage[] }>(
    "messages.get",
    { conversationId },
  );
  return thread.messages;
}
export function sendMessage(
  _userId: string,
  conversationId: string,
  body: string,
  key: string,
) {
  return mobileApi("messages.send", { conversationId, body: body.trim() }, key);
}
export async function loadThreads(_userId: string): Promise<MessageThread[]> {
  const threads =
    await mobileApi<
      {
        id: string;
        other: Profile;
        last: DirectMessage | null;
        unread: number;
        updatedAt: string;
      }[]
    >("messages.list");
  return threads.map((item) => ({
    ...item,
    lastMessage: item.last?.body ?? "Personal conversation",
  }));
}
export function startTwin(otherId: string, scope: string) {
  return intent(scope, (key) =>
    mobileApi<{ id: string }>("twin.start", { otherId }, key),
  );
}
export function loadTwinThread(conversationId: string) {
  return mobileApi<TwinThread>("twin.get", { conversationId });
}
export function loadTwinThreads() {
  return mobileApi<TwinThreadSummary[]>("twin.list");
}
export function runTwinTurn(conversationId: string, cue: string, key: string) {
  return mobileApi("twin.turn", { conversationId, cue }, key);
}
export function markTwinRead(conversationId: string, lastSeenId: string) {
  return mobileApi("twin.inbox", { conversationId, lastSeenId });
}
