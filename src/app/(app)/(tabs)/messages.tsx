import { EmptyState, GlassCard, PremiumScreen, StatusPill } from "@/components/premium-ui";

export default function MessagesScreen() {
  return (
    <PremiumScreen eyebrow="Human to human" title="Chats" subtitle="Real messages are always distinct from conversations with an AI Twin.">
      <StatusPill label="Real people only" tone="muted" />
      <GlassCard><EmptyState icon="chatbubbles-outline" title="Messaging is not enabled yet" body="The existing backend does not currently expose a verified mobile messaging contract. This feature stays disabled instead of simulating people or messages." action="Unavailable" disabled /></GlassCard>
    </PremiumScreen>
  );
}
