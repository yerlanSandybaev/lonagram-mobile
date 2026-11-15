import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Share, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text, TextInput } from "@/components/app-text";
import { EmptyState } from "@/components/premium-ui";
import { Thinking } from "@/components/thinking";
import { Pastels, Radius } from "@/constants/theme";
import { useKeyboardInset } from "@/hooks/use-keyboard-inset";
import { useTheme } from "@/hooks/use-theme";
import { publicTwinUrl } from "@/lib/account";
import { loadMyBundle, privateTwinApi } from "@/lib/lonagram";
import {
  appendLines,
  applyReply,
  applyUndo,
  applyVisibility,
  beginSend,
  chipsFor,
  failSend,
  initialChat,
  isMissingOperation,
  questionPrompt,
  reconcileMemories,
  withHistory,
  type ChatLine,
  type ChatState,
  type TwinMemory,
  type VisitorQuestion,
} from "@/lib/private-twin";
import { uuidv4 } from "@/lib/uuid";
import { useAuth } from "@/providers/auth-provider";
import { useMessageDraft } from "@/providers/draft-provider";

export const SUGGESTIONS = [
  { title: "Teach me", detail: "something about you", prompt: "Let me tell you something about myself." },
  { title: "Who talked", detail: "to my Twin this week?", prompt: "Who talked to my Twin this week?" },
  { title: "Ask advice", detail: "on a message to send", prompt: "Help me write a message to someone." },
  { title: "What do you", detail: "know about me?", prompt: "What do you know about me?" },
] as const;

const SAVED_NOTE = "Saved between visits. Forgetting or editing a memory also clears this chat, so the old fact cannot come back.";

// The owner's private chat with their own Twin, in one centred column.
// "home": saved history, the Twin's own check-in question, visitor questions and the welcome screen.
// "onboarding": a greeting, then the three onboarding questions in order.
export function PrivateTwinChat({
  mode = "home",
  greeting,
  placeholder = "Message your Twin",
  bottomInset = true,
}: {
  mode?: "home" | "onboarding";
  greeting?: string;
  placeholder?: string;
  bottomInset?: boolean;
}) {
  const home = mode === "home";
  const theme = useTheme();
  const router = useRouter();
  const cache = useQueryClient();
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardInset();
  const { session } = useAuth();
  const userId = session!.user.id;
  const memoriesKey = ["twin-memories", userId];
  const draft = useMessageDraft("twin-private");
  const [chat, setChat] = useState<ChatState>(() => initialChat(home ? null : (greeting ?? null)));
  const chatRef = useRef(chat);
  const [busy, setBusy] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [copied, setCopied] = useState("");
  const lock = useRef(false);
  const scroll = useRef<ScrollView>(null);
  const commit = (next: ChatState) => {
    chatRef.current = next;
    setChat(next);
  };

  const bundle = useQuery({ queryKey: ["bundle", userId], queryFn: () => loadMyBundle(userId), enabled: home });
  const profile = bundle.data?.profile;
  const firstName = profile?.displayName.trim().split(/\s+/)[0] ?? "";

  // Saved chat first, then the Twin may write first (with its reason). Both are safe to repeat.
  const history = useQuery({
    queryKey: ["twin-private-history", userId],
    queryFn: () => privateTwinApi.history(),
    enabled: home,
    staleTime: Infinity,
    retry: (count, error) => !isMissingOperation(error) && count < 2,
  });
  useEffect(() => {
    if (history.data) commit(withHistory(chatRef.current, history.data));
  }, [history.data]);
  const checkedIn = useRef(false);
  useEffect(() => {
    if (!home || checkedIn.current || history.isLoading) return;
    checkedIn.current = true;
    void privateTwinApi
      .checkIn()
      .then((line) => {
        if (line) commit(appendLines(chatRef.current, [line]));
      })
      .catch(() => undefined);
  }, [home, history.isLoading]);

  // Onboarding: question 0 now, the next one after each answer. null means there is nothing more to ask.
  const nextQuestion = useRef<0 | 1 | 2 | null>(home ? null : 0);
  const askNext = useCallback(async () => {
    const index = nextQuestion.current;
    if (index === null) return;
    nextQuestion.current = null;
    try {
      const line = await privateTwinApi.onboardingQuestion(index);
      if (!line) return;
      commit(appendLines(chatRef.current, [line]));
      if (index < 2) nextQuestion.current = (index + 1) as 1 | 2;
    } catch {
      // Questions are optional; the owner can still just talk.
    }
  }, []);
  useEffect(() => {
    if (!home) void askNext();
  }, [home, askNext]);

  // Questions visitors asked that the Twin could not answer.
  const questions = useQuery({
    queryKey: ["twin-questions", userId],
    queryFn: () => privateTwinApi.listQuestions(),
    enabled: home,
    retry: (count, error) => !isMissingOperation(error) && count < 2,
  });

  useFocusEffect(
    useCallback(() => {
      const cached = cache.getQueryData<TwinMemory[]>(memoriesKey);
      if (cached) commit(reconcileMemories(chatRef.current, cached));
      if (home) void cache.invalidateQueries({ queryKey: ["twin-questions", userId] });
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
      if (!home) void askNext();
    } catch (error) {
      if (isMissingOperation(error)) setUnavailable(true);
      commit(failSend(chatRef.current, begun.requestId, error instanceof Error ? error.message : "Your Twin could not reply."));
      draft.edit(text);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  async function changeMemory(memory: TwinMemory, intent: "share" | "private" | "delete", line?: ChatLine) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      const change = await privateTwinApi.updateMemory(memory, intent);
      if (intent === "delete") commit(applyUndo(chatRef.current, line!.id, memory));
      else commit(applyVisibility(chatRef.current, change.memory ?? { ...memory, visibility: intent === "share" ? "shared" : "private" }));
      void cache.invalidateQueries({ queryKey: memoriesKey });
    } catch (error) {
      const fallback = intent === "delete" ? "Could not forget that. Please try again." : "Could not change that. Please try again.";
      commit({ ...chatRef.current, error: error instanceof Error ? error.message : fallback });
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  async function copy(line: ChatLine) {
    try {
      await Clipboard.setStringAsync(line.text);
      setCopied(line.id);
      setTimeout(() => setCopied((value) => (value === line.id ? "" : value)), 1500);
    } catch {
      // Copy is a convenience; the text stays selectable.
    }
  }

  function openOptions() {
    Alert.alert("Chat options", SAVED_NOTE, [
      { text: "Your Twin's memories", onPress: () => router.push("/twin-memories" as never) },
      { text: "People talking with your Twin", onPress: () => router.push({ pathname: "/twins" as never, params: { filter: "incoming" } } as never) },
      { text: "Cancel", style: "cancel" },
    ]);
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

  const waiting = home ? (questions.data ?? []) : [];
  const canSend = !busy && draft.text.trim().length > 0;
  const bottomPad = keyboard > 0 || !bottomInset ? 8 : Math.max(insets.bottom, 0) + 8;
  const welcome = home && !history.isLoading && chat.lines.length === 0 && waiting.length === 0;
  return (
    <View style={{ backgroundColor: theme.background, flex: 1, paddingBottom: keyboard > 0 ? keyboard : 0 }}>
      {home ? (
        <View style={{ alignItems: "center", alignSelf: "center", flexDirection: "row", maxWidth: 720, paddingHorizontal: 16, width: "100%" }}>
          <Text style={{ color: theme.text, flex: 1, fontSize: 15, fontWeight: "800" }}>Your Twin</Text>
          {profile?.username ? (
            <Pressable
              accessibilityLabel="Share your Twin"
              accessibilityRole="button"
              onPress={() => void Share.share({ message: publicTwinUrl(profile.username), url: publicTwinUrl(profile.username) }).catch(() => undefined)}
              style={{ alignItems: "center", flexDirection: "row", gap: 6, minHeight: 44, paddingHorizontal: 8 }}
            >
              <Ionicons color={theme.text} name="share-outline" size={18} />
              <Text style={{ color: theme.text, fontSize: 14, fontWeight: "700" }}>Share</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <ScrollView
        ref={scroll}
        contentContainerStyle={{ alignSelf: "center", flexGrow: 1, gap: 18, maxWidth: 720, padding: 16, width: "100%" }}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}
      >
        {welcome ? (
          <Welcome firstName={firstName} disabled={busy} onPick={(prompt) => void send(prompt)} />
        ) : (
          chat.lines.map((line) => (
            <Message
              key={line.id}
              line={line}
              memories={chat.memories}
              busy={busy}
              copied={copied === line.id}
              onCopy={() => void copy(line)}
              onMemory={(memory, intent) => void changeMemory(memory, intent, line)}
              onRetry={() => void send(line.text)}
            />
          ))
        )}
        {busy ? <Thinking name="Your Twin" /> : null}
        {waiting.length ? (
          <View style={{ gap: 18, marginTop: 8 }}>
            <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: "800", letterSpacing: 0.7, textTransform: "uppercase" }}>
              {waiting.length === 1 ? "Waiting for you" : `${waiting.length} questions waiting for you`}
            </Text>
            {waiting.map((question) => (
              <QuestionItem key={question.id} question={question} />
            ))}
          </View>
        ) : null}
      </ScrollView>

      {chat.error ? (
        <Text accessibilityRole="alert" style={{ alignSelf: "center", color: theme.danger, fontSize: 14, lineHeight: 20, maxWidth: 720, paddingHorizontal: 16, width: "100%" }}>
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
        onOptions={home ? openOptions : undefined}
        bottomPad={bottomPad}
      />
    </View>
  );
}

function Welcome({ firstName, disabled, onPick }: { firstName: string; disabled: boolean; onPick: (prompt: string) => void }) {
  const theme = useTheme();
  return (
    <View style={{ alignItems: "center", flex: 1, gap: 12, justifyContent: "center", paddingVertical: 24 }}>
      <View style={{ alignItems: "center", backgroundColor: theme.tint, borderRadius: 24, height: 48, justifyContent: "center", width: 48 }}>
        <Ionicons color={theme.primary} name="sparkles" size={20} />
      </View>
      <Text heading accessibilityRole="header" style={{ color: theme.text, fontSize: 28, fontWeight: "800", letterSpacing: -0.8, textAlign: "center" }}>
        {firstName ? `Hi ${firstName}, what’s new?` : "What’s new?"}
      </Text>
      <Text style={{ color: theme.textSecondary, fontSize: 15, lineHeight: 22, maxWidth: 420, textAlign: "center" }}>
        Talk to me about anything. I remember what helps me speak for you.
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12, maxWidth: 520, width: "100%" }}>
        {SUGGESTIONS.map((item) => (
          <Pressable
            key={item.title}
            accessibilityRole="button"
            accessibilityLabel={item.prompt}
            disabled={disabled}
            onPress={() => onPick(item.prompt)}
            style={({ pressed }) => ({
              backgroundColor: pressed ? theme.tint : theme.backgroundElement,
              borderColor: theme.border,
              borderRadius: Radius.md,
              borderWidth: 1,
              flexBasis: "47%",
              flexGrow: 1,
              minHeight: 64,
              opacity: disabled ? 0.5 : 1,
              paddingHorizontal: 14,
              paddingVertical: 12,
            })}
          >
            <Text style={{ color: theme.text, fontSize: 14, fontWeight: "800" }}>{item.title}</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 14, lineHeight: 19 }}>{item.detail}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function QuestionItem({ question }: { question: VisitorQuestion }) {
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
      <Text content style={{ color: theme.text, fontSize: 15, lineHeight: 23 }}>{questionPrompt(question)}</Text>
      <TextInput
        content
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
          style={{ alignItems: "center", backgroundColor: answer.trim() ? theme.text : theme.tint, borderRadius: Radius.pill, justifyContent: "center", minHeight: 44, paddingHorizontal: 18 }}
        >
          <Text style={{ color: answer.trim() ? theme.background : theme.textSecondary, fontSize: 14, fontWeight: "800" }}>{state.pending ? "Sending…" : "Answer"}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={state.pending} onPress={() => void submit(null)} style={{ justifyContent: "center", minHeight: 44, paddingHorizontal: 8 }}>
          <Text style={{ color: theme.textSecondary, fontSize: 14, fontWeight: "700" }}>Skip</Text>
        </Pressable>
      </View>
      {state.error ? <Text accessibilityRole="alert" style={{ color: theme.danger, fontSize: 13 }}>{state.error}</Text> : null}
      {state.done ? <Text style={{ color: theme.textSecondary, fontSize: 13 }}>{state.done}</Text> : null}
    </View>
  );
}

// One rounded pill with a soft shadow: optional "+" options button, auto-growing field, dark send button.
export function Composer({
  value,
  onChange,
  placeholder,
  disabled,
  canSend,
  onSend,
  onOptions,
  bottomPad,
}: {
  value: string;
  onChange: (text: string) => void;
  placeholder: string;
  disabled: boolean;
  canSend: boolean;
  onSend: () => void;
  onOptions?: () => void;
  bottomPad: number;
}) {
  const theme = useTheme();
  return (
    <View style={{ alignSelf: "center", maxWidth: 720, paddingBottom: bottomPad, paddingHorizontal: 12, paddingTop: 8, width: "100%" }}>
      <View
        style={{
          alignItems: "flex-end",
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
          borderRadius: 28,
          borderWidth: 1,
          elevation: 4,
          flexDirection: "row",
          gap: 8,
          padding: 6,
          shadowColor: theme.primary,
          shadowOffset: { height: 8, width: 0 },
          shadowOpacity: 0.16,
          shadowRadius: 16,
        }}
      >
        {onOptions ? (
          <Pressable
            accessibilityLabel="Chat options"
            accessibilityRole="button"
            onPress={onOptions}
            style={{ alignItems: "center", backgroundColor: theme.tint, borderRadius: 20, height: 40, justifyContent: "center", width: 40 }}
          >
            <Ionicons color={theme.text} name="add" size={20} />
          </Pressable>
        ) : null}
        <TextInput
          content
          accessibilityLabel={placeholder}
          editable={!disabled}
          maxLength={1000}
          multiline
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          style={{ color: theme.text, flex: 1, fontSize: 16, maxHeight: 160, minHeight: 40, paddingHorizontal: onOptions ? 4 : 12, paddingVertical: 9 }}
          value={value}
        />
        <Pressable
          accessibilityLabel="Send message"
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSend, busy: disabled }}
          disabled={!canSend}
          onPress={onSend}
          style={{ alignItems: "center", backgroundColor: theme.text, borderRadius: 20, height: 40, justifyContent: "center", opacity: canSend ? 1 : 0.35, width: 40 }}
        >
          <Ionicons color={theme.background} name="arrow-up" size={20} />
        </Pressable>
      </View>
    </View>
  );
}

function Message({
  line,
  memories,
  busy,
  copied,
  onCopy,
  onMemory,
  onRetry,
}: {
  line: ChatLine;
  memories: TwinMemory[];
  busy: boolean;
  copied: boolean;
  onCopy: () => void;
  onMemory: (memory: TwinMemory, intent: "share" | "private" | "delete") => void;
  onRetry: () => void;
}) {
  const theme = useTheme();
  if (line.role === "twin")
    // Twin replies: plain text, full width, no bubble, avatar or name. Optional reason above.
    return (
      <View style={{ gap: 4 }}>
        {line.reason ? <Text content style={{ color: theme.textSecondary, fontSize: 12.5, lineHeight: 18 }}>{line.reason}</Text> : null}
        <Text content selectable style={{ color: theme.text, fontSize: 15.5, lineHeight: 25 }}>
          {line.text}
        </Text>
        <Pressable
          accessibilityLabel={copied ? "Copied" : "Copy reply"}
          accessibilityRole="button"
          onPress={onCopy}
          style={{ alignItems: "center", height: 32, justifyContent: "center", marginLeft: -6, width: 32 }}
        >
          <Ionicons color={theme.textSecondary} name={copied ? "checkmark" : "copy-outline"} size={16} />
        </Pressable>
      </View>
    );

  // Your messages: soft lavender bubble on the right, with what the Twin remembered underneath.
  return (
    <View style={{ alignItems: "flex-end", alignSelf: "flex-end", maxWidth: "88%" }}>
      <Text
        content
        selectable
        style={{ backgroundColor: theme.tint, borderRadius: Radius.bubble, color: theme.text, fontSize: 15, lineHeight: 22, overflow: "hidden", paddingHorizontal: 16, paddingVertical: 10 }}
      >
        {line.text}
      </Text>
      {line.status === "sending" ? <Meta text="Sending…" /> : null}
      {line.status === "failed" ? (
        <View style={{ alignItems: "center", flexDirection: "row", gap: 4 }}>
          <Meta text="Not sent" />
          <Pressable accessibilityRole="button" disabled={busy} onPress={onRetry} style={{ justifyContent: "center", minHeight: 44, paddingHorizontal: 8 }}>
            <Text style={{ color: theme.primary, fontSize: 13, fontWeight: "800" }}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        chipsFor(line, memories).map((chip) => {
          if (chip.kind === "forgotten") return <Meta key={`f:${chip.text}`} text={`Forgotten: ${chip.text}`} />;
          if (chip.kind === "suggested") return <Meta key={chip.memory.id} text="Suggested memory · review in Your Twin's memories" />;
          return (
            <View key={chip.memory.id} style={{ alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "flex-end", marginTop: 4 }}>
              <Ionicons color={theme.success} name="checkmark" size={14} />
              <Text content style={{ color: theme.textSecondary, flexShrink: 1, fontSize: 12.5 }}>
                Remembered: <Text content style={{ color: theme.text, fontWeight: "700" }}>{chip.memory.response}</Text>
                {chip.shared ? " · your Twin can share this" : ""}
              </Text>
              {chip.sensitive && !chip.shared ? (
                <View style={{ backgroundColor: Pastels.yellow.bg, borderRadius: Radius.pill, paddingHorizontal: 8, paddingVertical: 2 }}>
                  <Text style={{ color: Pastels.yellow.text, fontSize: 11, fontWeight: "800" }}>Sensitive · stays private</Text>
                </View>
              ) : null}
              {chip.canShare || chip.shared ? (
                <ChipButton
                  label={chip.shared ? "Keep private" : "Let Twin share"}
                  accessibilityLabel={chip.shared ? `Keep private: ${chip.memory.response}` : `Let your Twin share: ${chip.memory.response}`}
                  disabled={busy}
                  onPress={() => onMemory(chip.memory, chip.shared ? "private" : "share")}
                />
              ) : null}
              <ChipButton label="Undo" accessibilityLabel={`Forget: ${chip.memory.response}`} disabled={busy} onPress={() => onMemory(chip.memory, "delete")} />
            </View>
          );
        })
      )}
    </View>
  );
}

function ChipButton({ label, accessibilityLabel, disabled, onPress }: { label: string; accessibilityLabel: string; disabled: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable accessibilityLabel={accessibilityLabel} accessibilityRole="button" disabled={disabled} onPress={onPress} style={{ justifyContent: "center", minHeight: 44, paddingHorizontal: 6 }}>
      <Text style={{ color: theme.primary, fontSize: 13, fontWeight: "800" }}>{label}</Text>
    </Pressable>
  );
}

function Meta({ text }: { text: string }) {
  const theme = useTheme();
  return <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 4, textAlign: "right" }}>{text}</Text>;
}
