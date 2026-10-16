import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, ScrollView, Switch, Text, View } from "react-native";
import { PrimaryButton, QueryState, Section } from "@/components/mobile-ui";
import { useTheme } from "@/hooks/use-theme";
import { loadMyBundle, savePermissions, type TwinPermissions } from "@/lib/lonagram";
import { useAuth } from "@/providers/auth-provider";

const labels: Record<keyof TwinPermissions, string> = { allowTwinChat: "Allow people to chat with my Twin", shareBio: "Share my bio", shareInterests: "Share interests", shareCity: "Share city", shareIntentions: "Share connection intentions", shareLanguages: "Share languages", sharePersonality: "Share personality", shareTopics: "Share favorite topics", shareLookingFor: "Share what I’m looking for", shareCommunicationStyle: "Share communication style", shareHobbies: "Share hobbies", shareInterestingConversation: "Share conversation preferences" };
export default function PrivacyScreen() {
  const theme = useTheme(); const queryClient = useQueryClient(); const { session } = useAuth(); const userId = session!.user.id; const bundle = useQuery({ queryKey: ["bundle", userId], queryFn: () => loadMyBundle(userId) }); const [value, setValue] = useState<TwinPermissions | null>(null);
  useEffect(() => { if (bundle.data) setValue(bundle.data.permissions); }, [bundle.data]);
  const save = useMutation({ mutationFn: (next: TwinPermissions) => savePermissions(userId, next), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bundle", userId] }), onError: (error) => Alert.alert("Could not save permissions", error.message) });
  return <><Stack.Screen options={{ headerShown: true, title: "Twin permissions" }} /><ScrollView contentContainerStyle={{ backgroundColor: theme.background, gap: 18, padding: 20 }}><Text style={{ color: theme.textSecondary, lineHeight: 21 }}>Twin Signals and Twin chats are available only while your Twin is published and “Allow Twin chat” is on. You can pause either at any time.</Text><QueryState loading={bundle.isLoading} error={bundle.error}>{value ? <><Section>{(Object.keys(labels) as (keyof TwinPermissions)[]).map((key) => <View key={key} style={{ alignItems: "center", borderBottomColor: theme.border, borderBottomWidth: .5, flexDirection: "row", gap: 12, minHeight: 62, padding: 14 }}><Text style={{ color: theme.text, flex: 1, fontWeight: key === "allowTwinChat" ? "800" : "600" }}>{labels[key]}</Text><Switch accessibilityLabel={labels[key]} onValueChange={(checked) => setValue((current) => current ? { ...current, [key]: checked } : current)} value={value[key]} /></View>)}</Section><PrimaryButton label={save.isPending ? "Saving…" : "Save permissions"} disabled={save.isPending} onPress={() => save.mutate(value)} /></> : null}</QueryState></ScrollView></>;
}
