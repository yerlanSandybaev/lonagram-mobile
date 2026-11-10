import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { FlatList, Pressable, View } from "react-native";

import { Text } from "@/components/app-text";
import { Avatar, QueryState } from "@/components/mobile-ui";
import { EmptyState } from "@/components/premium-ui";
import { useTheme } from "@/hooks/use-theme";
import { loadTwinThreads } from "@/lib/lonagram";
import { inboxTitle } from "@/lib/twin-chat";
import { useAuth } from "@/providers/auth-provider";

// Twin Inbox: people talking to your Twin, and you talking to other people's Twins.
export default function TwinInboxScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { session } = useAuth();
  const threads = useQuery({
    queryKey: ["twin-threads", session!.user.id],
    queryFn: loadTwinThreads,
    refetchInterval: 15_000,
  });
  return (
    <View style={{ backgroundColor: theme.background, flex: 1 }}>
      <QueryState loading={threads.isLoading} error={threads.error}>
        <FlatList
          data={threads.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ alignSelf: "center", maxWidth: 680, paddingVertical: 8, width: "100%" }}
          ListHeaderComponent={
            <Text heading accessibilityRole="header" style={{ color: theme.text, fontSize: 28, fontWeight: "800", paddingHorizontal: 20, paddingVertical: 12 }}>
              Twin Inbox
            </Text>
          }
          ListEmptyComponent={
            <EmptyState
              icon="sparkles-outline"
              title="No Twin chats yet"
              body="When someone talks to your Twin, or you talk to someone's Twin from Discover, it shows up here."
              action="Open Discover"
              onPress={() => router.push("/discover" as never)}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push({ pathname: "/twin-chat/[id]" as never, params: { id: item.id } } as never)}
              style={{ alignItems: "center", flexDirection: "row", gap: 14, minHeight: 72, paddingHorizontal: 20, paddingVertical: 12 }}
            >
              <Avatar name={item.other.displayName} uri={item.other.avatarUrl} size={48} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text numberOfLines={1} style={{ color: theme.text, fontSize: 15, fontWeight: item.unread ? "800" : "700" }}>
                  {inboxTitle(item)}
                </Text>
                <Text numberOfLines={1} style={{ color: theme.textSecondary, fontSize: 13 }}>
                  {item.status === "active" ? item.preview : `Ended · ${item.preview}`}
                </Text>
              </View>
              {item.unread ? <View accessibilityLabel="Unread" style={{ backgroundColor: theme.primary, borderRadius: 5, height: 10, width: 10 }} /> : null}
            </Pressable>
          )}
        />
      </QueryState>
    </View>
  );
}
