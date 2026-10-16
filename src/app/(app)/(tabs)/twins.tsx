import { Text } from "react-native";

import { EmptyState, GlassCard, PremiumScreen, StatusPill } from "@/components/premium-ui";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/providers/auth-provider";

export default function TwinsScreen() {
  const theme = useTheme();
  const { profile } = useAuth();
  const ready = Boolean(profile?.onboardingComplete);
  return (
    <PremiumScreen eyebrow="Your AI representation" title="My Twin" subtitle="Teach it what you approve. Keep everything else private.">
      <StatusPill label={ready ? "Profile ready" : "Private · not published"} tone={ready ? "primary" : "muted"} />
      <GlassCard icon="sparkles-outline" title={ready ? "Twin overview" : "Create your Twin"}>
        <EmptyState icon="chatbubble-ellipses-outline" title={ready ? "Twin controls are coming to mobile" : "A conversation, not a form"} body={ready ? "Your website profile is ready. Mobile editing and preview will activate after the existing Twin API has a public authenticated contract." : "Answer one thoughtful question at a time, review the resulting traits, and publish only when you choose. For now, complete onboarding on lonagram.com."} action={ready ? "Mobile API required" : "Continue on lonagram.com"} disabled />
      </GlassCard>
      <GlassCard icon="shield-checkmark-outline" title="Built around consent">
        <Text style={{ color: theme.textSecondary, fontSize: 14, lineHeight: 22 }}>Your Twin must identify itself as AI, stay inside allowed topics, and never invent private thoughts, attraction, or consent.</Text>
      </GlassCard>
    </PremiumScreen>
  );
}
