import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "@/components/app-text";
import { Monogram } from "@/components/character-ui";
import { CopyButton } from "@/components/copy-button";
import { Thinking } from "@/components/thinking";
import { EmptyState } from "@/components/premium-ui";
import { Composer } from "@/components/private-twin-chat";
import { Radius } from "@/constants/theme";
import { useCharacter } from "@/hooks/use-characters";
import { useKeyboardInset } from "@/hooks/use-keyboard-inset";
import { useTheme } from "@/hooks/use-theme";
import { characterChatNote, splitSources, type CharacterLine } from "@/lib/characters";
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
  // Starter cards: two columns, one on narrow phones.
  const oneColumn = useWindowDimensions().width < 360;

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
        contentContainerStyle={{ alignSelf: "center", flexGrow: 1, gap: 18, maxWidth: 720, padding: 16, width: "100%" }}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}
      >
        {history.isLoading ? (
          <ActivityIndicator color={theme.primary} style={{ marginTop: 32 }} />
        ) : lines.length === 0 ? (
          <View style={{ alignItems: "center", flex: 1, gap: 12, justifyContent: "center", paddingVertical: 24 }}>
            <Monogram character={character} size={64} />
            <Text heading accessibilityRole="header" style={{ color: theme.text, fontSize: 28, fontWeight: "800", letterSpacing: -0.8, textAlign: "center" }}>
              {`I’m ${character.name}. What’s on your mind?`}
            </Text>
            <Text style={{ color: theme.textSecondary, fontSize: 15, lineHeight: 22, maxWidth: 420, textAlign: "center" }}>
              {characterChatNote(character)}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12, maxWidth: 520, width: "100%" }}>
              {character.starters.map((starter) => (
                <Pressable
                  key={starter}
                  accessibilityRole="button"
                  disabled={!ready || talk.isPending}
                  onPress={() => send(starter)}
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? theme.tint : theme.backgroundElement,
                    borderColor: theme.border,
                    borderRadius: Radius.md,
                    borderWidth: 1,
                    flexBasis: oneColumn ? "100%" : "47%",
                    flexGrow: 1,
                    justifyContent: "center",
                    minHeight: 64,
                    opacity: !ready || talk.isPending ? 0.5 : 1,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                  })}
                >
                  <Text style={{ color: theme.text, fontSize: 14, fontWeight: "700", lineHeight: 19 }}>{starter}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          lines.map((line) =>
            line.role === "character" ? (
              // Replies: plain text, full width, no bubble or name; paragraphs kept; Copy underneath.
              <View key={line.id} style={{ gap: 4 }}>
                <ReplyText text={line.text} />
                <CopyButton text={line.text} />
              </View>
            ) : (
              <View key={line.id} style={{ alignItems: "flex-end", alignSelf: "flex-end", maxWidth: "88%" }}>
                <Text
                  content
                  selectable
                  style={{ backgroundColor: theme.tint, borderRadius: Radius.bubble, color: theme.text, fontSize: 15, lineHeight: 22, overflow: "hidden", paddingHorizontal: 16, paddingVertical: 10 }}
                >
                  {line.text}
                </Text>
                {line.failed ? (
                  <View style={{ alignItems: "center", flexDirection: "row", gap: 4 }}>
                    <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Not sent</Text>
                    <Pressable accessibilityRole="button" disabled={talk.isPending} onPress={() => send(line.text)} style={{ justifyContent: "center", minHeight: 44, paddingHorizontal: 8 }}>
                      <Text style={{ color: theme.primary, fontSize: 13, fontWeight: "800" }}>Retry</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ),
          )
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

// A reply. When the News Twin added a "Sources:" list, it shows as small numbered links.
function ReplyText({ text }: { text: string }) {
  const theme = useTheme();
  const { body, sources } = splitSources(text);
  return (
    <View style={{ gap: 10 }}>
      <Text content selectable style={{ color: theme.text, fontSize: 15.5, lineHeight: 25 }}>
        {body}
      </Text>
      {sources.length ? (
        <View style={{ borderLeftColor: theme.border, borderLeftWidth: 2, gap: 2, paddingLeft: 12 }}>
          {sources.map((source, index) => (
            <Pressable
              key={source.url}
              accessibilityHint={source.host}
              accessibilityRole="link"
              onPress={() => void WebBrowser.openBrowserAsync(source.url)}
              style={{ alignItems: "center", flexDirection: "row", gap: 6, minHeight: 32 }}
            >
              <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{index + 1}.</Text>
              <Text content numberOfLines={1} style={{ color: theme.primary, flexShrink: 1, fontSize: 12 }}>
                {source.label}
              </Text>
              <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{source.host}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
