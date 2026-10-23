import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Alert, Pressable, Text, View } from "react-native";
import {
  Avatar,
  PrimaryButton,
  QueryState,
  Section,
} from "@/components/mobile-ui";
import { EmptyState, PremiumScreen } from "@/components/premium-ui";
import { useTheme } from "@/hooks/use-theme";
import {
  blockUser,
  loadDating,
  loadDiscover,
  loadMyBundle,
  requestConnection,
  startTwin,
  likeDatingProfile,
} from "@/lib/lonagram";
import { useAuth } from "@/providers/auth-provider";

export default function DiscoverScreen() {
  const theme = useTheme();
  const router = useRouter();
  const cache = useQueryClient();
  const { session } = useAuth();
  const userId = session!.user.id;
  const discover = useQuery({
    queryKey: ["discover", userId],
    queryFn: () => loadDiscover(userId),
  });
  const dating = useQuery({
    queryKey: ["dating", userId],
    queryFn: loadDating,
  });
  const bundle = useQuery({
    queryKey: ["bundle", userId],
    queryFn: () => loadMyBundle(userId),
  });
  const connect = useMutation({
    mutationFn: (otherId: string) => requestConnection(userId, otherId),
    onSuccess: async () => {
      await Promise.all([
        cache.invalidateQueries({ queryKey: ["requests", userId] }),
        cache.invalidateQueries({ queryKey: ["discover", userId] }),
      ]);
    },
  });
  const meet = useMutation({
    mutationFn: (otherId: string) =>
      startTwin(otherId, `start:${userId}:${otherId}`),
    onSuccess: (thread) =>
      router.push({
        pathname: "/twin-chat/[id]" as never,
        params: { id: thread.id },
      } as never),
  });
  const like = useMutation({
    mutationFn: (otherId: string) =>
      likeDatingProfile(otherId, `like:${userId}:${otherId}`),
    onSuccess: (result) => {
      void cache.invalidateQueries();
      if (result.conversationId)
        router.push({
          pathname: "/chat/[id]" as never,
          params: { id: result.conversationId },
        } as never);
    },
  });
  const block = useMutation({
    mutationFn: (otherId: string) => blockUser(userId, otherId),
    onSuccess: () => cache.invalidateQueries(),
  });
  const error = meet.error ?? like.error ?? block.error ?? connect.error;
  const myTwinAvailable = Boolean(
    bundle.data?.twin.enabled && bundle.data.permissions.allowTwinChat,
  );
  return (
    <PremiumScreen
      eyebrow="Private and reciprocal"
      title="Dating"
      subtitle="Meet through shared interests. Personal chat opens only when both people choose to connect."
    >
      <PrimaryButton
        label="Dating preferences"
        onPress={() => router.push("/dating-preferences" as never)}
      />
      {!myTwinAvailable && bundle.data ? (
        <PrimaryButton
          label="Set up my Twin"
          onPress={() => router.push("/twin" as never)}
        />
      ) : null}
      <QueryState loading={discover.isLoading} error={discover.error}>
        {discover.data?.length === 0 ? (
          <EmptyState
            icon="heart-outline"
            title={
              dating.data?.preferences.enabled
                ? "No mutual fits yet"
                : "Dating is paused"
            }
            body="Review your age, location, and relationship goals. Recommendations respect both people's choices."
            action="Review preferences"
            onPress={() => router.push("/dating-preferences" as never)}
          />
        ) : null}
        {discover.data?.map((person) => (
          <Section key={person.id}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                padding: 16,
              }}
            >
              <Avatar
                name={person.displayName}
                uri={person.avatarUrl}
                size={64}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{ color: theme.text, fontSize: 19, fontWeight: "800" }}
                >
                  {person.displayName}
                </Text>
                <Text style={{ color: theme.textSecondary }}>
                  @{person.username}
                  {person.city ? ` · ${person.city}` : ""}
                </Text>
              </View>
            </View>
            {person.bio ? (
              <Text
                style={{
                  color: theme.text,
                  lineHeight: 21,
                  paddingHorizontal: 16,
                }}
              >
                {person.bio}
              </Text>
            ) : null}
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
                padding: 16,
              }}
            >
              {(person.sharedInterests.length
                ? person.sharedInterests
                : person.interests
              )
                .slice(0, 5)
                .map((interest) => (
                  <Text
                    key={interest}
                    style={{
                      color: theme.textSecondary,
                      backgroundColor: theme.backgroundSelected,
                      padding: 8,
                      borderRadius: 14,
                    }}
                  >
                    {person.sharedInterests.includes(interest)
                      ? "Shared · "
                      : ""}
                    {interest}
                  </Text>
                ))}
            </View>
            <View style={{ paddingHorizontal: 16, gap: 10 }}>
              <PrimaryButton
                label={
                  meet.isPending && meet.variables === person.id
                    ? "Opening Twin…"
                    : "Meet Twin"
                }
                disabled={
                  meet.isPending || !myTwinAvailable || !person.twinAvailable
                }
                onPress={() => meet.mutate(person.id)}
              />
              <PrimaryButton
                label={
                  person.datingState === "liked"
                    ? "Liked privately"
                    : like.isPending && like.variables === person.id
                      ? "Saving…"
                      : "Like privately"
                }
                disabled={like.isPending || person.datingState === "liked"}
                onPress={() => like.mutate(person.id)}
              />
              <PrimaryButton
                label={
                  person.connectionState === "outgoing"
                    ? "Invitation sent"
                    : person.connectionState === "incoming"
                      ? "View invitation"
                      : connect.isPending && connect.variables === person.id
                        ? "Sending…"
                        : "Invite to connect"
                }
                disabled={
                  connect.isPending || person.connectionState === "outgoing"
                }
                onPress={() =>
                  person.connectionState === "incoming"
                    ? router.push("/notifications" as never)
                    : connect.mutate(person.id)
                }
              />
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                gap: 16,
                padding: 12,
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Report ${person.displayName}`}
                onPress={() =>
                  router.push({
                    pathname: "/report" as never,
                    params: { id: person.id, name: person.displayName },
                  } as never)
                }
                style={{
                  minHeight: 44,
                  justifyContent: "center",
                  paddingHorizontal: 8,
                }}
              >
                <Text style={{ color: theme.textSecondary }}>Report</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Block ${person.displayName}`}
                disabled={block.isPending}
                onPress={() =>
                  Alert.alert(
                    `Block ${person.displayName}?`,
                    "You can unblock them in Settings.",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Block",
                        style: "destructive",
                        onPress: () => block.mutate(person.id),
                      },
                    ],
                  )
                }
                style={{
                  minHeight: 44,
                  justifyContent: "center",
                  paddingHorizontal: 8,
                }}
              >
                <Text style={{ color: theme.danger }}>Block</Text>
              </Pressable>
            </View>
          </Section>
        ))}
      </QueryState>
      {error ? (
        <Text accessibilityRole="alert" style={{ color: theme.danger }}>
          {error.message}
        </Text>
      ) : null}
    </PremiumScreen>
  );
}
