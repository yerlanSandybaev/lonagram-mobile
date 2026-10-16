import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Alert, Text, View } from "react-native";

import { PrimaryButton, QueryState, Row, Section } from "@/components/mobile-ui";
import { PremiumScreen } from "@/components/premium-ui";
import { loadNotifications, loadRequests, markNotificationRead, respondToRequest, type ConnectionRequest } from "@/lib/lonagram";
import { useAuth } from "@/providers/auth-provider";
import { useTheme } from "@/hooks/use-theme";

export default function NotificationsScreen() {
  const theme = useTheme(); const router = useRouter(); const queryClient = useQueryClient(); const { session } = useAuth(); const userId = session!.user.id;
  const notifications = useQuery({ queryKey: ["notifications", userId], queryFn: () => loadNotifications(userId) });
  const requests = useQuery({ queryKey: ["requests", userId], queryFn: () => loadRequests(userId) });
  const respond = useMutation({ mutationFn: ({ request, decision }: { request: ConnectionRequest; decision: "accepted" | "rejected" | "ignored" }) => respondToRequest(userId, request, decision), onSuccess: (conversationId) => { void queryClient.invalidateQueries({ queryKey: ["requests", userId] }); void queryClient.invalidateQueries({ queryKey: ["threads", userId] }); if (conversationId) router.push({ pathname: "/chat/[id]" as never, params: { id: conversationId } } as never); }, onError: (error) => Alert.alert("Could not update invitation", error.message) });
  const readAll = useMutation({ mutationFn: () => markNotificationRead(userId), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", userId] }) });
  const incoming = (requests.data ?? []).filter((item) => item.toUserId === userId && item.status === "pending");
  return <PremiumScreen title="Notifications" subtitle="Invitations, connection activity, and important privacy updates.">{incoming.length ? <Section>{incoming.map((request) => <View key={request.id} style={{ gap: 12, padding: 16 }}><Text style={{ color: theme.text, fontSize: 16, fontWeight: "800" }}>New connection invitation</Text><Text style={{ color: theme.textSecondary }}>You decide what happens next. Nothing is shared until you accept.</Text><View style={{ flexDirection: "row", gap: 8 }}><View style={{ flex: 1 }}><PrimaryButton label="Accept" onPress={() => respond.mutate({ request, decision: "accepted" })} /></View><View style={{ flex: 1 }}><PrimaryButton label="Decline" onPress={() => respond.mutate({ request, decision: "rejected" })} /></View><View style={{ flex: 1 }}><PrimaryButton label="Ignore" onPress={() => respond.mutate({ request, decision: "ignored" })} /></View></View></View>)}</Section> : null}<QueryState loading={notifications.isLoading || requests.isLoading} error={notifications.error ?? requests.error} empty={!incoming.length && notifications.data?.length === 0}><Section>{notifications.data?.map((item) => <Row key={item.id} icon={item.readAt ? "notifications-outline" : "ellipse"} title={item.title} detail={item.body} onPress={() => markNotificationRead(userId, item.id)} />)}</Section></QueryState>{notifications.data?.some((item) => !item.readAt) ? <PrimaryButton label={readAll.isPending ? "Updating…" : "Mark all as read"} disabled={readAll.isPending} onPress={() => readAll.mutate()} /> : null}</PremiumScreen>;
}
