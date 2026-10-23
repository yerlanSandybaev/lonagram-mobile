import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { QueryState } from "@/components/mobile-ui";
import { useTheme } from "@/hooks/use-theme";
import { loadMessages, sendMessage } from "@/lib/lonagram";
import { useAuth } from "@/providers/auth-provider";

export default function HumanChatScreen() {
  const theme = useTheme();
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const { session } = useAuth();
  const userId = session!.user.id;
  const queryClient = useQueryClient();
  const list = useRef<FlatList>(null);
  const atBottom = useRef(true);
  const focused = useIsFocused();
  const headerHeight = useHeaderHeight();
  const messages = useQuery({
    queryKey: ["messages", userId, id],
    queryFn: () => loadMessages(id),
    enabled: focused,
    refetchInterval: focused ? 4_000 : false,
  });
  const lastMessageId = messages.data?.at(-1)?.id;
  useEffect(() => {
    if (focused && lastMessageId) {
      void queryClient.invalidateQueries({ queryKey: ["counts"] });
      void queryClient.invalidateQueries({ queryKey: ["threads", userId] });
    }
  }, [focused, lastMessageId, queryClient, userId]);
  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["messages", userId, id] });
    void queryClient.invalidateQueries({ queryKey: ["counts"] });
    void queryClient.invalidateQueries({ queryKey: ["threads", userId] });
  }
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ backgroundColor: theme.background, flex: 1 }}
      keyboardVerticalOffset={headerHeight}
    >
      <Stack.Screen
        options={{ headerShown: true, title: `${name ?? "Chat"} · Personal` }}
      />
      <Text style={{ color: theme.textSecondary, padding: 12 }}>
        Personal messages · You are speaking with the person.
      </Text>
      {messages.data && messages.error ? (
        <Text
          accessibilityRole="alert"
          style={{ color: theme.danger, paddingHorizontal: 12 }}
        >
          Messages could not refresh. Your draft is kept.
        </Text>
      ) : null}
      <View style={{ flex: 1 }}>
        <QueryState
          loading={messages.isLoading}
          error={!messages.data ? messages.error : null}
        >
          <FlatList
            ref={list}
            data={messages.data}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            contentContainerStyle={{ flexGrow: 1, gap: 8, padding: 16 }}
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
            renderItem={({ item }) => {
              const mine = item.senderId === userId;
              return (
                <View
                  style={{
                    alignSelf: mine ? "flex-end" : "flex-start",
                    backgroundColor: mine
                      ? theme.primary
                      : theme.backgroundElement,
                    borderRadius: 18,
                    maxWidth: "82%",
                    padding: 12,
                  }}
                >
                  <Text
                    style={{
                      color: mine ? theme.background : theme.text,
                      lineHeight: 20,
                    }}
                  >
                    {item.body}
                  </Text>
                </View>
              );
            }}
          />
        </QueryState>
      </View>
      <ChatComposer
        key={id}
        draftId={`personal:${id}`}
        placeholder="Personal message"
        disabled={!messages.data}
        submit={(body, key) => sendMessage(userId, id, body, key)}
        onSent={() => {
          atBottom.current = true;
          refresh();
        }}
      />
    </KeyboardAvoidingView>
  );
}
