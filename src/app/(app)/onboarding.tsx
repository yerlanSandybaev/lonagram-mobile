import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { FormField, FormGroup } from "@/components/form-ui";
import { PrimaryButton, QueryState } from "@/components/mobile-ui";
import { useTheme } from "@/hooks/use-theme";
import { completeOnboarding, loadMyBundle } from "@/lib/lonagram";
import { useAuth } from "@/providers/auth-provider";
import { onboardingFields } from "@/lib/onboarding-input";

export default function OnboardingScreen() {
  const { session } = useAuth();
  const userId = session!.user.id;
  const theme = useTheme();
  const router = useRouter();
  const cache = useQueryClient();
  const bundle = useQuery({
    queryKey: ["bundle", userId],
    queryFn: () => loadMyBundle(userId),
  });
  const initialized = useRef(false);
  const [form, setForm] = useState({
    username: "",
    displayName: "",
    bio: "",
    city: "",
    languages: "",
    interests: "",
    communicationStyle: "",
  });
  const [publish, setPublish] = useState(false);
  const [allowChat, setAllowChat] = useState(false);
  const [adult, setAdult] = useState(false);
  useEffect(() => {
    if (!bundle.data || initialized.current) return;
    initialized.current = true;
    const { profile, twin, interests } = bundle.data;
    setAdult(Boolean(profile.is18Plus));
    setForm({
      username: profile.username,
      displayName: profile.displayName,
      bio: profile.bio,
      city: profile.city ?? "",
      languages: profile.languages.join(", "),
      interests: interests.join(", "),
      communicationStyle: twin.communicationStyle,
    });
  }, [bundle.data]);
  const save = useMutation({
    mutationFn: () => {
      if (!bundle.data) throw new Error("Your profile is still loading.");
      return completeOnboarding({
        ...onboardingFields(bundle.data.profile, bundle.data.twin),
        username: form.username,
        displayName: form.displayName,
        bio: form.bio,
        city: form.city,
        languages: tags(form.languages),
        intentions: bundle.data.profile.intentions.length
          ? bundle.data.profile.intentions
          : ["dating"],
        interests: tags(form.interests),
        communicationStyle: form.communicationStyle,
        permissions: { ...bundle.data.permissions, allowTwinChat: allowChat },
        publishTwin: publish,
        adultConfirmation: adult ? true : undefined,
      });
    },
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: ["bundle", userId] });
      router.replace("/");
    },
  });
  // Only editable onboarding fields cross the API; no row IDs or ownership claims.
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: theme.background }}
    >
      <Stack.Screen
        options={{ headerShown: true, title: "Welcome to Lonagram" }}
      />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 20, gap: 20 }}
      >
        <QueryState loading={bundle.isLoading} error={bundle.error}>
          <Text style={{ color: theme.textSecondary, lineHeight: 21 }}>
            Finish your shared profile. Your Twin stays private unless you
            choose to publish it.
          </Text>
          <FormGroup>
            {(
              [
                ["displayName", "Display name"],
                ["username", "Username"],
                ["bio", "Bio"],
                ["city", "City"],
                ["languages", "Languages, separated by commas"],
                ["interests", "Interests, separated by commas"],
                ["communicationStyle", "How do you communicate?"],
              ] as const
            ).map(([key, label]) => (
              <FormField
                key={key}
                label={label}
                value={form[key]}
                onChangeText={(text) =>
                  setForm((current) => ({ ...current, [key]: text }))
                }
                multiline={key === "bio" || key === "communicationStyle"}
              />
            ))}
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <Text style={{ flex: 1, color: theme.text }}>
                Publish my Twin
              </Text>
              <Switch
                accessibilityLabel="Publish my Twin"
                value={publish}
                onValueChange={setPublish}
              />
            </View>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <Text style={{ flex: 1, color: theme.text }}>
                Allow Twin conversations
              </Text>
              <Switch
                accessibilityLabel="Allow Twin conversations"
                value={allowChat}
                onValueChange={setAllowChat}
              />
            </View>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <Text style={{ flex: 1, color: theme.text }}>
                I confirm I am 18 or older.
              </Text>
              <Switch
                accessibilityLabel="I confirm I am 18 or older"
                value={adult}
                onValueChange={setAdult}
              />
            </View>
            {save.error ? (
              <Text accessibilityRole="alert" style={{ color: theme.danger }}>
                {save.error.message}
              </Text>
            ) : null}
            <PrimaryButton
              label={save.isPending ? "Saving…" : "Continue to Dating"}
              disabled={save.isPending || !bundle.data || !adult}
              onPress={() => save.mutate()}
            />
          </FormGroup>
        </QueryState>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
function tags(value: string) {
  return [
    ...new Set(
      value
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean),
    ),
  ];
}
