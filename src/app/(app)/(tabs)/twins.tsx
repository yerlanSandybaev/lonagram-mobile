import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";

import { Text } from "@/components/app-text";
import { PersonAvatar } from "@/components/person-avatar";
import { Radius } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { loadTwinThreads, type TwinThreadSummary } from "@/lib/lonagram";
import {
  INBOX_FILTERS,
  earlierLabel,
  filterTwinInbox,
  formatWhen,
  inboxSections,
  parseFilter,
  rowSubtitle,
  rowTitle,
  type InboxFilter,
} from "@/lib/twin-inbox";
import { useAuth } from "@/providers/auth-provider";

// Twin Inbox, in the same plain list style as Discover.
export default function TwinInboxScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { session } = useAuth();
  const params = useLocalSearchParams<{ filter?: string }>();
  const [filter, setFilter] = useState<InboxFilter>(() => parseFilter(params.filter));
  useEffect(() => {
    if (params.filter) setFilter(parseFilter(params.filter));
  }, [params.filter]);
  const threads = useQuery({ queryKey: ["twin-threads", session!.user.id], queryFn: loadTwinThreads, refetchInterval: 15_000 });
  const all = threads.data ?? [];
  const groups = filterTwinInbox(all, filter);
  const { ongoing, past } = inboxSections(groups);
  const open = (id: string) => router.push({ pathname: "/twin-chat/[id]" as never, params: { id } } as never);

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={{ alignSelf: "center", maxWidth: 680, paddingBottom: 32, width: "100%" }}>
      <Text heading accessibilityRole="header" style={{ color: theme.text, fontSize: 32, fontWeight: "800", letterSpacing: -0.8, paddingHorizontal: 16, paddingTop: 16 }}>
        Twin Inbox
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 14 }}>
        {INBOX_FILTERS.map((item) => {
          const selected = filter === item.id;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setFilter(item.id)}
              style={{ backgroundColor: selected ? theme.text : theme.tint, borderRadius: Radius.pill, justifyContent: "center", minHeight: 36, paddingHorizontal: 14 }}
            >
              <Text style={{ color: selected ? theme.background : theme.text, fontSize: 14, fontWeight: "600" }}>{item.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {threads.isLoading ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: 24 }} />
      ) : threads.error ? (
        <View style={{ gap: 4, paddingHorizontal: 16 }}>
          <Text accessibilityRole="alert" style={{ color: theme.danger, fontSize: 14 }}>
            {threads.error.message}
          </Text>
          <Pressable accessibilityRole="button" onPress={() => void threads.refetch()} style={{ alignSelf: "flex-start", justifyContent: "center", minHeight: 44 }}>
            <Text style={{ color: theme.primary, fontSize: 14, fontWeight: "800" }}>Try again</Text>
          </Pressable>
        </View>
      ) : all.length === 0 ? (
        <Line>
          No Twin chats yet. <Link onPress={() => router.push("/discover" as never)}>Find someone in Discover.</Link>
        </Line>
      ) : groups.length === 0 ? (
        <Line>
          No chats in this view. <Link onPress={() => setFilter("all")}>Show all</Link>
        </Line>
      ) : (
        <>
          <Section title="Ongoing" count={ongoing.length} body="You talk to other people’s Twins, and people talk to yours." empty="No ongoing Twin chats.">
            {ongoing.map((group, index) => <ThreadRow key={group[0].id} group={group} first={index === 0} onOpen={open} />)}
          </Section>
          <Section title="Past" count={past.length} body="Ended chats keep their full history." empty="No past Twin chats yet.">
            {past.map((group, index) => <ThreadRow key={group[0].id} group={group} first={index === 0} onOpen={open} />)}
          </Section>
        </>
      )}
    </ScrollView>
  );
}

function Line({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return <Text style={{ color: theme.textSecondary, fontSize: 14, lineHeight: 21, paddingHorizontal: 16 }}>{children}</Text>;
}

function Link({ children, onPress }: { children: ReactNode; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Text accessibilityRole="link" onPress={onPress} style={{ color: theme.text, fontWeight: "700", textDecorationLine: "underline" }}>
      {children}
    </Text>
  );
}

function Section({ title, count, body, empty, children }: { title: string; count: number; body: string; empty: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ marginTop: 16 }}>
      <View style={{ gap: 4, paddingHorizontal: 16 }}>
        <Text heading accessibilityRole="header" style={{ color: theme.text, fontSize: 19, fontWeight: "800" }}>
          {title} <Text style={{ color: theme.textSecondary, fontSize: 14, fontWeight: "500" }}>{count}</Text>
        </Text>
        <Text style={{ color: theme.textSecondary, fontSize: 13, lineHeight: 19 }}>{body}</Text>
      </View>
      {count ? (
        <View style={{ borderBottomColor: theme.border, borderBottomWidth: 1, borderTopColor: theme.border, borderTopWidth: 1, marginHorizontal: 16, marginTop: 12 }}>{children}</View>
      ) : (
        <Text style={{ color: theme.textSecondary, fontSize: 14, paddingHorizontal: 16, paddingTop: 10 }}>{empty}</Text>
      )}
    </View>
  );
}

function ThreadRow({ group, first, onOpen }: { group: TwinThreadSummary[]; first: boolean; onOpen: (id: string) => void }) {
  const theme = useTheme();
  const [thread, ...earlier] = group;
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={{ borderTopColor: theme.border, borderTopWidth: first ? 0 : 1 }}>
      <Pressable
        accessibilityLabel={`${rowTitle(thread)}${thread.unread ? ", unread" : ""}`}
        accessibilityRole="button"
        onPress={() => onOpen(thread.id)}
        style={({ pressed }) => ({ alignItems: "center", backgroundColor: pressed ? theme.backgroundSelected : "transparent", flexDirection: "row", gap: 14, paddingVertical: 14 })}
      >
        <PersonAvatar name={thread.other.displayName} uri={thread.other.avatarUrl} seed={thread.other.id} size={52} />
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ alignItems: "baseline", flexDirection: "row", gap: 8 }}>
            <Text numberOfLines={1} style={{ color: theme.text, flex: 1, fontSize: 15, fontWeight: thread.unread ? "800" : "600" }}>
              {rowTitle(thread)}
            </Text>
            <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{formatWhen(thread.updatedAt)}</Text>
          </View>
          <Text numberOfLines={1} style={{ color: theme.textSecondary, fontSize: 13 }}>
            {rowSubtitle(thread)}
          </Text>
          <View style={{ alignItems: "center", flexDirection: "row", gap: 8 }}>
            <Text content numberOfLines={1} style={{ color: theme.text, flex: 1, fontSize: 14, opacity: thread.unread ? 1 : 0.75 }}>
              {thread.preview}
            </Text>
            {thread.unread ? <View accessibilityLabel="Unread" style={{ backgroundColor: theme.primary, borderRadius: 4, height: 8, width: 8 }} /> : null}
          </View>
        </View>
      </Pressable>
      {earlier.length ? (
        <View style={{ paddingBottom: 10, paddingLeft: 66 }}>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded((value) => !value)} style={{ justifyContent: "center", minHeight: 32 }}>
            <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
              {earlierLabel(earlier.length)} {expanded ? "▴" : "▾"}
            </Text>
          </Pressable>
          {expanded
            ? earlier.map((session) => (
                <Pressable key={session.id} accessibilityRole="link" onPress={() => onOpen(session.id)} style={{ justifyContent: "center", minHeight: 36 }}>
                  <Text numberOfLines={1} style={{ color: theme.textSecondary, fontSize: 13, textDecorationLine: "underline" }}>
                    {formatWhen(session.updatedAt)} · {session.preview}
                  </Text>
                </Pressable>
              ))
            : null}
        </View>
      ) : null}
    </View>
  );
}
