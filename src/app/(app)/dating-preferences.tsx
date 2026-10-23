import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack } from "expo-router";
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
import { loadDating, saveDatingPreferences } from "@/lib/lonagram";
import { useAuth } from "@/providers/auth-provider";

export default function DatingPreferencesScreen() {
  const { session } = useAuth();
  const userId = session!.user.id;
  const theme = useTheme();
  const cache = useQueryClient();
  const query = useQuery({ queryKey: ["dating", userId], queryFn: loadDating });
  const initialized = useRef(false);
  const [form, setForm] = useState({
    age: "",
    preferredMinAge: "18",
    preferredMaxAge: "100",
    relationshipGoals: "",
    values: "",
    lifestyle: "",
    dealBreakers: "",
    communicationPace: "",
    preferredFirstDate: "",
  });
  const [enabled, setEnabled] = useState(false);
  const [sameCity, setSameCity] = useState(false);
  useEffect(() => {
    if (!query.data || initialized.current) return;
    initialized.current = true;
    const p = query.data.preferences;
    setEnabled(p.enabled);
    setSameCity(p.locationScope === "same_city");
    setForm({
      age: p.age == null ? "" : String(p.age),
      preferredMinAge: String(p.preferredMinAge),
      preferredMaxAge: String(p.preferredMaxAge),
      relationshipGoals: p.relationshipGoals.join(", "),
      values: p.values.join(", "),
      lifestyle: p.lifestyle.join(", "),
      dealBreakers: p.dealBreakers.join(", "),
      communicationPace: p.communicationPace,
      preferredFirstDate: p.preferredFirstDate,
    });
  }, [query.data]);
  const save = useMutation({
    mutationFn: () =>
      saveDatingPreferences({
        enabled,
        age: form.age.trim() ? Number(form.age) : null,
        preferredMinAge: Number(form.preferredMinAge),
        preferredMaxAge: Number(form.preferredMaxAge),
        locationScope: sameCity ? "same_city" : "anywhere",
        relationshipGoals: tags(form.relationshipGoals),
        values: tags(form.values),
        lifestyle: tags(form.lifestyle),
        dealBreakers: tags(form.dealBreakers),
        communicationPace: form.communicationPace,
        preferredFirstDate: form.preferredFirstDate,
      }),
    onSuccess: async () => {
      await Promise.all([
        cache.invalidateQueries({ queryKey: ["dating", userId] }),
        cache.invalidateQueries({ queryKey: ["discover", userId] }),
      ]);
    },
  });
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: theme.background }}
    >
      <Stack.Screen
        options={{ headerShown: true, title: "Dating preferences" }}
      />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 20, gap: 20 }}
      >
        <QueryState loading={query.isLoading} error={query.error}>
          <FormGroup>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{ flex: 1, color: theme.text }}>
                Enable Dating discovery
              </Text>
              <Switch
                accessibilityLabel="Enable Dating discovery"
                value={enabled}
                onValueChange={setEnabled}
              />
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{ flex: 1, color: theme.text }}>Only my city</Text>
              <Switch
                accessibilityLabel="Only my city"
                value={sameCity}
                onValueChange={setSameCity}
              />
            </View>
            {(
              [
                ["age", "Your age"],
                ["preferredMinAge", "Minimum preferred age"],
                ["preferredMaxAge", "Maximum preferred age"],
                ["relationshipGoals", "Relationship goals"],
                ["values", "Values"],
                ["lifestyle", "Lifestyle"],
                ["dealBreakers", "Deal breakers"],
                ["communicationPace", "Communication pace"],
                ["preferredFirstDate", "Preferred first date"],
              ] as const
            ).map(([key, label]) => (
              <FormField
                key={key}
                label={label}
                value={form[key]}
                keyboardType={
                  key.toLowerCase().includes("age") ? "number-pad" : "default"
                }
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, [key]: value }))
                }
              />
            ))}
            <Text style={{ color: theme.textSecondary }}>
              Separate goals, values, lifestyle, and deal breakers with commas.
              Age and matching rules are checked by Lonagram.
            </Text>
            {save.error ? (
              <Text accessibilityRole="alert" style={{ color: theme.danger }}>
                {save.error.message}
              </Text>
            ) : null}
            {save.isSuccess ? (
              <Text
                accessibilityLiveRegion="polite"
                style={{ color: theme.text }}
              >
                Preferences saved.
              </Text>
            ) : null}
            <PrimaryButton
              label={save.isPending ? "Saving…" : "Save preferences"}
              disabled={save.isPending || !query.data}
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
