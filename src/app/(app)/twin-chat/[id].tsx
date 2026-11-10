import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useIsFocused, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "@/components/app-text";
import { ChatComposer } from "@/components/chat-composer";
import { Avatar, PrimaryButton, QueryState } from "@/components/mobile-ui";
import { Radius } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
  blockUser,
  loadHome,
  loadTwinThread,
  markTwinRead,
  requestConnection,
  respondToRequestById,
  runTwinTurn,
  startTwin,
} from "@/lib/lonagram";
import { chatRows, realChatState, twinChatView, type TwinChatThread } from "@/lib/twin-chat";
import { useAuth } from "@/providers/auth-provider";

const time = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export default function TwinChatScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const userId = session!.user.id;
  const cache = useQueryClient();
  const list = useRef<FlatList>(null);
  const atBottom = useRef(true);
  const focused = useIsFocused();
  const thread = useQuery({
    queryKey: ["twin-thread", userId, id],
    queryFn: () => loadTwinThread(id) as Promise<TwinChatThread & Awaited<ReturnType<typeof loadTwinThread>>>,
    enabled: focused,
    refetchInterval: focused ? 4_000 : false,
  });
  const home = useQuery({ queryKey: ["home", userId], queryFn: loadHome, enabled: focused });
  const lastId = thread.data?.messages.at(-1)?.id;
  useEffect(() => {
    if (focused && lastId)
      void markTwinRead(id, lastId)
        .then(() => cache.invalidateQueries({ queryKey: ["twin-threads", userId] }))
        .catch(() => undefined);
  }, [focused, id, lastId, cache, userId]);

  const data = thread.data;
  const view = data ? twinChatView(data, userId) : null;
  const rows = data ? chatRows(data, userId, time) : [];
  const real = data ? realChatState(home.data, data.other.id) : null;
  const refreshHome = () => cache.invalidateQueries({ queryKey: ["home", userId] });

  const invite = useMutation({
    mutationFn: () => requestConnection(userId, data!.other.id, "twin_chat", id, `twin-connect:${id}`),
    onSuccess: refreshHome,
  });
  const respond = useMutation({
    mutationFn: (decision: "accepted" | "rejected") =>
      real?.kind === "incoming" ? respondToRequestById(userId, real.requestId, decision) : Promise.resolve(null),
    onSuccess: (conversationId) => {
      void refreshHome();
      if (conversationId) router.push({ pathname: "/chat/[id]" as never, params: { id: conversationId } } as never);
    },
  });
  const chatBack = useMutation({
    mutationFn: () => startTwin(data!.other.id, `start:${userId}:${data!.other.id}`),
    onSuccess: (next) => router.push({ pathname: "/twin-chat/[id]" as never, params: { id: next.id } } as never),
  });
  const block = useMutation({
    mutationFn: () => blockUser(userId, data!.other.id),
    onSuccess: () => {
      void cache.invalidateQueries();
      router.back();
    },
  });
  const actionError = invite.error ?? respond.error ?? chatBack.error ?? block.error;

  function realAction() {
    if (!real) return;
    if (real.kind === "none") invite.mutate();
    else if (real.kind === "incoming") respond.mutate("accepted");
    else if (real.kind === "open" && real.conversationId)
      router.push({ pathname: "/chat/[id]" as never, params: { id: real.conversationId, name: data?.other.displayName } } as never);
  }

  function openMenu() {
    if (!data || !view) return;
    const name = data.other.displayName;
    Alert.alert(view.title, undefined, [
      ...(view.visitor ? [] : [{ text: "Teach my Twin", onPress: () => router.push("/" as never) }]),
      ...(view.visitor ? [] : [{ text: `Chat with ${name}'s Twin`, onPress: () => chatBack.mutate() }]),
      { text: "Report", onPress: () => router.push({ pathname: "/report" as never, params: { id: data.other.id, name } } as never) },
      {
        text: "Block",
        style: "destructive" as const,
        onPress: () =>
          Alert.alert(`Block ${name}?`, "You can unblock them in Settings.", [
            { text: "Cancel", style: "cancel" },
            { text: "Block", style: "destructive", onPress: () => block.mutate() },
          ]),
      },
      { text: "Cancel", style: "cancel" as const },
    ]);
  }

  const busy = invite.isPending || respond.isPending;
  const realLabel = real ? (busy ? "Please wait…" : real.label) : "";

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ backgroundColor: theme.background, flex: 1 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ alignItems: "center", flexDirection: "row", gap: 10, paddingBottom: 8, paddingHorizontal: 8, paddingTop: Math.max(insets.top, 12) }}>
        <Pressable accessibilityLabel="Back" accessibilityRole="button" onPress={() => router.back()} style={{ alignItems: "center", height: 44, justifyContent: "center", width: 44 }}>
          <Ionicons color={theme.text} name="chevron-back" size={24} />
        </Pressable>
        {data ? <Avatar name={data.other.displayName} uri={data.other.avatarUrl} size={36} /> : null}
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ color: theme.text, fontSize: 16, fontWeight: "800" }}>
            {view?.title ?? "Twin chat"}
          </Text>
          {view ? <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{view.status}</Text> : null}
        </View>
        <Pressable accessibilityLabel="More" accessibilityRole="button" disabled={!data} onPress={openMenu} style={{ alignItems: "center", height: 44, justifyContent: "center", width: 44 }}>
          <Ionicons color={theme.text} name="ellipsis-horizontal" size={22} />
        </Pressable>
      </View>

      <View style={{ flex: 1 }}>
        <QueryState loading={thread.isLoading} error={!data ? thread.error : null}>
          <FlatList
            ref={list}
            data={rows}
            keyExtractor={(row) => row.message.id}
            keyboardShouldPersistTaps="handled"
            onScroll={({ nativeEvent: event }) => {
              atBottom.current = event.contentOffset.y + event.layoutMeasurement.height >= event.contentSize.height - 80;
            }}
            scrollEventThrottle={100}
            onContentSizeChange={() => {
              if (atBottom.current) list.current?.scrollToEnd({ animated: false });
            }}
            contentContainerStyle={{ alignSelf: "center", flexGrow: 1, gap: 6, maxWidth: 680, padding: 16, width: "100%" }}
            renderItem={({ item: row }) => (
              <View style={{ alignSelf: row.mine ? "flex-end" : "flex-start", marginTop: row.header ? 10 : 0, maxWidth: "86%" }}>
                {row.header ? (
                  <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 4, textAlign: row.mine ? "right" : "left" }}>
                    {row.header.name}
                    {row.header.time ? ` · ${row.header.time}` : ""}
                  </Text>
                ) : null}
                <Text
                  selectable
                  style={
                    row.mine
                      ? { backgroundColor: theme.text, borderRadius: Radius.bubble, color: theme.background, fontSize: 15, lineHeight: 22, overflow: "hidden", paddingHorizontal: 16, paddingVertical: 11 }
                      : row.message.fromPerson
                        ? { backgroundColor: theme.tint, borderRadius: Radius.bubble, color: theme.text, fontSize: 15, lineHeight: 22, overflow: "hidden", paddingHorizontal: 16, paddingVertical: 11 }
                        : { color: theme.text, fontSize: 15, lineHeight: 24 }
                  }
                >
                  {row.message.body}
                </Text>
              </View>
            )}
          />
        </QueryState>
      </View>

      {actionError ? (
        <Text accessibilityRole="alert" style={{ color: theme.danger, fontSize: 13, paddingHorizontal: 16 }}>
          {actionError.message}
        </Text>
      ) : null}

      {data && view && !view.visitor ? (
        <View style={{ gap: 10, paddingBottom: Math.max(insets.bottom, 12), paddingHorizontal: 16, paddingTop: 8 }}>
          <Text style={{ color: theme.textSecondary, fontSize: 13, textAlign: "center" }}>
            Only {data.other.displayName} and your Twin write here.
          </Text>
          {real?.kind === "incoming" ? (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <PrimaryButton label={realLabel} disabled={busy} onPress={realAction} />
              </View>
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={() => respond.mutate("rejected")}
                style={{ alignItems: "center", borderColor: theme.border, borderRadius: Radius.pill, borderWidth: 1, justifyContent: "center", minHeight: 52, paddingHorizontal: 20 }}
              >
                <Text style={{ color: theme.text, fontSize: 15, fontWeight: "800" }}>Decline</Text>
              </Pressable>
            </View>
          ) : real ? (
            <PrimaryButton label={realLabel} disabled={busy || real.kind === "sent"} onPress={realAction} />
          ) : null}
        </View>
      ) : null}

      {data && view?.visitor ? (
        <>
          <ChatComposer
            key={id}
            draftId={`twin:${id}`}
            placeholder={`Message ${data.other.displayName}'s Twin`}
            disabled={data.conversation.status !== "active"}
            submit={(cue, key) => runTwinTurn(id, cue, key)}
            onSent={() => {
              atBottom.current = true;
              void cache.invalidateQueries({ queryKey: ["twin-thread", userId, id] });
            }}
          />
          {real ? (
            <Pressable
              accessibilityRole="button"
              disabled={busy || real.kind === "sent"}
              onPress={realAction}
              style={{ alignItems: "center", justifyContent: "center", marginBottom: Math.max(insets.bottom - 8, 4), minHeight: 40 }}
            >
              <Text style={{ color: real.kind === "sent" ? theme.textSecondary : theme.primary, fontSize: 13, fontWeight: "800" }}>{realLabel}</Text>
            </Pressable>
          ) : null}
        </>
      ) : null}
    </KeyboardAvoidingView>
  );
}
