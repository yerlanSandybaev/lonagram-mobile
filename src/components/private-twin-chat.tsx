import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  WELCOME,
  applyReply,
  applyUndo,
  beginSend,
  chipsFor,
  failSend,
  isMissingOperation,
  questionPrompt,
  reconcileMemories,
  type ChatLine,
  type ChatState,
  type TwinMemory,
  type VisitorQuestion,
} from "@/lib/private-twin";
import { uuidv4 } from "@/lib/uuid";
import { useAuth } from "@/providers/auth-provider";
import { useMessageDraft } from "@/providers/draft-provider";

// The owner's private chat with their own Twin. Used on Home and in the last onboarding step.
export function PrivateTwinChat({
  greeting = WELCOME,
  showQuestions = true,
  showMemoriesLink = true,
  placeholder = "Message your Twin",
  bottomInset = true,
}: {
  greeting?: string;
  showQuestions?: boolean;
  showMemoriesLink?: boolean;
  placeholder?: string;
  bottomInset?: boolean;
}) {
  const theme = useTheme();
  const router = useRouter();
  const cache = useQueryClient();
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardInset();
  const { session } = useAuth();
  const userId = session!.user.id;
  const memoriesKey = ["twin-memories", userId];
  const draft = useMessageDraft("twin-private");
  const [chat, setChat] = useState<ChatState>(() => ({
    lines: [{ id: "welcome", role: "twin", text: greeting }],
    memories: [],
    history: [],
    attempt: null,
    error: "",
  }));
  const chatRef = useRef(chat);
  const [busy, setBusy] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const lock = useRef(false);
  const scroll = useRef<ScrollView>(null);
  const commit = (next: ChatState) => {
    chatRef.current = next;
    setChat(next);
  };

  // Questions visitors asked that the Twin could not answer. They come first.
  const questions = useQuery({
    queryKey: ["twin-questions", userId],
    queryFn: () => privateTwinApi.listQuestions(),
    enabled: showQuestions,
    retry: (count, error) => !isMissingOperation(error) && count < 2,
  });

  useFocusEffect(
    useCallback(() => {
      const cached = cache.getQueryData<TwinMemory[]>(memoriesKey);
      if (cached) commit(reconcileMemories(chatRef.current, cached));
      if (showQuestions) void cache.invalidateQueries({ queryKey: ["twin-questions", userId] });
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
      commit(failSend(chatRef.current, begun.requestId, error instanceof Error ? error.message : "Your Twin could not reply."));
      draft.edit(text);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  async function undo(line: ChatLine, memory: TwinMemory) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      await privateTwinApi.updateMemory(memory, "delete");
      commit(applyUndo(chatRef.current, line.id, memory));
      void cache.invalidateQueries({ queryKey: memoriesKey });
    } catch {
      commit({ ...chatRef.current, error: "Could not forget that. Please try again." });
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  if (unavailable)
    return (
      <View style={{ backgroundColor: theme.background, flex: 1, padding: 24 }}>
        <EmptyState
          icon="sparkles-outline"
          title="Your Twin chat is almost here"
          body="This needs the latest Lonagram server. You can keep talking to your Twin on lonagram.com until then."
          action="Try again"
          onPress={() => setUnavailable(false)}
        />
      </View>
    );

  const canSend = !busy && draft.text.trim().length > 0;
  const bottomPad = keyboard > 0 || !bottomInset ? 8 : Math.max(insets.bottom, 0) + 8;
  const waiting = questions.data ?? [];
  return (
    <View style={{ backgroundColor: theme.background, flex: 1, paddingBottom: keyboard > 0 ? keyboard : 0 }}>
      <ScrollView
        ref={scroll}
        contentContainerStyle={{ alignSelf: "center", gap: 18, maxWidth: 680, padding: 16, width: "100%" }}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}
      >
        {showMemoriesLink ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/twin-memories" as never)}
            style={{ alignItems: "center", alignSelf: "flex-end", flexDirection: "row", gap: 6, minHeight: 44 }}
          >
            <Ionicons color={theme.primary} name="albums-outline" size={16} />
            <Text style={{ color: theme.primary, fontSize: 13, fontWeight: "800" }}>Your Twin's memories</Text>
          </Pressable>
        ) : null}
        {waiting[0] ? <QuestionCard question={waiting[0]} more={waiting.length - 1} /> : null}
        {chat.lines.map((line, index) => (
          <Message
            key={line.id}
            line={line}
            showName={index === 0 || chat.lines[index - 1].role !== line.role}
            memories={chat.memories}
            busy={busy}
            onUndo={undo}
            onRetry={() => void send(line.text)}
          />
        ))}
        {busy ? (
          <View accessibilityLiveRegion="polite" style={{ alignItems: "center", flexDirection: "row", gap: 8 }}>
            <ActivityIndicator color={theme.primary} size="small" />
            <Text style={{ color: theme.textSecondary, fontSize: 14 }}>Twin is typing…</Text>
          </View>
        ) : null}
      </ScrollView>

      {chat.error ? (
        <Text accessibilityRole="alert" style={{ color: theme.danger, fontSize: 14, lineHeight: 20, marginHorizontal: 16 }}>
          {chat.error}
        </Text>
      ) : null}

      <Composer
        value={draft.text}
        onChange={draft.edit}
        placeholder={placeholder}
        disabled={busy}
        canSend={canSend}
        onSend={() => void send(draft.text)}
        bottomPad={bottomPad}
      />
    </View>
  );
}

function QuestionCard({ question, more }: { question: VisitorQuestion; more: number }) {
  const theme = useTheme();
  const cache = useQueryClient();
  const { session } = useAuth();
  const [answer, setAnswer] = useState("");
  const [state, setState] = useState<{ pending: boolean; error: string; done: string }>({ pending: false, error: "", done: "" });
  async function submit(text: string | null) {
    if (state.pending) return;
    setState({ pending: true, error: "", done: "" });
    try {
      await privateTwinApi.answerQuestion(question, text);
      setState({ pending: false, error: "", done: text ? `Sent to ${question.visitorName} in your words.` : "" });
      setAnswer("");
      void cache.invalidateQueries({ queryKey: ["twin-questions", session!.user.id] });
      if (text) void cache.invalidateQueries({ queryKey: ["twin-memories", session!.user.id] });
    } catch (error) {
      setState({ pending: false, error: error instanceof Error ? error.message : "Could not send. Try again.", done: "" });
    }
  }
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Your Twin</Text>
      <Text style={{ color: theme.text, fontSize: 15, lineHeight: 23 }}>{questionPrompt(question)}</Text>
      <TextInput
        accessibilityLabel={`Answer ${question.visitorName}`}
        editable={!state.pending}
        maxLength={2000}
        multiline
        onChangeText={setAnswer}
        placeholder="Your answer, in your own words"
        placeholderTextColor={theme.textSecondary}
        style={{ borderColor: theme.border, borderRadius: Radius.md, borderWidth: 1, color: theme.text, fontSize: 15, minHeight: 48, paddingHorizontal: 14, paddingVertical: 12 }}
        value={answer}
      />
      <View style={{ alignItems: "center", flexDirection: "row", gap: 12 }}>
        <Pressable
          accessibilityRole="button"
          disabled={state.pending || !answer.trim()}
          onPress={() => void submit(answer)}
          style={{ alignItems: "center", backgroundColor: answer.trim() ? theme.primary : theme.tint, borderRadius: Radius.pill, justifyContent: "center", minHeight: 44, paddingHorizontal: 18 }}
        >
          <Text style={{ color: answer.trim() ? theme.onPrimary : theme.textSecondary, fontSize: 14, fontWeight: "800" }}>
            {state.pending ? "Sending…" : "Send answer"}
          </Text>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={state.pending} onPress={() => void submit(null)} style={{ justifyContent: "center", minHeight: 44, paddingHorizontal: 8 }}>
          <Text style={{ color: theme.textSecondary, fontSize: 14, fontWeight: "700" }}>Skip</Text>
        </Pressable>
        {more > 0 ? <Text style={{ color: theme.textSecondary, fontSize: 12 }}>+{more} more</Text> : null}
      </View>
      {state.error ? <Text accessibilityRole="alert" style={{ color: theme.danger, fontSize: 13 }}>{state.error}</Text> : null}
      {state.done ? <Text style={{ color: theme.textSecondary, fontSize: 13 }}>{state.done}</Text> : null}
    </View>
  );
}

export function Composer({
  value,
  onChange,
  placeholder,
  disabled,
  canSend,
  onSend,
  bottomPad,
}: {
  value: string;
  onChange: (text: string) => void;
  placeholder: string;
  disabled: boolean;
  canSend: boolean;
  onSend: () => void;
  bottomPad: number;
}) {
  const theme = useTheme();
  return (
    <View style={{ alignItems: "flex-end", flexDirection: "row", gap: 10, paddingBottom: bottomPad, paddingHorizontal: 16, paddingTop: 10 }}>
      <TextInput
        accessibilityLabel={placeholder}
        editable={!disabled}
        maxLength={1000}
        multiline
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        style={{
          borderColor: theme.border,
          borderRadius: Radius.bubble,
          borderWidth: 1,
          color: theme.text,
          flex: 1,
          fontSize: 16,
          maxHeight: 120,
          minHeight: 48,
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}
        value={value}
      />
      <Pressable
        accessibilityLabel="Send message"
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSend, busy: disabled }}
        disabled={!canSend}
        onPress={onSend}
        style={{ alignItems: "center", backgroundColor: canSend ? theme.primary : theme.tint, borderRadius: 24, height: 48, justifyContent: "center", width: 48 }}
      >
        <Ionicons color={canSend ? theme.onPrimary : theme.textSecondary} name="arrow-up" size={22} />
      </Pressable>
    </View>
  );
}

function Message({
  line,
  showName,
  memories,
  busy,
  onUndo,
  onRetry,
}: {
  line: ChatLine;
  showName: boolean;
  memories: TwinMemory[];
  busy: boolean;
  onUndo: (line: ChatLine, memory: TwinMemory) => void;
  onRetry: () => void;
}) {
  const theme = useTheme();
  const mine = line.role === "you";
  return (
    <View style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "88%" }}>
      {showName && !mine ? <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 4 }}>Your Twin</Text> : null}
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
      {line.status === "sending" ? <Meta text="Sending…" right={mine} /> : null}
      {line.status === "failed" ? (
        <View style={{ alignItems: "center", alignSelf: "flex-end", flexDirection: "row", gap: 4 }}>
          <Meta text="Not sent" right />
          <Pressable accessibilityRole="button" disabled={busy} onPress={onRetry} style={{ justifyContent: "center", minHeight: 44, paddingHorizontal: 8 }}>
            <Text style={{ color: theme.primary, fontSize: 13, fontWeight: "800" }}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        chipsFor(line, memories).map((chip) => {
          if (chip.kind === "forgotten") return <Meta key={`f:${chip.text}`} text={`Forgotten: ${chip.text}`} right={mine} />;
          if (chip.kind === "shared") return <Meta key={chip.memory.id} text="Allowed in visitor replies" right={mine} />;
          if (chip.kind === "suggested") return <Meta key={chip.memory.id} text="Suggested memory · review in Your Twin's memories" right={mine} />;
          return (
            <View key={chip.memory.id} style={{ alignItems: "center", alignSelf: mine ? "flex-end" : "flex-start", flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "flex-end", marginTop: 4 }}>
              <Ionicons color={theme.success} name="checkmark" size={14} />
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
                style={{ justifyContent: "center", minHeight: 44, paddingHorizontal: 6 }}
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

function Meta({ text, right }: { text: string; right?: boolean }) {
  const theme = useTheme();
  return <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 4, textAlign: right ? "right" : "left" }}>{text}</Text>;
}
