import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabase } from "@/lib/supabase";

export type Profile = {
  id: string; username: string; displayName: string; bio: string; avatarUrl: string | null;
  city: string; languages: string[]; intentions: string[]; onboardingComplete: boolean;
};
export type TwinProfile = {
  personality: string; topics: string[]; lookingFor: string; communicationStyle: string;
  hobbies: string; interestingConversation: string; publicIntroduction: string; enabled: boolean;
};
export type TwinPermissions = {
  allowTwinChat: boolean; shareBio: boolean; shareInterests: boolean; shareCity: boolean;
  shareIntentions: boolean; shareLanguages: boolean; sharePersonality: boolean; shareTopics: boolean;
  shareLookingFor: boolean; shareCommunicationStyle: boolean; shareHobbies: boolean;
  shareInterestingConversation: boolean;
};
export type Person = Profile & { interests: string[]; sharedInterests: string[] };
export type AppNotification = { id: string; title: string; body: string; href: string | null; readAt: string | null; createdAt: string };
export type ConnectionRequest = { id: string; fromUserId: string; toUserId: string; status: "pending" | "accepted" | "rejected" | "ignored"; source: "discover" | "twin_chat"; createdAt: string };
export type DirectMessage = { id: string; conversationId: string; senderId: string; body: string; readAt: string | null; createdAt: string };
export type MessageThread = { id: string; other: Profile; lastMessage: string; updatedAt: string };

function client(): SupabaseClient { const value = getSupabase(); if (!value) throw new Error("Supabase is not configured."); return value; }
function strings(value: unknown): string[] { return Array.isArray(value) ? value.map(String) : []; }
function profileFrom(row: Record<string, unknown>): Profile {
  return { id: String(row.id), username: String(row.username), displayName: String(row.display_name), bio: String(row.bio ?? ""), avatarUrl: row.avatar_url ? String(row.avatar_url) : null, city: String(row.city ?? ""), languages: strings(row.languages), intentions: strings(row.intentions), onboardingComplete: Boolean(row.onboarding_complete) };
}

export async function loadMyBundle(userId: string) {
  const supabase = client();
  const [profileResult, interestsResult, twinResult, permissionsResult] = await Promise.all([
    supabase.from("profiles").select("id,username,display_name,bio,avatar_url,city,languages,intentions,onboarding_complete").eq("id", userId).single(),
    supabase.from("user_interests").select("interest").eq("user_id", userId).order("interest"),
    supabase.from("twin_profiles").select("personality,topics,looking_for,communication_style,hobbies,interesting_conversation,public_introduction,enabled").eq("user_id", userId).single(),
    supabase.from("twin_permissions").select("allow_twin_chat,share_bio,share_interests,share_city,share_intentions,share_languages,share_personality,share_topics,share_looking_for,share_communication_style,share_hobbies,share_interesting_conversation").eq("user_id", userId).single(),
  ]);
  const error = profileResult.error ?? interestsResult.error ?? twinResult.error ?? permissionsResult.error;
  if (error) throw error;
  const twin = twinResult.data as Record<string, unknown>;
  const permission = permissionsResult.data as Record<string, unknown>;
  return {
    profile: profileFrom(profileResult.data as Record<string, unknown>),
    interests: (interestsResult.data ?? []).map((row) => String(row.interest)),
    twin: { personality: String(twin.personality ?? ""), topics: strings(twin.topics), lookingFor: String(twin.looking_for ?? ""), communicationStyle: String(twin.communication_style ?? ""), hobbies: String(twin.hobbies ?? ""), interestingConversation: String(twin.interesting_conversation ?? ""), publicIntroduction: String(twin.public_introduction ?? ""), enabled: Boolean(twin.enabled) } satisfies TwinProfile,
    permissions: { allowTwinChat: Boolean(permission.allow_twin_chat), shareBio: Boolean(permission.share_bio), shareInterests: Boolean(permission.share_interests), shareCity: Boolean(permission.share_city), shareIntentions: Boolean(permission.share_intentions), shareLanguages: Boolean(permission.share_languages), sharePersonality: Boolean(permission.share_personality), shareTopics: Boolean(permission.share_topics), shareLookingFor: Boolean(permission.share_looking_for), shareCommunicationStyle: Boolean(permission.share_communication_style), shareHobbies: Boolean(permission.share_hobbies), shareInterestingConversation: Boolean(permission.share_interesting_conversation) } satisfies TwinPermissions,
  };
}

export async function saveProfile(userId: string, profile: Omit<Profile, "id" | "onboardingComplete">, interests: string[]) {
  const supabase = client();
  const update = await supabase.from("profiles").update({ username: profile.username.trim().toLowerCase(), display_name: profile.displayName.trim(), bio: profile.bio.trim(), avatar_url: profile.avatarUrl, city: profile.city.trim() || null, languages: profile.languages, intentions: profile.intentions, onboarding_complete: true }).eq("id", userId);
  if (update.error) throw update.error;
  const removed = await supabase.from("user_interests").delete().eq("user_id", userId); if (removed.error) throw removed.error;
  if (interests.length) { const inserted = await supabase.from("user_interests").insert(interests.map((interest) => ({ user_id: userId, interest }))); if (inserted.error) throw inserted.error; }
}

export async function saveTwin(userId: string, twin: TwinProfile) {
  const result = await client().from("twin_profiles").update({ personality: twin.personality, topics: twin.topics, looking_for: twin.lookingFor, communication_style: twin.communicationStyle, hobbies: twin.hobbies, interesting_conversation: twin.interestingConversation, public_introduction: twin.publicIntroduction, enabled: twin.enabled }).eq("user_id", userId);
  if (result.error) throw result.error;
}

export async function savePermissions(userId: string, value: TwinPermissions) {
  const result = await client().from("twin_permissions").update({ allow_twin_chat: value.allowTwinChat, share_bio: value.shareBio, share_interests: value.shareInterests, share_city: value.shareCity, share_intentions: value.shareIntentions, share_languages: value.shareLanguages, share_personality: value.sharePersonality, share_topics: value.shareTopics, share_looking_for: value.shareLookingFor, share_communication_style: value.shareCommunicationStyle, share_hobbies: value.shareHobbies, share_interesting_conversation: value.shareInterestingConversation }).eq("user_id", userId);
  if (result.error) throw result.error;
}

export async function loadDiscover(userId: string): Promise<Person[]> {
  const supabase = client();
  const [profiles, interests] = await Promise.all([
    supabase.from("profiles").select("id,username,display_name,bio,avatar_url,city,languages,intentions,onboarding_complete").eq("onboarding_complete", true).neq("id", userId).limit(30),
    supabase.from("user_interests").select("user_id,interest"),
  ]);
  if (profiles.error) throw profiles.error; if (interests.error) throw interests.error;
  const byUser = new Map<string, string[]>();
  for (const row of interests.data ?? []) { const id = String(row.user_id); byUser.set(id, [...(byUser.get(id) ?? []), String(row.interest)]); }
  const mine = new Set(byUser.get(userId) ?? []);
  return (profiles.data ?? []).map((row) => { const profile = profileFrom(row as Record<string, unknown>); const personInterests = byUser.get(profile.id) ?? []; return { ...profile, interests: personInterests, sharedInterests: personInterests.filter((item) => mine.has(item)) }; });
}

export async function requestConnection(userId: string, otherId: string, source: "discover" | "twin_chat" = "discover") {
  const result = await client().from("connection_requests").insert({ from_user_id: userId, to_user_id: otherId, source });
  if (result.error) throw result.error;
}

export async function loadRequests(userId: string) {
  const result = await client().from("connection_requests").select("id,from_user_id,to_user_id,status,source,created_at").or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`).order("created_at", { ascending: false });
  if (result.error) throw result.error;
  return (result.data ?? []).map((row) => ({ id: String(row.id), fromUserId: String(row.from_user_id), toUserId: String(row.to_user_id), status: row.status as ConnectionRequest["status"], source: row.source as ConnectionRequest["source"], createdAt: String(row.created_at) }));
}

export async function respondToRequest(userId: string, request: ConnectionRequest, decision: "accepted" | "rejected" | "ignored") {
  const supabase = client();
  const result = await supabase.from("connection_requests").update({ status: decision }).eq("id", request.id); if (result.error) throw result.error;
  if (decision !== "accepted") return null;
  const otherId = request.fromUserId === userId ? request.toUserId : request.fromUserId;
  const [userA, userB] = userId < otherId ? [userId, otherId] : [otherId, userId];
  const existingConnection = await supabase.from("connections").select("id").eq("user_a", userA).eq("user_b", userB).maybeSingle(); if (existingConnection.error) throw existingConnection.error;
  let connectionId = existingConnection.data?.id;
  if (!connectionId) { const inserted = await supabase.from("connections").insert({ user_a: userA, user_b: userB }).select("id").single(); if (inserted.error) throw inserted.error; connectionId = inserted.data.id; }
  if (!connectionId) throw new Error("Could not open the connection.");
  const existingConversation = await supabase.from("direct_conversations").select("id").eq("connection_id", connectionId).maybeSingle(); if (existingConversation.error) throw existingConversation.error;
  if (existingConversation.data?.id) return String(existingConversation.data.id);
  const conversation = await supabase.from("direct_conversations").insert({ connection_id: connectionId }).select("id").single(); if (conversation.error) throw conversation.error;
  return String(conversation.data.id);
}

export async function loadNotifications(userId: string): Promise<AppNotification[]> {
  const result = await client().from("notifications").select("id,title,body,href,read_at,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(50); if (result.error) throw result.error;
  return (result.data ?? []).map((row) => ({ id: String(row.id), title: String(row.title), body: String(row.body), href: row.href ? String(row.href) : null, readAt: row.read_at ? String(row.read_at) : null, createdAt: String(row.created_at) }));
}

export async function markNotificationRead(userId: string, id?: string) {
  let query = client().from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", userId).is("read_at", null); if (id) query = query.eq("id", id); const result = await query; if (result.error) throw result.error;
}

export async function blockUser(userId: string, otherId: string) { const result = await client().from("user_blocks").insert({ blocker_id: userId, blocked_id: otherId }); if (result.error) throw result.error; }
export async function reportProfile(userId: string, otherId: string, reason: string) { const result = await client().from("reports").insert({ reporter_id: userId, target_user_id: otherId, target_type: "profile", reason, details: "Reported from mobile" }); if (result.error) throw result.error; }

export async function loadMessages(conversationId: string): Promise<DirectMessage[]> { const result = await client().from("direct_messages").select("id,conversation_id,sender_id,body,read_at,created_at").eq("conversation_id", conversationId).order("created_at"); if (result.error) throw result.error; return (result.data ?? []).map((row) => ({ id: String(row.id), conversationId: String(row.conversation_id), senderId: String(row.sender_id), body: String(row.body), readAt: row.read_at ? String(row.read_at) : null, createdAt: String(row.created_at) })); }
export async function sendMessage(userId: string, conversationId: string, body: string) { const trimmed = body.trim(); if (!trimmed) return; const result = await client().from("direct_messages").insert({ conversation_id: conversationId, sender_id: userId, body: trimmed }); if (result.error) throw result.error; }

export async function loadThreads(userId: string): Promise<MessageThread[]> {
  const supabase = client();
  const connections = await supabase.from("connections").select("id,user_a,user_b,created_at").or(`user_a.eq.${userId},user_b.eq.${userId}`).order("created_at", { ascending: false }); if (connections.error) throw connections.error;
  if (!connections.data?.length) return [];
  const connectionIds = connections.data.map((row) => String(row.id));
  const otherIds = connections.data.map((row) => String(row.user_a) === userId ? String(row.user_b) : String(row.user_a));
  const [conversations, profiles] = await Promise.all([
    supabase.from("direct_conversations").select("id,connection_id,created_at").in("connection_id", connectionIds),
    supabase.from("profiles").select("id,username,display_name,bio,avatar_url,city,languages,intentions,onboarding_complete").in("id", otherIds),
  ]);
  if (conversations.error) throw conversations.error; if (profiles.error) throw profiles.error;
  const profileMap = new Map((profiles.data ?? []).map((row) => [String(row.id), profileFrom(row as Record<string, unknown>)]));
  const conversationMap = new Map((conversations.data ?? []).map((row) => [String(row.connection_id), row]));
  const threadRows = connections.data.flatMap((connection) => { const conversation = conversationMap.get(String(connection.id)); const otherId = String(connection.user_a) === userId ? String(connection.user_b) : String(connection.user_a); const other = profileMap.get(otherId); return conversation && other ? [{ id: String(conversation.id), other, lastMessage: "Private conversation", updatedAt: String(conversation.created_at) }] : []; });
  return threadRows;
}
