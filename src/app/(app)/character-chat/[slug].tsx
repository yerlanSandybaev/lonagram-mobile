import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "@/components/app-text";
import { Monogram } from "@/components/character-ui";
import { EmptyState } from "@/components/premium-ui";
import { Composer } from "@/components/private-twin-chat";
import { Radius } from "@/constants/theme";
import { useKeyboardInset } from "@/hooks/use-keyboard-inset";
import { useTheme } from "@/hooks/use-theme";
import { findCharacter, type CharacterLine } from "@/lib/characters";
import { characterChatApi } from "@/lib/lonagram";
import { uuidv4 } from "@/lib/uuid";
import { useAuth } from "@/providers/auth-provider";

// Chat with a Character Twin, in the same minimal layout as a Twin chat.
// Each chat is private to its writer and saved on the server (once the operations exist).
export default function CharacterChatScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardInset();
  const cache = useQueryClient();
  const { session } = useAuth();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const character = findCharacter(slug);
  const api = characterChatApi;
  const key = ["character-chat", session!.user.id, slug];
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<CharacterLine | null>(null);
  const scroll = useRef<ScrollView>(null);

  const history = useQuery({
    queryKey: key,
    queryFn: () => api!.history(slug),
    enabled: Boolean(api && character),
  });
  const talk = useMutation({
    mutationFn: (text: string) => api!.talk(slug, text, uuidv4()),
    onMutate: (text) => setPending({ id: "pending", role: "you", text }),
    onSuccess: (reply, text) => {
      cache.setQueryData<CharacterLine[]>(key, (lines = []) => [...lines, { id: `${reply.id}:you`, role: "you", text }, reply]);
      setDraft("");
    },
    onSettled: () => setPending(null),
  });
  const clear = useMutation({
    mutationFn: () => api!.clear(slug),
    onSuccess: () => cache.setQueryData<CharacterLine[]>(key, []),
  });

  if (!character)
    return (
      <View style={{ backgroundColor: theme.background, flex: 1, padding: 24 }}>
        <Stack.Screen options={{ headerShown: false }} />
        <EmptyState icon="person-outline" title="Character not found" body="This Character Twin is not in the app yet." action="Back" onPress={() => router.back()} />
      </View>
    );

  const lines = [...(history.data ?? []), ...(pending ? [pending] : [])];
  const ready = api !== null;
  const send = (text: string) => {
    const body = text.trim();
    if (!ready || !body || talk.isPending) return;
    talk.mutate(body);
  };
  function openMenu() {
    Alert.alert(character!.name, undefined, [
      { text: `About ${character!.name}`, onPress: () => router.push({ pathname: "/character/[slug]" as never, params: { slug: character!.slug } } as never) },
      ...(ready && lines.length
        ? [
            {
              text: "Clear chat",
              style: "destructive" as const,
              onPress: () =>
                Alert.alert("Clear this chat?", "This deletes your messages with " + character!.name + ".", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Clear chat", style: "destructive", onPress: () => clear.mutate() },
                ]),
            },
          ]
        : []),
      { text: "Cancel", style: "cancel" as const },
    ]);
  }

  const error = history.error ?? talk.error ?? clear.error;
  return (
    <View style={{ backgroundColor: theme.background, flex: 1, paddingBottom: keyboard > 0 ? keyboard : 0 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ alignItems: "center", flexDirection: "row", gap: 10, paddingBottom: 8, paddingHorizontal: 8, paddingTop: Math.max(insets.top, 12) }}>
        <Pressable accessibilityLabel="Back" accessibilityRole="button" onPress={() => router.back()} style={{ alignItems: "center", height: 44, justifyContent: "center", width: 44 }}>
          <Ionicons color={theme.text} name="chevron-back" size={24} />
        </Pressable>
        <Monogram character={character} size={36} />
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ color: theme.text, fontSize: 16, fontWeight: "800" }}>
            {character.name}
          </Text>
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Character Twin · {character.lifetime}</Text>
        </View>
        <Pressable accessibilityLabel="More" accessibilityRole="button" onPress={openMenu} style={{ alignItems: "center", height: 44, justifyContent: "center", width: 44 }}>
          <Ionicons color={theme.text} name="ellipsis-horizontal" size={22} />
        </Pressable>
      </View>

      <ScrollView
        ref={scroll}
        contentContainerStyle={{ alignSelf: "center", flexGrow: 1, gap: 6, maxWidth: 680, padding: 16, width: "100%" }}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}
      >
        {lines.length === 0 ? (
          <View style={{ alignItems: "center", flex: 1, gap: 16, justifyContent: "center", paddingVertical: 24 }}>
            <Monogram character={character} size={64} />
            <Text style={{ color: theme.textSecondary, fontSize: 15, lineHeight: 22, maxWidth: 420, textAlign: "center" }}>
              Ask {character.name} anything. This is a Twin, an AI portrayal built from the historical record, so it can be wrong.
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              {character.starters.map((starter) => (
                <Pressable
                  key={starter}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !ready }}
                  disabled={!ready || talk.isPending}
                  onPress={() => send(starter)}
                  style={{ borderColor: theme.border, borderRadius: Radius.pill, borderWidth: 1, justifyContent: "center", minHeight: 40, opacity: ready ? 1 : 0.55, paddingHorizontal: 14 }}
                >
                  <Text style={{ color: theme.text, fontSize: 14, fontWeight: "700" }}>{starter}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          lines.map((line, index) => {
            const mine = line.role === "you";
            const showName = !mine && (index === 0 || lines[index - 1].role !== line.role);
            return (
              <View key={line.id} style={{ alignSelf: mine ? "flex-end" : "flex-start", marginTop: showName ? 10 : 0, maxWidth: "86%" }}>
                {showName ? <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 4 }}>{character.name}</Text> : null}
                <Text
                  selectable
                  style={
                    mine
                      ? { backgroundColor: theme.text, borderRadius: Radius.bubble, color: theme.background, fontSize: 15, lineHeight: 22, overflow: "hidden", paddingHorizontal: 16, paddingVertical: 11 }
                      : { color: theme.text, fontSize: 15, lineHeight: 24 }
                  }
                >
                  {line.text}
                </Text>
              </View>
            );
          })
        )}
        {talk.isPending ? <Thinking name={character.name} /> : null}
      </ScrollView>

      {error ? (
        <Text accessibilityRole="alert" style={{ color: theme.danger, fontSize: 13, paddingHorizontal: 16 }}>
          {error.message}
        </Text>
      ) : null}
      {ready ? null : (
        <Text style={{ color: theme.textSecondary, fontSize: 13, paddingHorizontal: 16, textAlign: "center" }}>Coming soon to the app</Text>
      )}
      <Composer
        value={draft}
        onChange={setDraft}
        placeholder={`Message ${character.name}`}
        disabled={!ready || talk.isPending}
        canSend={ready && !talk.isPending && draft.trim().length > 0}
        onSend={() => send(draft)}
        bottomPad={keyboard > 0 ? 8 : Math.max(insets.bottom, 0) + 8}
      />
    </View>
  );
}

function Thinking({ name }: { name: string }) {
  const theme = useTheme();
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setStep((value) => (value + 1) % 3), 400);
    return () => clearInterval(timer);
  }, []);
  return (
    <View accessibilityLabel={`${name} is thinking`} accessibilityLiveRegion="polite" style={{ alignItems: "center", flexDirection: "row", gap: 8, marginTop: 10 }}>
      <Text style={{ color: theme.textSecondary, fontSize: 14 }}>{name} is thinking</Text>
      <View style={{ flexDirection: "row", gap: 4 }}>
        {[0, 1, 2].map((dot) => (
          <View key={dot} style={{ backgroundColor: theme.textSecondary, borderRadius: 3, height: 6, opacity: dot === step ? 1 : 0.35, width: 6 }} />
        ))}
      </View>
    </View>
  );
}
