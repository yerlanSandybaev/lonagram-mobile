import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { GlassCard, PremiumScreen, StatusPill } from "@/components/premium-ui";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/providers/auth-provider";

export default function ProfileScreen() {
  const theme = useTheme();
  const { profile, session } = useAuth();
  const email = session?.user.email ?? "Signed in";
  return (
    <PremiumScreen eyebrow="Your space" title={profile?.displayName ?? "Profile"} subtitle={profile ? `@${profile.username}` : email}>
      <View style={{ alignItems: "center", flexDirection: "row", gap: 14 }}>
        <View style={{ alignItems: "center", backgroundColor: theme.backgroundSelected, borderRadius: 32, height: 64, justifyContent: "center", width: 64 }}><Ionicons color={theme.primary} name="person-outline" size={30} /></View>
        <View style={{ flex: 1, gap: 7 }}><Text style={{ color: theme.text, fontSize: 15, fontWeight: "700" }}>{email}</Text><StatusPill label={profile?.onboardingComplete ? "Profile complete" : "Setup in progress"} tone={profile?.onboardingComplete ? "primary" : "muted"} /></View>
      </View>
      <GlassCard icon="eye-outline" title="Visibility"><Text style={{ color: theme.textSecondary, fontSize: 14, lineHeight: 22 }}>Your profile and Twin remain governed by the privacy choices in your existing Lonagram account. Mobile editing stays disabled until the backend contract is available.</Text></GlassCard>
      <GlassCard icon="lock-closed-outline" title="Privacy controls"><Text style={{ color: theme.textSecondary, fontSize: 14, lineHeight: 22 }}>Blocking, account deletion, and profile visibility must call real server operations. Manage them in Settings or on lonagram.com until those endpoints are verified.</Text></GlassCard>
    </PremiumScreen>
  );
}
