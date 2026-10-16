import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { QueryState } from "@/components/mobile-ui";
import { useTheme } from "@/hooks/use-theme";
import { loadMessages, sendMessage } from "@/lib/lonagram";
import { useAuth } from "@/providers/auth-provider";

export default function HumanChatScreen() {
  const theme = useTheme(); const { id, name } = useLocalSearchParams<{ id: string; name?: string }>(); const { session } = useAuth(); const userId = session!.user.id; const queryClient = useQueryClient(); const [body, setBody] = useState(""); const list = useRef<FlatList>(null);
  const messages = useQuery({ queryKey: ["messages", id], queryFn: () => loadMessages(id), refetchInterval: 4_000 });
  const send = useMutation({ mutationFn: () => sendMessage(userId, id, body), onSuccess: async () => { setBody(""); await queryClient.invalidateQueries({ queryKey: ["messages", id] }); list.current?.scrollToEnd({ animated: true }); } });
  return <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ backgroundColor: theme.background, flex: 1 }} keyboardVerticalOffset={90}><Stack.Screen options={{ headerShown: true, title: name ?? "Private chat" }} /><QueryState loading={messages.isLoading} error={messages.error}><FlatList ref={list} data={messages.data} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })} renderItem={({ item }) => { const mine = item.senderId === userId; return <View style={[styles.bubble, { alignSelf: mine ? "flex-end" : "flex-start", backgroundColor: mine ? theme.primary : theme.backgroundElement }]}><Text style={{ color: mine ? theme.background : theme.text, lineHeight: 20 }}>{item.body}</Text></View>; }} /></QueryState><View style={[styles.composer, { backgroundColor: theme.background, borderTopColor: theme.border }]}><TextInput accessibilityLabel="Message" multiline onChangeText={setBody} placeholder="Message" placeholderTextColor={theme.textSecondary} style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]} value={body} /><Pressable accessibilityLabel="Send message" disabled={!body.trim() || send.isPending} onPress={() => send.mutate()} style={[styles.send, { backgroundColor: theme.primary }]}><Ionicons color={theme.background} name="arrow-up" size={21} /></Pressable></View></KeyboardAvoidingView>;
}
const styles = StyleSheet.create({ list: { flexGrow: 1, gap: 8, padding: 16 }, bubble: { borderRadius: 18, maxWidth: "82%", paddingHorizontal: 14, paddingVertical: 10 }, composer: { alignItems: "flex-end", borderTopWidth: .5, flexDirection: "row", gap: 10, padding: 12 }, input: { borderRadius: 22, flex: 1, maxHeight: 120, minHeight: 44, paddingHorizontal: 15, paddingVertical: 11 }, send: { alignItems: "center", borderRadius: 22, height: 44, justifyContent: "center", width: 44 } });
