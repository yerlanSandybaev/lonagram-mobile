import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";
import { Avatar, QueryState, Row, Section } from "@/components/mobile-ui";
import { PremiumScreen, StatusPill } from "@/components/premium-ui";
import { useTheme } from "@/hooks/use-theme";
import { loadMyBundle } from "@/lib/lonagram";
import { useAuth } from "@/providers/auth-provider";

export default function ProfileScreen() {
  const theme = useTheme(); const router = useRouter(); const { session } = useAuth(); const userId = session!.user.id;
  const bundle = useQuery({ queryKey: ["bundle", userId], queryFn: () => loadMyBundle(userId) });
  return <PremiumScreen title="Profile"><QueryState loading={bundle.isLoading} error={bundle.error}>{bundle.data ? <><View style={{ alignItems: "center", gap: 10 }}><Avatar name={bundle.data.profile.displayName} uri={bundle.data.profile.avatarUrl} size={88} /><Text style={{ color: theme.text, fontSize: 24, fontWeight: "800" }}>{bundle.data.profile.displayName}</Text><Text style={{ color: theme.textSecondary }}>@{bundle.data.profile.username}</Text><StatusPill label={bundle.data.twin.enabled ? "Twin published" : "Twin private"} tone={bundle.data.twin.enabled ? "primary" : "muted"} /></View><Section><Row icon="person-outline" title="Edit profile" detail="Photo, bio, interests, and intentions" onPress={() => router.push("/profile/edit" as never)} /><Row icon="sparkles-outline" title="My AI Twin" detail="Five behavior questions and publish controls" onPress={() => router.push("/twin" as never)} /><Row icon="shield-checkmark-outline" title="Twin permissions" detail="Choose exactly what your Twin may share" onPress={() => router.push("/privacy" as never)} /><Row icon="settings-outline" title="Settings" detail="Account, privacy, and sign out" onPress={() => router.push("/settings" as never)} /></Section></> : null}</QueryState></PremiumScreen>;
}
