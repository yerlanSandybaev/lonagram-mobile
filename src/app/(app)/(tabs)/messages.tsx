import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";

import { Avatar, QueryState, Row, Section } from "@/components/mobile-ui";
import { PremiumScreen } from "@/components/premium-ui";
import { loadThreads } from "@/lib/lonagram";
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
  return (
    <PremiumScreen
      title="Messages"
      subtitle="Real chats with people. A chat opens only after you both said yes."
    >
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
