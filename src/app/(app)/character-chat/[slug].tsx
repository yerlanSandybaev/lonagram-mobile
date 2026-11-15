import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "@/components/app-text";
import { Monogram } from "@/components/character-ui";
import { Thinking } from "@/components/thinking";
import { EmptyState } from "@/components/premium-ui";
import { Composer } from "@/components/private-twin-chat";
import { Radius } from "@/constants/theme";
import { useCharacter } from "@/hooks/use-characters";
import { useKeyboardInset } from "@/hooks/use-keyboard-inset";
import { useTheme } from "@/hooks/use-theme";
import type { CharacterLine } from "@/lib/characters";
import { characterApi } from "@/lib/lonagram";
import { uuidv4 } from "@/lib/uuid";
import { useAuth } from "@/providers/auth-provider";

type Attempt = { id: string; text: string; failed: boolean };

// Chat with a Character Twin, in the same minimal layout as a Twin chat.
// Each chat is private to its writer and saved on the server.
export default function CharacterChatScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardInset();
  const cache = useQueryClient();
  const { session } = useAuth();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { character, loading } = useCharacter(slug);
  const key = ["character-chat", session!.user.id, slug];
  const [draft, setDraft] = useState("");
  // The message being sent. A retry of the same text reuses its id, which is also the Idempotency-Key.
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const scroll = useRef<ScrollView>(null);

  const history = useQuery({ queryKey: key, queryFn: () => characterApi.history(slug), enabled: Boolean(character) });
  const talk = useMutation({
    mutationFn: (next: Attempt) => characterApi.send(slug, next.text, next.id),
    onMutate: (next) => setAttempt({ ...next, failed: false }),
    onSuccess: (reply, sent) => {
      cache.setQueryData<CharacterLine[]>(key, (lines = []) => [
        ...lines,
        { id: sent.id, role: "you", text: sent.text },
        { id: reply.id, role: "character", text: reply.text },
      ]);
      setAttempt(null);
    },
    // The message was not saved. Keep it on screen with Retry.
    onError: (_error, sent) => setAttempt({ ...sent, failed: true }),
  });
  const clear = useMutation({
    mutationFn: () => characterApi.clear(slug),
    onSuccess: () => {
      cache.setQueryData<CharacterLine[]>(key, []);
      setAttempt(null);
    },
  });

  if (!character)
    return (
      <View style={{ backgroundColor: theme.background, flex: 1, padding: 24 }}>
        <Stack.Screen options={{ headerShown: false }} />
        {loading ? null : <EmptyState icon="person-outline" title="Character not found" body="This Character Twin is not in the app yet." action="Back" onPress={() => router.back()} />}
      </View>
    );

  const saved = history.data ?? [];
  const lines: (CharacterLine & { failed?: boolean })[] = [...saved, ...(attempt ? [{ id: attempt.id, role: "you" as const, text: attempt.text, failed: attempt.failed }] : [])];
  const ready = !history.isLoading && !history.error;
  function send(text: string) {
    const body = text.trim();
    if (!ready || !body || talk.isPending) return;
    const id = attempt?.failed && attempt.text === body ? attempt.id : uuidv4();
    if (body === draft.trim()) setDraft("");
    talk.mutate({ id, text: body, failed: false });
  }
  function openMenu() {
    const name = character!.name;
    Alert.alert(name, undefined, [
      { text: `About ${name}`, onPress: () => router.push({ pathname: "/character/[slug]" as never, params: { slug: character!.slug } } as never) },
      ...(saved.length
        ? [
            {
              text: "Clear chat",
              style: "destructive" as const,
              onPress: () =>
                Alert.alert("Clear this chat?", `This deletes your messages with ${name}.`, [
                  { text: "Cancel", style: "cancel" },
                  { text: "Clear chat", style: "destructive", onPress: () => clear.mutate() },
                ]),
            },
          ]
        : []),
      { text: "Cancel", style: "cancel" as const },
    ]);
  }

  const error = history.error ?? clear.error ?? (attempt?.failed ? talk.error : null);
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
        {history.isLoading ? (
          <ActivityIndicator color={theme.primary} style={{ marginTop: 32 }} />
        ) : lines.length === 0 ? (
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
                  disabled={!ready || talk.isPending}
                  onPress={() => send(starter)}
                  style={{ borderColor: theme.border, borderRadius: Radius.pill, borderWidth: 1, justifyContent: "center", minHeight: 40, paddingHorizontal: 14 }}
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
                  content
                  selectable
                  style={
                    mine
                      ? { backgroundColor: theme.text, borderRadius: Radius.bubble, color: theme.background, fontSize: 15, lineHeight: 22, overflow: "hidden", paddingHorizontal: 16, paddingVertical: 11 }
                      : { color: theme.text, fontSize: 15, lineHeight: 24 }
                  }
                >
                  {line.text}
                </Text>
                {line.failed ? (
                  <View style={{ alignItems: "center", alignSelf: "flex-end", flexDirection: "row", gap: 4 }}>
                    <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Not sent</Text>
                    <Pressable accessibilityRole="button" disabled={talk.isPending} onPress={() => send(line.text)} style={{ justifyContent: "center", minHeight: 44, paddingHorizontal: 8 }}>
                      <Text style={{ color: theme.primary, fontSize: 13, fontWeight: "800" }}>Retry</Text>
                    </Pressable>
                  </View>
                ) : null}
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
