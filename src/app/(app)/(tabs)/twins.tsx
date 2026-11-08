import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text, TextInput } from "@/components/app-text";
import { EmptyState } from "@/components/premium-ui";
import { Pastels, Radius } from "@/constants/theme";
import { useKeyboardInset } from "@/hooks/use-keyboard-inset";
import { useTheme } from "@/hooks/use-theme";
import { privateTwinApi } from "@/lib/lonagram";
import {
  applyReply,
  applyUndo,
  beginSend,
  chipsFor,
  failSend,
  initialChat,
  isMissingOperation,
  reconcileMemories,
  type ChatLine,
  type ChatState,
  type TwinMemory,
} from "@/lib/private-twin";
import { uuidv4 } from "@/lib/uuid";
import { useAuth } from "@/providers/auth-provider";
import { useMessageDraft } from "@/providers/draft-provider";

export default function PrivateTwinScreen() {
  const theme = useTheme();
  const router = useRouter();
  const cache = useQueryClient();
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardInset();
  const { session } = useAuth();
  const memoriesKey = ["twin-memories", session!.user.id];
  const draft = useMessageDraft("twin-private");
  const [chat, setChat] = useState<ChatState>(initialChat);
  const chatRef = useRef(chat);
  const [busy, setBusy] = useState(false);
  const [forgetting, setForgetting] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const lock = useRef(false);
  const scroll = useRef<ScrollView>(null);
  const commit = (next: ChatState) => {
    chatRef.current = next;
    setChat(next);
  };

  // Chips follow the memories screen: edits or deletes made there reset the short dialogue.
  useFocusEffect(
    useCallback(() => {
      const cached = cache.getQueryData<TwinMemory[]>(memoriesKey);
      if (cached) commit(reconcileMemories(chatRef.current, cached));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cache]),
  );

  async function send(raw: string) {
    const text = raw.trim();
    if (!text || lock.current) return;
    lock.current = true;
    setBusy(true);
    const begun = beginSend(chatRef.current, text, uuidv4());
    commit(begun.state);
    draft.edit("");
    try {
      const reply = await privateTwinApi.talk({
        cue: text,
        requestId: begun.requestId,
        history: begun.history,
        targetMemoryId: chatRef.current.targetMemoryId,
      });
      commit(applyReply(chatRef.current, begun.requestId, text, reply));
      if (reply.memories?.length || reply.memory || reply.forgottenId) void cache.invalidateQueries({ queryKey: memoriesKey });
    } catch (error) {
      if (isMissingOperation(error)) setUnavailable(true);
      const message = error instanceof Error ? error.message : "Your Twin could not reply.";
      commit(failSend(chatRef.current, begun.requestId, message));
      draft.edit(text);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  async function undo(line: ChatLine, memory: TwinMemory) {
    if (lock.current) return;
    lock.current = true;
    setForgetting(true);
    try {
      await privateTwinApi.updateMemory(memory, "delete");
      commit(applyUndo(chatRef.current, line.id, memory));
      void cache.invalidateQueries({ queryKey: memoriesKey });
    } catch {
      commit({ ...chatRef.current, error: "Could not forget that. Please try again." });
    } finally {
      lock.current = false;
      setForgetting(false);
    }
  }

  if (unavailable)
    return (
      <View style={{ backgroundColor: theme.background, flex: 1, padding: 24 }}>
        <EmptyState
          icon="sparkles-outline"
          title="Your private Twin chat is almost here"
          body="This needs the latest Lonagram server. You can keep talking to your Twin on lonagram.com until then."
          action="Try again"
          onPress={() => setUnavailable(false)}
        />
      </View>
    );

  const canSend = !busy && !forgetting && draft.text.trim().length > 0;
  const bottomPad = keyboard > 0 ? 8 : Math.max(insets.bottom, 0) + 8;
  return (
    <View style={{ backgroundColor: theme.background, flex: 1, paddingBottom: keyboard > 0 ? keyboard : 0 }}>
      <View
        style={{
          alignItems: "center",
          borderBottomColor: theme.border,
          borderBottomWidth: 1,
          flexDirection: "row",
          gap: 12,
          paddingHorizontal: 16,
          paddingVertical: 10,
        }}
      >
        <View style={{ alignItems: "center", backgroundColor: theme.tint, borderRadius: 22, height: 44, justifyContent: "center", width: 44 }}>
          <Ionicons color={theme.tintText} name="sparkles" size={20} />
        </View>
        <View style={{ flex: 1 }}>
          <Text heading accessibilityRole="header" style={{ color: theme.text, fontSize: 18, fontWeight: "800" }}>
            You → Your Twin
          </Text>
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Private chat</Text>
        </View>
        <HeaderChip icon="albums-outline" label="Memories" onPress={() => router.push("/twin-memories" as never)} />
      </View>

      <ScrollView
        ref={scroll}
        contentContainerStyle={{ alignSelf: "center", gap: 16, maxWidth: 680, padding: 16, width: "100%" }}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}
      >
        <Text style={{ color: theme.textSecondary, fontSize: 12.5, lineHeight: 18 }}>
          Talk freely. Useful details are remembered privately; you choose what others can hear. This chat is not
          saved between visits, but the facts your Twin remembers are.
        </Text>
        {chat.lines.map((line) => (
          <Message key={line.id} line={line} memories={chat.memories} busy={busy || forgetting} onUndo={undo} onRetry={() => void send(line.text)} />
        ))}
        {busy ? (
          <View accessibilityLiveRegion="polite" style={{ alignItems: "center", flexDirection: "row", gap: 8 }}>
            <ActivityIndicator color={theme.primary} size="small" />
            <Text style={{ color: theme.textSecondary, fontSize: 14 }}>Your Twin is typing…</Text>
          </View>
        ) : null}
      </ScrollView>

      {chat.error ? (
        <Text
          accessibilityRole="alert"
          style={{
            backgroundColor: theme.tint,
            borderRadius: Radius.md,
            color: theme.danger,
            fontSize: 14,
            lineHeight: 20,
            marginHorizontal: 16,
            overflow: "hidden",
            padding: 12,
          }}
        >
          {chat.error}
        </Text>
      ) : null}

      <View style={{ alignItems: "flex-end", flexDirection: "row", gap: 10, paddingBottom: bottomPad, paddingHorizontal: 16, paddingTop: 10 }}>
        <TextInput
          accessibilityLabel="Message your Twin"
          editable={!busy}
          maxLength={1000}
          multiline
          onChangeText={draft.edit}
          placeholder="Message your Twin"
          placeholderTextColor={theme.textSecondary}
          style={{
            backgroundColor: theme.backgroundElement,
            borderColor: theme.border,
            borderRadius: 24,
            borderWidth: 1,
            color: theme.text,
            flex: 1,
            fontSize: 16,
            maxHeight: 120,
            minHeight: 48,
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}
          value={draft.text}
        />
        <Pressable
          accessibilityLabel="Send message"
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSend, busy }}
          disabled={!canSend}
          onPress={() => void send(draft.text)}
          style={{
            alignItems: "center",
            backgroundColor: canSend ? theme.primary : theme.tint,
            borderRadius: 26,
            height: 52,
            justifyContent: "center",
            width: 52,
          }}
        >
          <Ionicons color={canSend ? theme.onPrimary : theme.textSecondary} name="arrow-up" size={22} />
        </Pressable>
      </View>
    </View>
  );
}

function Message({
  line,
  memories,
  busy,
  onUndo,
  onRetry,
}: {
  line: ChatLine;
  memories: TwinMemory[];
  busy: boolean;
  onUndo: (line: ChatLine, memory: TwinMemory) => void;
  onRetry: () => void;
}) {
  const theme = useTheme();
  const mine = line.role === "you";
  return (
    <View style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "92%" }}>
      <Text style={{ color: theme.textSecondary, fontSize: 11, marginBottom: 4, textAlign: mine ? "right" : "left" }}>
        {mine ? "You" : "Your Twin"}
      </Text>
      <Text
        selectable
        style={
          mine
            ? { backgroundColor: theme.primary, borderRadius: 24, color: theme.onPrimary, fontSize: 15, lineHeight: 22, overflow: "hidden", paddingHorizontal: 16, paddingVertical: 12 }
            : { color: theme.text, fontSize: 15, lineHeight: 24, paddingHorizontal: 2 }
        }
      >
        {line.text}
      </Text>
      {line.status === "sending" ? <Meta text="Sending…" /> : null}
      {line.status === "failed" ? (
        <View style={{ alignItems: "center", flexDirection: "row", gap: 4 }}>
          <Meta text="Couldn't finish" />
          <Pressable accessibilityRole="button" disabled={busy} onPress={onRetry} style={{ justifyContent: "center", minHeight: 44, paddingHorizontal: 8 }}>
            <Text style={{ color: theme.primary, fontSize: 13, fontWeight: "800" }}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        chipsFor(line, memories).map((chip) => {
          if (chip.kind === "forgotten") return <Meta key={`f:${chip.text}`} text={`Forgotten: ${chip.text}`} />;
          if (chip.kind === "shared") return <Meta key={chip.memory.id} text="Allowed in visitor replies" />;
          if (chip.kind === "suggested") return <Meta key={chip.memory.id} text="Suggested memory · review in Memories" />;
          return (
            <View key={chip.memory.id} style={{ alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
              <Ionicons color={Pastels.green.text} name="checkmark-circle" size={16} />
              <Text style={{ color: theme.textSecondary, flexShrink: 1, fontSize: 12.5 }}>
                Remembered: <Text style={{ color: theme.text, fontWeight: "700" }}>{chip.memory.response}</Text>
              </Text>
              {chip.sensitive ? (
                <View style={{ backgroundColor: Pastels.yellow.bg, borderRadius: Radius.pill, paddingHorizontal: 8, paddingVertical: 2 }}>
                  <Text style={{ color: Pastels.yellow.text, fontSize: 11, fontWeight: "800" }}>Sensitive · stays private</Text>
                </View>
              ) : null}
              <Pressable
                accessibilityLabel={`Forget: ${chip.memory.response}`}
                accessibilityRole="button"
                disabled={busy}
                onPress={() => onUndo(line, chip.memory)}
                style={{ justifyContent: "center", minHeight: 44, paddingHorizontal: 8 }}
              >
                <Text style={{ color: theme.primary, fontSize: 13, fontWeight: "800" }}>Undo</Text>
              </Pressable>
            </View>
          );
        })
      )}
    </View>
  );
}

function Meta({ text }: { text: string }) {
  const theme = useTheme();
  return <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 4 }}>{text}</Text>;
}

function HeaderChip({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{ alignItems: "center", backgroundColor: theme.tint, borderRadius: Radius.pill, flexDirection: "row", gap: 6, minHeight: 44, paddingHorizontal: 14 }}
    >
      <Ionicons color={theme.tintText} name={icon} size={16} />
      <Text style={{ color: theme.tintText, fontSize: 13, fontWeight: "800" }}>{label}</Text>
    </Pressable>
  );
}
