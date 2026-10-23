import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, ScrollView, Text } from "react-native";
import { FormField, FormGroup } from "@/components/form-ui";
import { PrimaryButton, QueryState } from "@/components/mobile-ui";
import { StatusPill } from "@/components/premium-ui";
import { useTheme } from "@/hooks/use-theme";
import { loadMyBundle, saveTwin, type TwinProfile } from "@/lib/lonagram";
import { useAuth } from "@/providers/auth-provider";

const empty: TwinProfile = {
  personality: "",
  topics: [],
  lookingFor: "",
  communicationStyle: "",
  hobbies: "",
  interestingConversation: "",
  publicIntroduction: "",
  enabled: false,
};
export default function TwinScreen() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const userId = session!.user.id;
  const bundle = useQuery({
    queryKey: ["bundle", userId],
    queryFn: () => loadMyBundle(userId),
  });
  const [value, setValue] = useState<TwinProfile>(empty);
  const initialized = useRef(false);
  useEffect(() => {
    if (bundle.data && !initialized.current) {
      initialized.current = true;
      setValue(bundle.data.twin);
    }
  }, [bundle.data]);
  const save = useMutation({
    mutationFn: (next: TwinProfile) => saveTwin(userId, next),
    onSuccess: (_result, saved) => {
      setValue((current) => ({ ...current, enabled: saved.enabled }));
      return queryClient.invalidateQueries({ queryKey: ["bundle", userId] });
    },
    onError: (error) => Alert.alert("Could not save Twin", error.message),
  });
  const complete = Boolean(
    value.personality &&
    value.lookingFor &&
    value.communicationStyle &&
    value.hobbies &&
    value.interestingConversation,
  );
  function update<K extends keyof TwinProfile>(key: K, next: TwinProfile[K]) {
    setValue((current) => ({ ...current, [key]: next }));
  }
  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: "My Twin" }} />
      <ScrollView
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          backgroundColor: theme.background,
          gap: 20,
          padding: 20,
        }}
      >
        <QueryState loading={bundle.isLoading} error={bundle.error}>
          <StatusPill
            label={value.enabled ? "Published" : "Private · not published"}
            tone={value.enabled ? "primary" : "muted"}
          />
          <Text style={{ color: theme.textSecondary, lineHeight: 21 }}>
            Your Twin is a representation, never you. Answer these five behavior
            questions, review the result, then publish only when ready.
          </Text>
          <FormGroup>
            <FormField
              label="1. How would friends describe your personality?"
              multiline
              value={value.personality}
              onChangeText={(text) => update("personality", text)}
            />
            <FormField
              label="2. What do you enjoy talking about?"
              hint="Separate topics with commas"
              value={value.topics.join(", ")}
              onChangeText={(text) => update("topics", split(text))}
            />
            <FormField
              label="3. What kind of connection are you looking for?"
              multiline
              value={value.lookingFor}
              onChangeText={(text) => update("lookingFor", text)}
            />
            <FormField
              label="4. How do you communicate?"
              multiline
              value={value.communicationStyle}
              onChangeText={(text) => update("communicationStyle", text)}
            />
            <FormField
              label="5. What do you enjoy doing?"
              multiline
              value={value.hobbies}
              onChangeText={(text) => update("hobbies", text)}
            />
            <FormField
              label="What makes a conversation interesting to you?"
              multiline
              value={value.interestingConversation}
              onChangeText={(text) => update("interestingConversation", text)}
            />
            <FormField
              label="Public Twin introduction"
              multiline
              maxLength={280}
              value={value.publicIntroduction}
              onChangeText={(text) => update("publicIntroduction", text)}
            />
            <PrimaryButton
              label={save.isPending ? "Saving…" : "Save Twin"}
              disabled={save.isPending || !complete}
              onPress={() => save.mutate(value)}
            />
            <PrimaryButton
              label={value.enabled ? "Unpublish Twin" : "Publish Twin"}
              disabled={save.isPending || (!value.enabled && !complete)}
              onPress={() => {
                const next = { ...value, enabled: !value.enabled };
                save.mutate(next);
              }}
            />
            <PrimaryButton
              label="Review permissions"
              icon="shield-checkmark-outline"
              onPress={() => router.push("/privacy" as never)}
            />
          </FormGroup>
        </QueryState>
      </ScrollView>
    </>
  );
}
function split(value: string) {
  return [
    ...new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}
