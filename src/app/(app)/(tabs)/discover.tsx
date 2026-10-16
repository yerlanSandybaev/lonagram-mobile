import { Text } from "react-native";

import { EmptyState, GlassCard, PremiumScreen, StatusPill } from "@/components/premium-ui";
import { useTheme } from "@/hooks/use-theme";

export default function DiscoverScreen() {
  const theme = useTheme();
  return (
    <PremiumScreen eyebrow="Meet the twin" title="Discover people, gently." subtitle="Profiles appear only when their owners publish them and choose to be discoverable.">
      <StatusPill label="Privacy-first discovery" />
      <GlassCard>
        <EmptyState icon="sparkles-outline" title="Your discovery feed is waiting" body="The mobile feed will activate when the existing backend exposes an authenticated discovery endpoint. We won’t show invented profiles or bypass visibility rules." action="Backend connection required" disabled />
      </GlassCard>
      <Text style={{ color: theme.textSecondary, fontSize: 12, lineHeight: 18, textAlign: "center" }}>No swipe theatre. A connection happens only after a real person accepts.</Text>
    </PremiumScreen>
  );
}
