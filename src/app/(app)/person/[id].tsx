import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Alert, Pressable, ScrollView, View } from "react-native";

import { Text } from "@/components/app-text";
import { PrimaryButton } from "@/components/mobile-ui";
import { PersonAvatar } from "@/components/person-avatar";
import { EmptyState } from "@/components/premium-ui";
import { Pastels, Radius } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { chipsFor, middleAction, privacyLine } from "@/lib/discover";
import { blockUser, likeDatingProfile, requestConnection, startTwin, type DiscoverCard } from "@/lib/lonagram";
import { useAuth } from "@/providers/auth-provider";

// A person from Discover. One primary action: talk to their Twin. The rest is in "...".
export default function PersonScreen() {
  const theme = useTheme();
  const router = useRouter();
  const cache = useQueryClient();
  const { session } = useAuth();
  const userId = session!.user.id;
  const { id } = useLocalSearchParams<{ id: string }>();
  const key = ["discover-person", userId, id];
  // Filled by Discover when the row is tapped. There is no single-profile operation yet.
  const person = useQuery<DiscoverCard | null>({ queryKey: key, queryFn: () => null, staleTime: Infinity, initialData: () => cache.getQueryData<DiscoverCard>(key) ?? null });
  const card = person.data;
  const patch = (change: Partial<DiscoverCard>) => cache.setQueryData<DiscoverCard | null>(key, (old) => (old ? { ...old, ...change } : old));

  const meet = useMutation({
    mutationFn: () => startTwin(id, `start:${userId}:${id}`),
    onSuccess: (thread) => router.push({ pathname: "/twin-chat/[id]" as never, params: { id: thread.id } } as never),
  });
  const like = useMutation({
    mutationFn: () => likeDatingProfile(id, `like:${userId}:${id}`),
    onSuccess: (result) => {
      patch({ datingState: "liked" });
      void cache.invalidateQueries({ queryKey: ["counts"] });
      if (result.conversationId) router.push({ pathname: "/chat/[id]" as never, params: { id: result.conversationId } } as never);
    },
  });
  const connect = useMutation({
    mutationFn: () => requestConnection(userId, id),
    onSuccess: () => {
      patch({ connectionState: "outgoing" });
      void cache.invalidateQueries({ queryKey: ["requests", userId] });
    },
  });
  const block = useMutation({
    mutationFn: () => blockUser(userId, id),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: ["discover-cards", userId] });
      router.back();
    },
  });
  const error = meet.error ?? like.error ?? connect.error ?? block.error;

  if (!card)
    return (
      <View style={{ backgroundColor: theme.background, flex: 1, padding: 24 }}>
        <Stack.Screen options={{ title: "" }} />
        <EmptyState icon="person-outline" title="Profile not available" body="Open this person again from Discover." action="Back" onPress={() => router.back()} />
      </View>
    );

  const middle = middleAction(card);
  function openMenu() {
    const name = card!.displayName;
    Alert.alert(name, undefined, [
      ...(middle.disabled
        ? []
        : [
            {
              text: middle.label,
              onPress: () => {
                if (middle.kind === "like") like.mutate();
                else if (middle.kind === "connect") connect.mutate();
                else if (middle.kind === "review") router.push("/notifications" as never);
              },
            },
          ]),
      { text: "Report", onPress: () => router.push({ pathname: "/report" as never, params: { id, name } } as never) },
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

  const chips = chipsFor(card);
  return (
    <ScrollView contentContainerStyle={{ alignSelf: "center", gap: 20, maxWidth: 680, padding: 24, paddingBottom: 48, width: "100%" }}>
      <Stack.Screen
        options={{
          title: "",
          headerRight: () => (
            <Pressable accessibilityLabel={`More options for ${card.displayName}`} accessibilityRole="button" onPress={openMenu} style={{ alignItems: "center", height: 44, justifyContent: "center", width: 44 }}>
              <Ionicons color={theme.text} name="ellipsis-horizontal" size={22} />
            </Pressable>
          ),
        }}
      />
      <View style={{ gap: 6 }}>
        <PersonAvatar name={card.displayName} uri={card.avatarUrl} seed={card.avatarSeed} size={96} />
        <Text heading accessibilityRole="header" style={{ color: theme.text, fontSize: 32, fontWeight: "800", letterSpacing: -0.6, marginTop: 10 }}>
          {card.displayName}
        </Text>
        <Text style={{ color: theme.textSecondary, fontSize: 15 }}>
          @{card.username}
          {card.city ? ` · ${card.city}` : ""}
        </Text>
      </View>
      {card.bio ? <Text style={{ color: theme.text, fontSize: 15, lineHeight: 24 }}>{card.bio}</Text> : null}
      {chips.length ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {chips.map((chip) => (
            <View key={chip.label} style={{ backgroundColor: chip.shared ? Pastels.yellow.bg : theme.tint, borderRadius: Radius.pill, paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ color: chip.shared ? Pastels.yellow.text : theme.tintText, fontSize: 13, fontWeight: "700" }}>{chip.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <View style={{ gap: 10 }}>
        <PrimaryButton
          icon="chatbubble-ellipses"
          label={meet.isPending ? "Opening Twin chat…" : "Talk to their Twin"}
          disabled={!card.twinAvailable || meet.isPending}
          onPress={() => meet.mutate()}
        />
        <Text style={{ color: theme.textSecondary, fontSize: 13, lineHeight: 19 }}>{privacyLine(card)}</Text>
        {middle.kind === "liked" || middle.kind === "sent" ? (
          <Text style={{ color: theme.textSecondary, fontSize: 13 }}>{middle.kind === "liked" ? "You liked this profile." : "Request sent."}</Text>
        ) : null}
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={{ color: theme.danger, fontSize: 14 }}>
          {error.message}
        </Text>
      ) : null}
    </ScrollView>
  );
}
