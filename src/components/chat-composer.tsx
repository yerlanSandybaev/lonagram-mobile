import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/use-theme";
import { useMessageDraft } from "@/providers/draft-provider";

export function ChatComposer({
  draftId,
  placeholder,
  disabled,
  submit,
  onSent,
}: {
  draftId: string;
  placeholder: string;
  disabled?: boolean;
  submit: (text: string, key: string) => Promise<unknown>;
  onSent: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const draft = useMessageDraft(draftId);
  async function send() {
    if (!disabled && (await draft.send(submit))) onSent();
  }
  return (
    <View
      style={{
        borderTopWidth: 0.5,
        borderColor: theme.border,
        padding: 12,
        paddingBottom: Math.max(12, insets.bottom),
        gap: 8,
      }}
    >
      {draft.error ? (
        <Text accessibilityRole="alert" style={{ color: theme.danger }}>
          {draft.error}
        </Text>
      ) : null}
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10 }}>
        <TextInput
          accessibilityLabel={placeholder}
          editable={!disabled && !draft.pending}
          maxLength={2000}
          multiline
          value={draft.text}
          onChangeText={draft.edit}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          style={{
            backgroundColor: theme.backgroundElement,
            color: theme.text,
            flex: 1,
            minHeight: 44,
            maxHeight: 120,
            borderRadius: 20,
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={draft.error ? "Retry message" : "Send message"}
          accessibilityState={{
            disabled: disabled || draft.pending || !draft.text.trim(),
            busy: draft.pending,
          }}
          disabled={disabled || draft.pending || !draft.text.trim()}
          onPress={() => void send()}
          style={{
            backgroundColor: theme.primary,
            borderRadius: 22,
            padding: 12,
            opacity: disabled || !draft.text.trim() ? 0.4 : 1,
          }}
        >
          {draft.pending ? (
            <ActivityIndicator color={theme.background} />
          ) : (
            <Ionicons
              color={theme.background}
              name={draft.error ? "refresh" : "arrow-up"}
              size={22}
            />
          )}
        </Pressable>
      </View>
      {draft.pending ? (
        <Text
          accessibilityLiveRegion="polite"
          style={{ color: theme.textSecondary }}
        >
          Sending…
        </Text>
      ) : null}
    </View>
  );
}
