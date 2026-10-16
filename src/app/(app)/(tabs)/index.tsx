import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";

import { PrimaryButton, QueryState, Row, Section } from "@/components/mobile-ui";
import { PremiumScreen, StatusPill } from "@/components/premium-ui";
import { loadMyBundle, loadRequests } from "@/lib/lonagram";
import { useAuth } from "@/providers/auth-provider";

export default function HomeScreen() {
  const router = useRouter(); const { session } = useAuth(); const userId = session!.user.id;
  const bundle = useQuery({ queryKey: ["bundle", userId], queryFn: () => loadMyBundle(userId) });
  const requests = useQuery({ queryKey: ["requests", userId], queryFn: () => loadRequests(userId) });
  const incoming = (requests.data ?? []).filter((item) => item.toUserId === userId && item.status === "pending").length;
  return <PremiumScreen eyebrow="Meet the twin. Discover the person." title={`Hello${bundle.data ? `, ${bundle.data.profile.displayName}` : ""}.`} subtitle="Your connection space, kept simple and consent-first."><QueryState loading={bundle.isLoading} error={bundle.error}>{bundle.data ? <><View style={{ alignItems: "flex-start", gap: 12 }}><StatusPill label={bundle.data.twin.enabled && bundle.data.permissions.allowTwinChat ? "Twin published" : "Twin private"} tone={bundle.data.twin.enabled ? "primary" : "muted"} /><PrimaryButton label={bundle.data.profile.onboardingComplete ? "Edit my Twin" : "Finish setup"} icon="sparkles-outline" onPress={() => router.push("/twin" as never)} /></View><Section><Row icon="compass-outline" title="Discover people" detail="Find shared interests and meet their AI Twin." onPress={() => router.push("/discover" as never)} /><Row icon="mail-outline" title="Connection invitations" detail={incoming ? `${incoming} waiting for your response` : "No new invitations"} onPress={() => router.push("/notifications" as never)} /><Row icon="chatbubbles-outline" title="Private messages" detail="Available after a connection is accepted." onPress={() => router.push("/messages" as never)} /></Section></> : null}</QueryState></PremiumScreen>;
}
