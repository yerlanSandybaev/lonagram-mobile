import { Text } from "react-native";

import { EmptyState, GlassCard, PremiumScreen, StatusPill } from "@/components/premium-ui";
import { useTheme } from "@/hooks/use-theme";

export default function ConnectionsScreen() {
  const theme = useTheme();
  return (
    <PremiumScreen eyebrow="Mutual by design" title="Connections" subtitle="Requests stay in your control from first hello to accepted connection.">
      <StatusPill label="Nothing accepted automatically" />
      <GlassCard icon="mail-unread-outline" title="Incoming"><EmptyState icon="mail-open-outline" title="No incoming requests" body="New requests will appear here with Accept, Decline, and Block controls when the connection API is available." /></GlassCard>
      <GlassCard icon="paper-plane-outline" title="Sent"><Text style={{ color: theme.textSecondary, fontSize: 14, lineHeight: 21 }}>No pending requests. Sent requests will remain cancellable until accepted.</Text></GlassCard>
      <GlassCard icon="people-outline" title="Accepted"><Text style={{ color: theme.textSecondary, fontSize: 14, lineHeight: 21 }}>People you mutually choose will appear here.</Text></GlassCard>
    </PremiumScreen>
  );
}
