import { Ionicons } from "@expo/vector-icons";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useMemo, useState, type ComponentProps, type ReactNode } from "react";
import { Alert, Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text, TextInput } from "@/components/app-text";
import { PrimaryButton, QueryState } from "@/components/mobile-ui";
import { EmptyState } from "@/components/premium-ui";
import { Pastels, Radius } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
  avatarTone,
  chipsFor,
  initials,
  middleAction,
  privacyLine,
  type DiscoverCard,
} from "@/lib/discover";
import {
  blockUser,
  discoverApi,
  likeDatingProfile,
  requestConnection,
  startTwin,
} from "@/lib/lonagram";
import { useAuth } from "@/providers/auth-provider";

const PAGE = 20;
type IconName = ComponentProps<typeof Ionicons>["name"];

export default function DiscoverScreen() {
  const theme = useTheme();
  const router = useRouter();
  const cache = useQueryClient();
  const { session } = useAuth();
  const userId = session!.user.id;
  const { height } = useWindowDimensions();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState(0);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [overrides, setOverrides] = useState<Record<string, Partial<DiscoverCard>>>({});
  const [note, setNote] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPosition(0);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const list = useInfiniteQuery({
    queryKey: ["discover-cards", userId, query],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => discoverApi.list({ query, offset: pageParam, limit: PAGE }),
    getNextPageParam: (last, pages) => (last.length >= PAGE ? pages.length * PAGE : undefined),
  });
  const cards = useMemo(
    () =>
      (list.data?.pages.flat() ?? [])
        .filter((card) => !hidden.has(card.id))
        .map((card) => ({ ...card, ...overrides[card.id] })),
    [list.data, hidden, overrides],
  );
  const current = cards[position];
  const patch = (id: string, change: Partial<DiscoverCard>) =>
    setOverrides((all) => ({ ...all, [id]: { ...all[id], ...change } }));

  const meet = useMutation({
    mutationFn: (otherId: string) => startTwin(otherId, `start:${userId}:${otherId}`),
    onSuccess: (thread) =>
      router.push({ pathname: "/twin-chat/[id]" as never, params: { id: thread.id } } as never),
  });
  const like = useMutation({
    mutationFn: (otherId: string) => likeDatingProfile(otherId, `like:${userId}:${otherId}`),
    onSuccess: (result, otherId) => {
      patch(otherId, { datingState: "liked" });
      void cache.invalidateQueries({ queryKey: ["counts"] });
      if (result.conversationId)
        router.push({ pathname: "/chat/[id]" as never, params: { id: result.conversationId } } as never);
    },
  });
  const connect = useMutation({
    mutationFn: (otherId: string) => requestConnection(userId, otherId),
    onSuccess: (_result, otherId) => {
      patch(otherId, { connectionState: "outgoing" });
      void cache.invalidateQueries({ queryKey: ["requests", userId] });
    },
  });
  const ignore = useMutation({
    mutationFn: async (otherId: string) => ({ otherId, removed: await discoverApi.ignore(otherId) }),
    onSuccess: ({ otherId, removed }) => {
      // Without the server operation the person is only hidden until the app restarts.
      setNote(removed ? "" : "Hidden for now. Ignoring for good needs the latest Lonagram server.");
      setHidden((all) => new Set(all).add(otherId));
    },
  });
  const block = useMutation({
    mutationFn: (otherId: string) => blockUser(userId, otherId),
    onSuccess: (_result, otherId) => setHidden((all) => new Set(all).add(otherId)),
  });
  const error = meet.error ?? like.error ?? connect.error ?? ignore.error ?? block.error;

  async function next() {
    if (position + 1 >= cards.length && list.hasNextPage && !list.isFetchingNextPage) await list.fetchNextPage();
    setPosition((value) => value + 1);
  }
  function runMiddle(card: DiscoverCard) {
    const action = middleAction(card);
    if (action.kind === "like") like.mutate(card.id);
    else if (action.kind === "connect") connect.mutate(card.id);
    else if (action.kind === "review") router.push("/notifications" as never);
  }
  function openProfile(card: DiscoverCard) {
    const origin = process.env.EXPO_PUBLIC_LONAGRAM_API_URL?.trim();
    if (origin) void WebBrowser.openBrowserAsync(`${origin.replace(/\/$/, "")}/u/${encodeURIComponent(card.username)}`);
  }

  return (
    <SafeAreaView edges={["left", "right"]} style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <View
          style={{
            alignItems: "center",
            backgroundColor: theme.backgroundElement,
            borderColor: theme.border,
            borderRadius: Radius.md,
            borderWidth: 1,
            flexDirection: "row",
            gap: 8,
            paddingHorizontal: 14,
          }}
        >
          <Ionicons color={theme.textSecondary} name="search" size={18} />
          <TextInput
            accessibilityLabel="Search people"
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setSearch}
            placeholder="Search people"
            placeholderTextColor={theme.textSecondary}
            returnKeyType="search"
            style={{ color: theme.text, flex: 1, fontSize: 16, minHeight: 46 }}
            value={search}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ alignSelf: "center", maxWidth: 680, padding: 16, paddingBottom: 24, width: "100%" }}
        keyboardShouldPersistTaps="handled"
      >
        <QueryState loading={list.isLoading} error={list.error}>
          {current ? (
            <MatchCard card={current} photoMax={Math.min(height * 0.5, 520)} onProfile={() => openProfile(current)}>
              <View style={{ flexDirection: "row", gap: 20, justifyContent: "center", marginTop: 4 }}>
                <SmallLink
                  label="Report"
                  color={theme.textSecondary}
                  onPress={() =>
                    router.push({
                      pathname: "/report" as never,
                      params: { id: current.id, name: current.displayName },
                    } as never)
                  }
                />
                <SmallLink
                  label="Block"
                  color={theme.danger}
                  onPress={() =>
                    Alert.alert(`Block ${current.displayName}?`, "You can unblock them in Settings.", [
                      { text: "Cancel", style: "cancel" },
                      { text: "Block", style: "destructive", onPress: () => block.mutate(current.id) },
                    ])
                  }
                />
              </View>
            </MatchCard>
          ) : (
            <EmptyState
              icon="sparkles-outline"
              title="You're all caught up"
              body={
                query
                  ? "No one else matches that search. Try a different word."
                  : "New people appear here as they join. Check back soon."
              }
              action={cards.length ? "Start from the top" : "Refresh"}
              onPress={() => (cards.length ? setPosition(0) : void list.refetch())}
            />
          )}
        </QueryState>
        {note ? (
          <Text accessibilityRole="alert" style={{ color: theme.textSecondary, marginTop: 12, textAlign: "center" }}>
            {note}
          </Text>
        ) : null}
        {error ? (
          <Text accessibilityRole="alert" style={{ color: theme.danger, marginTop: 12 }}>
            {error.message}
          </Text>
        ) : null}
      </ScrollView>

      {current ? (
        <ActionBar
          card={current}
          busy={{
            meet: meet.isPending,
            ignore: ignore.isPending,
            middle: like.isPending || connect.isPending,
          }}
          onChat={() => meet.mutate(current.id)}
          onIgnore={() => ignore.mutate(current.id)}
          onMiddle={() => runMiddle(current)}
          onNext={() => void next()}
        />
      ) : null}
    </SafeAreaView>
  );
}

function MatchCard({
  card,
  photoMax,
  onProfile,
  children,
}: {
  card: DiscoverCard;
  photoMax: number;
  onProfile: () => void;
  children?: ReactNode;
}) {
  const theme = useTheme();
  const chips = chipsFor(card);
  const place = card.city ? ` · ${card.city}` : "";
  return (
    <View
      style={{
        backgroundColor: theme.backgroundElement,
        borderColor: theme.border,
        borderRadius: Radius.xl,
        borderWidth: 1,
        overflow: "hidden",
      }}
    >
      <Pressable
        accessibilityRole="imagebutton"
        accessibilityLabel={`View ${card.displayName}'s profile`}
        onPress={onProfile}
        style={{ aspectRatio: 4 / 5, maxHeight: photoMax, width: "100%" }}
      >
        {card.avatarUrl ? (
          <Image
            accessibilityLabel={`Photo of ${card.displayName}`}
            contentFit="cover"
            contentPosition={{ top: "25%", left: "50%" }}
            source={{ uri: card.avatarUrl }}
            style={{ height: "100%", width: "100%" }}
          />
        ) : (
          <View
            style={{
              alignItems: "center",
              backgroundColor: avatarTone(card.avatarSeed),
              height: "100%",
              justifyContent: "center",
              width: "100%",
            }}
          >
            <Text heading style={{ color: "rgba(0,0,0,0.25)", fontSize: 112, fontWeight: "800" }}>
              {initials(card.displayName) || "?"}
            </Text>
          </View>
        )}
        <View
          style={{
            alignItems: "center",
            backgroundColor: theme.background,
            borderRadius: Radius.pill,
            flexDirection: "row",
            gap: 8,
            left: 12,
            opacity: 0.94,
            paddingHorizontal: 14,
            paddingVertical: 8,
            position: "absolute",
            top: 12,
          }}
        >
          <View style={{ backgroundColor: theme.accent, borderRadius: 4, height: 7, width: 7 }} />
          <Text style={{ color: theme.tintText, fontSize: 12, fontWeight: "800" }}>Someone to get to know</Text>
        </View>
        <LinearGradient
          colors={["rgba(27,21,51,0)", "rgba(27,21,51,0.82)"]}
          style={{ bottom: 0, left: 0, paddingBottom: 16, paddingHorizontal: 20, paddingTop: 72, position: "absolute", right: 0 }}
        >
          <Text heading style={{ color: "#FFFFFF", fontSize: 30, fontWeight: "800", lineHeight: 34 }}>
            {card.displayName}
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.92)", fontSize: 14, marginTop: 2 }}>
            @{card.username}
            {place}
          </Text>
        </LinearGradient>
      </Pressable>

      <View style={{ gap: 10, padding: 18 }}>
        {chips.length ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {chips.map((chip) => (
              <View
                key={chip.label}
                style={{
                  backgroundColor: chip.shared ? Pastels.yellow.bg : theme.tint,
                  borderRadius: Radius.pill,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}
              >
                <Text style={{ color: chip.shared ? Pastels.yellow.text : theme.tintText, fontSize: 13, fontWeight: "700" }}>
                  {chip.label}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
        {card.bio ? (
          <Text numberOfLines={2} style={{ color: theme.text, fontSize: 15, lineHeight: 22 }}>
            {card.bio}
          </Text>
        ) : null}
        {card.matchReasons.length ? (
          <Text style={{ color: theme.textSecondary, fontSize: 13, lineHeight: 18 }}>
            {card.matchReasons.slice(0, 2).join(" · ")}
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="link"
          onPress={onProfile}
          style={{ alignItems: "center", alignSelf: "flex-start", flexDirection: "row", gap: 6, minHeight: 44 }}
        >
          <Text style={{ color: theme.primary, fontSize: 14, fontWeight: "800" }}>View full profile</Text>
          <Ionicons color={theme.primary} name="arrow-forward" size={16} />
        </Pressable>
        <View style={{ alignItems: "flex-start", flexDirection: "row", gap: 10 }}>
          <Ionicons color={theme.tintText} name="lock-closed" size={15} style={{ marginTop: 2 }} />
          <Text style={{ color: theme.textSecondary, flex: 1, fontSize: 12.5, lineHeight: 18 }}>{privacyLine(card)}</Text>
        </View>
        {children}
      </View>
    </View>
  );
}

function ActionBar({
  card,
  busy,
  onChat,
  onIgnore,
  onMiddle,
  onNext,
}: {
  card: DiscoverCard;
  busy: { meet: boolean; ignore: boolean; middle: boolean };
  onChat: () => void;
  onIgnore: () => void;
  onMiddle: () => void;
  onNext: () => void;
}) {
  const theme = useTheme();
  const middle = middleAction(card);
  const middleIcon: Record<typeof middle.kind, IconName> = {
    like: "heart-outline",
    liked: "heart",
    connect: "person-add-outline",
    sent: "time-outline",
    review: "checkmark",
  };
  return (
    <View
      style={{
        alignSelf: "stretch",
        backgroundColor: theme.background,
        borderTopColor: theme.border,
        borderTopWidth: 1,
        paddingBottom: 10,
        paddingHorizontal: 16,
        paddingTop: 10,
      }}
    >
      <View style={{ alignSelf: "center", gap: 8, maxWidth: 680, width: "100%" }}>
        <PrimaryButton
          icon="chatbubble-ellipses"
          label={busy.meet ? "Opening twin chat…" : "Chat with their AI twin"}
          disabled={!card.twinAvailable || busy.meet}
          onPress={onChat}
        />
        <View style={{ flexDirection: "row", gap: 8 }}>
          <SecondaryButton icon="close" label="Ignore" disabled={busy.ignore} muted onPress={onIgnore} />
          <SecondaryButton
            icon={middleIcon[middle.kind]}
            label={middle.label}
            disabled={middle.disabled || busy.middle}
            accent={middle.kind === "like" ? theme.accent : middle.kind === "connect" ? theme.primary : undefined}
            onPress={onMiddle}
          />
          <SecondaryButton icon="arrow-forward" label="Next" trailing onPress={onNext} />
        </View>
      </View>
    </View>
  );
}

function SecondaryButton({
  icon,
  label,
  onPress,
  disabled,
  muted,
  accent,
  trailing,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  muted?: boolean;
  accent?: string;
  trailing?: boolean;
}) {
  const theme = useTheme();
  const color = disabled ? theme.textSecondary : (accent ?? (muted ? theme.textSecondary : theme.text));
  const iconNode = <Ionicons color={color} name={icon} size={16} />;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={{
        alignItems: "center",
        backgroundColor: disabled ? theme.tint : "transparent",
        borderColor: theme.border,
        borderRadius: Radius.pill,
        borderWidth: 1,
        flex: 1,
        flexDirection: "row",
        gap: 6,
        justifyContent: "center",
        minHeight: 48,
        paddingHorizontal: 8,
      }}
    >
      {trailing ? null : iconNode}
      <Text numberOfLines={1} style={{ color, fontSize: 14, fontWeight: "800" }}>
        {label}
      </Text>
      {trailing ? iconNode : null}
    </Pressable>
  );
}

function SmallLink({ label, color, onPress }: { label: string; color: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{ justifyContent: "center", minHeight: 44, paddingHorizontal: 8 }}
    >
      <Text style={{ color, fontSize: 13, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}
