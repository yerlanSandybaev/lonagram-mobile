import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { Text, TextInput } from "@/components/app-text";
import { QueryState } from "@/components/mobile-ui";
import { EmptyState } from "@/components/premium-ui";
import { Pastels, Radius } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { privateTwinApi } from "@/lib/lonagram";
import {
  SENSITIVE_CONFIRM,
  isMissingOperation,
  memoryLabel,
  needsShareConfirmation,
  type MemoryChange,
  type MemoryIntent,
  type TwinMemory,
} from "@/lib/private-twin";
import { useAuth } from "@/providers/auth-provider";

const NOTICES: Record<MemoryIntent, string> = {
  delete: "Memory deleted. Future replies will not use it.",
  share: "Approved for relevant visitor replies.",
  edit: "Changes saved privately. Review before sharing again.",
  private: "Kept private. Visitors cannot use this note.",
  remember: "Remembered privately. Visitors cannot use this note.",
};

export default function TwinMemoriesScreen() {
  const theme = useTheme();
  const cache = useQueryClient();
  const { session } = useAuth();
  const key = ["twin-memories", session!.user.id];
  const memories = useQuery({ queryKey: key, queryFn: () => privateTwinApi.listMemories() });
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const update = useMutation({
    mutationFn: (input: { memory: TwinMemory; intent: MemoryIntent; text?: string; confirmSensitive?: boolean }) =>
      privateTwinApi.updateMemory(input.memory, input.intent, { text: input.text, confirmSensitive: input.confirmSensitive }),
    onSuccess: (change: MemoryChange, input) => {
      cache.setQueryData<TwinMemory[]>(key, (list = []) => {
        if (change.deletedId) return list.filter((item) => item.id !== change.deletedId);
        const updated = change.memory;
        return updated ? list.map((item) => (item.id === updated.id ? updated : item)) : list;
      });
      setEditing(null);
      setConfirming(null);
      setNotice(NOTICES[input.intent]);
    },
    onMutate: () => setNotice(""),
  });
  const run = (memory: TwinMemory, intent: MemoryIntent, options: { text?: string; confirmSensitive?: boolean } = {}) =>
    update.mutate({ memory, intent, ...options });

  const list = memories.data ?? [];
  const suggestions = list.filter((item) => !item.approved).length;
  const missing = isMissingOperation(memories.error);

  return (
    <ScrollView
      contentContainerStyle={{ alignSelf: "center", gap: 14, maxWidth: 680, padding: 20, paddingBottom: 40, width: "100%" }}
      keyboardShouldPersistTaps="handled"
      style={{ backgroundColor: theme.background }}
    >
      <Text style={{ color: theme.textSecondary, fontSize: 14, lineHeight: 21 }}>
        Your Twin remembers useful details privately as you talk. You can change them here anytime.
      </Text>
      {suggestions ? (
        <Text style={{ color: theme.primary, fontSize: 13, fontWeight: "800" }}>
          {suggestions} suggested {suggestions === 1 ? "memory" : "memories"} to review
        </Text>
      ) : null}
      {notice ? (
        <Text accessibilityRole="summary" style={{ color: theme.textSecondary, fontSize: 13 }}>{notice}</Text>
      ) : null}
      {update.error ? (
        <Text accessibilityRole="alert" style={{ color: theme.danger, fontSize: 14 }}>
          {update.error.message}
        </Text>
      ) : null}

      <QueryState loading={memories.isLoading} error={missing ? undefined : memories.error}>
        {missing ? (
          <EmptyState
            icon="albums-outline"
            title="Memories are almost here"
            body="This needs the latest Lonagram server."
          />
        ) : list.length === 0 ? (
          <EmptyState
            icon="albums-outline"
            title="No memories yet"
            body="Tell your Twin about an interest, a value, or the people you'd like to meet. It remembers useful facts on its own."
          />
        ) : (
          list.map((memory) => {
            const busy = update.isPending;
            const shared = memory.visibility === "shared" && memory.approved;
            return (
              <View
                key={memory.id}
                style={{ backgroundColor: theme.backgroundElement, borderColor: theme.border, borderRadius: Radius.lg, borderWidth: 1, gap: 10, padding: 16 }}
              >
                <View style={{ alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  <Pill label={memoryLabel(memory)} tone={shared ? Pastels.blue : memory.approved ? Pastels.green : Pastels.lavender} />
                  {memory.sensitive ? <Pill label="Sensitive" tone={Pastels.yellow} /> : null}
                </View>
                {editing === memory.id ? (
                  <View style={{ gap: 8 }}>
                    <TextInput
                      accessibilityLabel="Edit memory"
                      editable={!busy}
                      maxLength={1000}
                      multiline
                      onChangeText={setDraft}
                      style={{ backgroundColor: theme.background, borderColor: theme.border, borderRadius: Radius.md, borderWidth: 1, color: theme.text, fontSize: 15, minHeight: 88, padding: 12, textAlignVertical: "top" }}
                      value={draft}
                    />
                    <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Editing makes this memory private until you share it again.</Text>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <Action label="Save privately" primary disabled={busy || !draft.trim()} onPress={() => run(memory, "edit", { text: draft })} />
                      <Action label="Cancel" disabled={busy} onPress={() => setEditing(null)} />
                    </View>
                  </View>
                ) : (
                  <>
                    <Text selectable style={{ color: theme.text, fontSize: 15, lineHeight: 22 }}>{memory.response}</Text>
                    {confirming === memory.id ? (
                      <View style={{ gap: 8 }}>
                        <Text style={{ color: theme.textSecondary, fontSize: 13, lineHeight: 19 }}>{SENSITIVE_CONFIRM}</Text>
                        <View style={{ flexDirection: "row", gap: 8 }}>
                          <Action label="Yes, share it" primary disabled={busy} onPress={() => run(memory, "share", { confirmSensitive: true })} />
                          <Action label="Cancel" disabled={busy} onPress={() => setConfirming(null)} />
                        </View>
                      </View>
                    ) : (
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                        {!memory.approved ? <Action label="Remember privately" primary disabled={busy} onPress={() => run(memory, "remember")} /> : null}
                        <Action
                          label={memory.visibility === "shared" ? "Keep private" : "Share with others"}
                          disabled={busy}
                          onPress={() =>
                            memory.visibility === "shared"
                              ? run(memory, "private")
                              : needsShareConfirmation(memory)
                                ? setConfirming(memory.id)
                                : run(memory, "share")
                          }
                        />
                        <Action label="Edit" disabled={busy} onPress={() => { setEditing(memory.id); setDraft(memory.response); }} />
                        <Action label="Delete" danger disabled={busy} onPress={() => run(memory, "delete")} />
                      </View>
                    )}
                  </>
                )}
              </View>
            );
          })
        )}
      </QueryState>
    </ScrollView>
  );
}

function Pill({ label, tone }: { label: string; tone: { bg: string; text: string } }) {
  return (
    <View style={{ backgroundColor: tone.bg, borderRadius: Radius.pill, paddingHorizontal: 12, paddingVertical: 4 }}>
      <Text style={{ color: tone.text, fontSize: 12, fontWeight: "800" }}>{label}</Text>
    </View>
  );
}

function Action({ label, onPress, disabled, primary, danger }: { label: string; onPress: () => void; disabled?: boolean; primary?: boolean; danger?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={{
        alignItems: "center",
        backgroundColor: primary ? (disabled ? theme.tint : theme.primary) : "transparent",
        borderColor: theme.border,
        borderRadius: Radius.pill,
        borderWidth: primary ? 0 : 1,
        justifyContent: "center",
        minHeight: 44,
        opacity: disabled ? 0.6 : 1,
        paddingHorizontal: 16,
      }}
    >
      <Text style={{ color: primary ? theme.onPrimary : danger ? theme.danger : theme.text, fontSize: 14, fontWeight: "800" }}>{label}</Text>
    </Pressable>
  );
}
