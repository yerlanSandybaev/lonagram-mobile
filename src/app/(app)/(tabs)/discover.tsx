import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Avatar, PrimaryButton, QueryState, Section } from "@/components/mobile-ui";
import { PremiumScreen } from "@/components/premium-ui";
import { useTheme } from "@/hooks/use-theme";
import { blockUser, loadDiscover, reportProfile, requestConnection } from "@/lib/lonagram";
import { useAuth } from "@/providers/auth-provider";

export default function DiscoverScreen() {
  const theme = useTheme(); const router = useRouter(); const queryClient = useQueryClient(); const { session } = useAuth(); const userId = session!.user.id;
  const discover = useQuery({ queryKey: ["discover", userId], queryFn: () => loadDiscover(userId) });
  const connect = useMutation({ mutationFn: (otherId: string) => requestConnection(userId, otherId), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["requests", userId] }) });
  const safety = useMutation({ mutationFn: ({ otherId, kind }: { otherId: string; kind: "block" | "report" }) => kind === "block" ? blockUser(userId, otherId) : reportProfile(userId, otherId, "other"), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["discover", userId] }) });
  return (
    <PremiumScreen eyebrow="People, not cards" title="Discover" subtitle="Start with what you share. Nothing connects until the other person accepts.">
      <QueryState loading={discover.isLoading} error={discover.error} empty={discover.data?.length === 0}>{discover.data?.map((person) => <Section key={person.id}><View style={styles.person}><Avatar name={person.displayName} uri={person.avatarUrl} size={64} /><View style={{ flex: 1 }}><Text style={{ color: theme.text, fontSize: 19, fontWeight: "800" }}>{person.displayName}</Text><Text style={{ color: theme.textSecondary, marginTop: 2 }}>@{person.username}{person.city ? ` · ${person.city}` : ""}</Text></View></View>{person.bio ? <Text style={[styles.bio, { color: theme.text }]}>{person.bio}</Text> : null}<View style={styles.chips}>{(person.sharedInterests.length ? person.sharedInterests : person.interests).slice(0, 5).map((interest) => <View key={interest} style={[styles.chip, { backgroundColor: theme.backgroundSelected }]}><Text style={{ color: person.sharedInterests.includes(interest) ? theme.primary : theme.textSecondary, fontSize: 12, fontWeight: "700" }}>{person.sharedInterests.includes(interest) ? "Shared · " : ""}{interest}</Text></View>)}</View><View style={styles.actions}><Pressable onPress={() => router.push({ pathname: "/twin-chat/[id]" as never, params: { id: person.id, name: person.displayName } } as never)} style={[styles.secondary, { borderColor: theme.border }]}><Text style={{ color: theme.text, fontWeight: "800" }}>Meet AI Twin</Text></Pressable><View style={{ flex: 1 }}><PrimaryButton label={connect.isPending ? "Sending…" : "Connect"} disabled={connect.isPending} onPress={() => connect.mutate(person.id)} /></View></View><View style={styles.safety}><Pressable accessibilityLabel={`Report ${person.displayName}`} onPress={() => safety.mutate({ otherId: person.id, kind: "report" })}><Text style={{ color: theme.textSecondary, fontSize: 12 }}>Report</Text></Pressable><Pressable accessibilityLabel={`Block ${person.displayName}`} onPress={() => safety.mutate({ otherId: person.id, kind: "block" })}><Text style={{ color: theme.danger, fontSize: 12 }}>Block</Text></Pressable></View></Section>)}</QueryState>
      {connect.error ? <Text accessibilityRole="alert" style={{ color: theme.danger }}>{connect.error.message}</Text> : null}
    </PremiumScreen>
  );
}

const styles = StyleSheet.create({ person: { alignItems: "center", flexDirection: "row", gap: 14, padding: 16 }, bio: { fontSize: 14, lineHeight: 21, paddingHorizontal: 16 }, chips: { flexDirection: "row", flexWrap: "wrap", gap: 7, padding: 16 }, chip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 }, actions: { flexDirection: "row", gap: 10, padding: 16, paddingTop: 0 }, secondary: { alignItems: "center", borderRadius: 999, borderWidth: 1, flex: 1, justifyContent: "center", minHeight: 48, paddingHorizontal: 12 }, safety: { flexDirection: "row", gap: 18, justifyContent: "flex-end", paddingBottom: 14, paddingHorizontal: 18 } });
