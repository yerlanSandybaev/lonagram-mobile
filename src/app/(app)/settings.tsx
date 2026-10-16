import { Pressable, Text, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/providers/auth-provider";

export default function SettingsScreen() {
  const theme = useTheme();
  const { profile, session, signOut } = useAuth();
  const email = session?.user.email;
  return (
    <View style={{ backgroundColor: theme.background, flex: 1, paddingHorizontal: 24, paddingTop: 24 }}>
      <Text style={{ color: theme.textSecondary, fontSize: 13, fontWeight: "600" }}>Account</Text>
      <Text style={{ color: theme.text, fontSize: 16, marginTop: 8 }}>{profile?.displayName ?? "Lonagram"}</Text>
      {email ? <Text style={{ color: theme.textSecondary, fontSize: 14, marginTop: 4 }}>{email}</Text> : null}
      <Text style={{ color: theme.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 20 }}>
        Twin turns, permissions, and AI keys stay on the Lonagram server. This phone stores only your sign-in session in the device secure store.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => void signOut()}
        style={{
          alignItems: "center",
          borderColor: theme.border,
          borderRadius: 12,
          borderWidth: 1,
          marginTop: 28,
          minHeight: 48,
          justifyContent: "center",
        }}
      >
        <Text style={{ color: theme.text, fontSize: 16, fontWeight: "600" }}>Sign out</Text>
      </Pressable>
    </View>
  );
}
