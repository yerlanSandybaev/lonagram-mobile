import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useRef } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  View,
} from "react-native";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useIsFocused } from "expo-router";
import { ChatComposer } from "@/components/chat-composer";
import { PrimaryButton, QueryState } from "@/components/mobile-ui";
import { useTheme } from "@/hooks/use-theme";
import {
  loadTwinThread,
  markTwinRead,
  requestConnection,
  runTwinTurn,
} from "@/lib/lonagram";
import { useAuth } from "@/providers/auth-provider";

export default function TwinChatScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const userId = session!.user.id;
  const queryClient = useQueryClient();
  const list = useRef<FlatList>(null);
  const atBottom = useRef(true);
  const focused = useIsFocused();
  const height = useHeaderHeight();
  const thread = useQuery({
    queryKey: ["twin-thread", userId, id],
    queryFn: () => loadTwinThread(id),
    enabled: focused,
    refetchInterval: focused ? 4_000 : false,
  });
  const lastId = thread.data?.messages.at(-1)?.id;
  useEffect(() => {
    if (focused && lastId)
      void markTwinRead(id, lastId)
        .then(() => queryClient.invalidateQueries({ queryKey: ["counts"] }))
        .catch(() => undefined);
  }, [focused, id, lastId, queryClient]);
  const connect = useMutation({
    mutationFn: () =>
      requestConnection(
        userId,
        thread.data!.other.id,
        "twin_chat",
        id,
        `twin-connect:${id}`,
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["requests", userId] }),
  });
  const title = `${thread.data?.other.displayName ?? "Conversation"} · Twin`;
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={height}
      style={{ backgroundColor: theme.background, flex: 1 }}
    >
      <Stack.Screen options={{ headerShown: true, title }} />
      <Text style={{ color: theme.textSecondary, padding: 12 }}>
        Twin replies represent approved information. They are not personal
        replies or consent to connect.
      </Text>
      <View style={{ flex: 1 }}>
        {thread.data && thread.error ? (
          <Text
            accessibilityRole="alert"
            style={{ color: theme.danger, paddingHorizontal: 12 }}
          >
            The conversation could not refresh. Your draft is kept.
          </Text>
        ) : null}
        <QueryState
          loading={thread.isLoading}
          error={!thread.data ? thread.error : null}
        >
          <FlatList
            ref={list}
            data={thread.data?.messages}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            onScroll={({ nativeEvent: e }) => {
              atBottom.current =
                e.contentOffset.y + e.layoutMeasurement.height >=
                e.contentSize.height - 80;
            }}
            scrollEventThrottle={100}
            onContentSizeChange={() => {
              if (atBottom.current)
                list.current?.scrollToEnd({ animated: false });
            }}
            contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
            renderItem={({ item }) => (
              <View
                style={{
                  backgroundColor: theme.backgroundElement,
                  padding: 14,
                  borderRadius: 16,
                }}
              >
                <Text
                  style={{
                    color: theme.primary,
                    fontSize: 12,
                    fontWeight: "700",
                    marginBottom: 6,
                  }}
                >
                  {item.fromPerson
                    ? item.speakerUserId === userId
                      ? "You · Personal"
                      : `${thread.data?.other.displayName} · Personal`
                    : "Twin"}
                </Text>
                <Text style={{ color: theme.text, lineHeight: 21 }}>
                  {item.body}
                </Text>
              </View>
            )}
          />
        </QueryState>
      </View>
      {thread.data ? (
        <View style={{ paddingHorizontal: 12, gap: 6 }}>
          <PrimaryButton
            label={
              connect.isPending
                ? "Sending invitation…"
                : connect.isSuccess
                  ? "Invitation sent"
                  : "Invite to connect"
            }
            disabled={connect.isPending || connect.isSuccess}
            onPress={() => connect.mutate()}
          />
          {connect.error ? (
            <Text accessibilityRole="alert" style={{ color: theme.danger }}>
              {connect.error.message}
            </Text>
          ) : null}
        </View>
      ) : null}
      <ChatComposer
        key={id}
        draftId={`twin:${id}`}
        placeholder="Ask the Twin"
        disabled={!thread.data || thread.data.conversation.status !== "active"}
        submit={(cue, key) => runTwinTurn(id, cue, key)}
        onSent={() => {
          atBottom.current = true;
          void queryClient.invalidateQueries({
            queryKey: ["twin-thread", userId, id],
          });
        }}
      />
    </KeyboardAvoidingView>
  );
}
