import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";

import { Avatar, QueryState, Row, Section } from "@/components/mobile-ui";
import { PremiumScreen } from "@/components/premium-ui";
import { loadThreads, loadTwinThreads } from "@/lib/lonagram";
import { useAuth } from "@/providers/auth-provider";

export default function MessagesScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const userId = session!.user.id;
  const threads = useQuery({
    queryKey: ["threads", userId],
    queryFn: () => loadThreads(userId),
    refetchInterval: 15_000,
  });
  const twins = useQuery({
    queryKey: ["twin-threads", userId],
    queryFn: loadTwinThreads,
    refetchInterval: 15_000,
  });
  return (
    <PremiumScreen
      eyebrow="Human to human"
      title="Messages"
      subtitle="Private chats open only after a connection is accepted. Twin replies are labeled separately from personal messages."
    >
      <QueryState loading={twins.isLoading} error={twins.error}>
        <Section>
          {twins.data?.map((thread) => (
            <Row
              key={thread.id}
              icon="sparkles-outline"
              title={`${thread.other.displayName} · Twin${thread.unread ? " · Unread" : ""}`}
              detail={thread.preview}
              onPress={() =>
                router.push({
                  pathname: "/twin-chat/[id]" as never,
                  params: { id: thread.id },
                } as never)
              }
            />
          ))}
        </Section>
      </QueryState>
      <QueryState
        loading={threads.isLoading}
        error={threads.error}
        empty={threads.data?.length === 0}
      >
        <Section>
          {threads.data?.map((thread) => (
            <Row
              key={thread.id}
              icon="chatbubble-outline"
              title={`${thread.other.displayName}${thread.unread ? ` · ${thread.unread} unread` : ""}`}
              detail={thread.lastMessage}
              trailing={
                <Avatar
                  name={thread.other.displayName}
                  uri={thread.other.avatarUrl}
                  size={38}
                />
              }
              onPress={() =>
                router.push({
                  pathname: "/chat/[id]" as never,
                  params: { id: thread.id, name: thread.other.displayName },
                } as never)
              }
            />
          ))}
        </Section>
      </QueryState>
    </PremiumScreen>
  );
}
