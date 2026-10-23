import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, Text } from "react-native";
import { FormField } from "@/components/form-ui";
import {
  PrimaryButton,
  QueryState,
  Row,
  Section,
} from "@/components/mobile-ui";
import { useTheme } from "@/hooks/use-theme";
import { deleteAccount, loadMyBundle, unblockUser } from "@/lib/lonagram";
import { useAuth } from "@/providers/auth-provider";

export default function SettingsScreen() {
  const theme = useTheme();
  const { session, signOut } = useAuth();
  const userId = session!.user.id;
  const router = useRouter();
  const cache = useQueryClient();
  const [username, setUsername] = useState("");
  const bundle = useQuery({
    queryKey: ["bundle", userId],
    queryFn: () => loadMyBundle(userId),
  });
  const logout = useMutation({ mutationFn: signOut });
  const unblock = useMutation({
    mutationFn: unblockUser,
    onSuccess: () => {
      void cache.invalidateQueries();
    },
  });
  const remove = useMutation({
    mutationFn: () => deleteAccount(username),
    onSuccess: async () => {
      await signOut();
    },
  });
  function confirmDelete() {
    Alert.alert(
      "Delete your Lonagram account?",
      "This permanently deletes your shared account on web, iOS, and Android. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete account",
          style: "destructive",
          onPress: () => remove.mutate(),
        },
      ],
    );
  }
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        backgroundColor: theme.background,
        flexGrow: 1,
        padding: 24,
        gap: 20,
      }}
    >
      <Text style={{ color: theme.text, fontSize: 20, fontWeight: "700" }}>
        Account
      </Text>
      <Text style={{ color: theme.textSecondary }}>{session?.user.email}</Text>
      <Section>
        <Row
          icon="shield-checkmark-outline"
          title="Privacy and Twin permissions"
          onPress={() => router.push("/privacy" as never)}
        />
        <Row
          icon="heart-outline"
          title="Dating preferences"
          onPress={() => router.push("/dating-preferences" as never)}
        />
      </Section>
      <PrimaryButton
        label={logout.isPending ? "Signing out…" : "Sign out"}
        disabled={logout.isPending}
        onPress={() => logout.mutate()}
      />
      {logout.error ? (
        <Text accessibilityRole="alert" style={{ color: theme.danger }}>
          {logout.error.message}
        </Text>
      ) : null}
      <QueryState loading={bundle.isLoading} error={bundle.error}>
        <Text style={{ color: theme.text, fontWeight: "700" }}>
          Blocked profiles
        </Text>
        <Section>
          {bundle.data?.blocks.map((person) => (
            <Row
              key={person.id}
              icon="ban-outline"
              title={person.displayName}
              detail="Tap to unblock"
              onPress={
                unblock.isPending ? undefined : () => unblock.mutate(person.id)
              }
            />
          ))}
        </Section>
        {unblock.error ? (
          <Text accessibilityRole="alert" style={{ color: theme.danger }}>
            {unblock.error.message}
          </Text>
        ) : null}
        <Text style={{ color: theme.danger, fontWeight: "700" }}>
          Delete shared account
        </Text>
        <Text style={{ color: theme.textSecondary }}>
          Type {bundle.data?.profile.username} to confirm deletion across all
          your devices.
        </Text>
        <FormField
          label="Confirm username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
        <PrimaryButton
          label={remove.isPending ? "Deleting…" : "Delete account"}
          disabled={
            remove.isPending ||
            !bundle.data ||
            username.trim().toLowerCase() !== bundle.data.profile.username
          }
          onPress={confirmDelete}
        />
        {remove.error ? (
          <Text accessibilityRole="alert" style={{ color: theme.danger }}>
            {remove.error.message}
          </Text>
        ) : null}
      </QueryState>
    </ScrollView>
  );
}
