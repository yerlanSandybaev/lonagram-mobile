import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Radius } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

export function PremiumScreen({ eyebrow, title, subtitle, children }: {
  eyebrow?: string; title: string; subtitle?: string; children: ReactNode;
}) {
  const theme = useTheme();
  return (
    <SafeAreaView edges={["left", "right"]} style={[styles.safe, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {eyebrow ? <Text style={[styles.eyebrow, { color: theme.primary }]}>{eyebrow}</Text> : null}
        <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</Text> : null}
        <View style={styles.body}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function GlassCard({ children, icon, title }: { children: ReactNode; icon?: IconName; title?: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      {title ? <View style={styles.cardHeading}>{icon ? <Ionicons color={theme.primary} name={icon} size={20} /> : null}<Text style={[styles.cardTitle, { color: theme.text }]}>{title}</Text></View> : null}
      {children}
    </View>
  );
}

export function EmptyState({ icon, title, body, action, disabled = false, onPress }: {
  icon: IconName; title: string; body: string; action?: string; disabled?: boolean; onPress?: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.orb, { backgroundColor: theme.backgroundSelected }]}><Ionicons color={theme.primary} name={icon} size={30} /></View>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.emptyBody, { color: theme.textSecondary }]}>{body}</Text>
      {action ? <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[styles.action, { backgroundColor: disabled ? theme.backgroundSelected : theme.primary }]}><Text style={[styles.actionText, { color: disabled ? theme.textSecondary : theme.background }]}>{action}</Text></Pressable> : null}
    </View>
  );
}

export function StatusPill({ label, tone = "primary" }: { label: string; tone?: "primary" | "muted" }) {
  const theme = useTheme();
  return <View style={[styles.pill, { backgroundColor: tone === "primary" ? theme.backgroundSelected : theme.backgroundElement }]}><View style={[styles.dot, { backgroundColor: tone === "primary" ? theme.primary : theme.textSecondary }]} /><Text style={[styles.pillText, { color: tone === "primary" ? theme.primary : theme.textSecondary }]}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, content: { alignSelf: "center", maxWidth: 680, paddingBottom: 40, paddingHorizontal: 20, paddingTop: 24, width: "100%" },
  eyebrow: { fontSize: 12, fontWeight: "800", letterSpacing: 1.5, textTransform: "uppercase" }, title: { fontSize: 34, fontWeight: "700", letterSpacing: -1, marginTop: 6 },
  subtitle: { fontSize: 15, lineHeight: 23, marginTop: 8, maxWidth: 560 }, body: { gap: 14, marginTop: 24 },
  card: { borderRadius: Radius.lg, borderWidth: 1, padding: 18 }, cardHeading: { alignItems: "center", flexDirection: "row", gap: 9, marginBottom: 12 }, cardTitle: { fontSize: 17, fontWeight: "700" },
  empty: { alignItems: "center", paddingHorizontal: 10, paddingVertical: 24 }, orb: { alignItems: "center", borderRadius: 28, height: 56, justifyContent: "center", width: 56 },
  emptyTitle: { fontSize: 20, fontWeight: "700", marginTop: 16, textAlign: "center" }, emptyBody: { fontSize: 14, lineHeight: 21, marginTop: 8, maxWidth: 420, textAlign: "center" },
  action: { borderRadius: Radius.pill, marginTop: 18, paddingHorizontal: 20, paddingVertical: 12 }, actionText: { fontSize: 14, fontWeight: "800" },
  pill: { alignItems: "center", alignSelf: "flex-start", borderRadius: Radius.pill, flexDirection: "row", gap: 7, paddingHorizontal: 11, paddingVertical: 7 }, dot: { borderRadius: 4, height: 7, width: 7 }, pillText: { fontSize: 12, fontWeight: "800" },
});
