import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "@/components/app-text";
import { BrandMark } from "@/components/brand-mark";
import { useTheme } from "@/hooks/use-theme";
import { loadCounts } from "@/lib/lonagram";

// Top bar: wordmark, then Messages (real chats) and Notifications with unread badges.
export function AppHeader() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const counts = useQuery({ queryKey: ["counts"], queryFn: loadCounts, refetchInterval: 15_000 });
  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: theme.background,
        flexDirection: "row",
        justifyContent: "space-between",
        paddingBottom: 8,
        paddingHorizontal: 12,
        paddingTop: Math.max(insets.top, 12),
      }}
    >
      <View style={{ paddingHorizontal: 4 }}>
        <BrandMark size={26} />
      </View>
      <View style={{ flexDirection: "row" }}>
        <HeaderButton icon="chatbubbles-outline" label="Messages" count={counts.data?.messages} onPress={() => router.push("/messages" as never)} />
        <HeaderButton icon="notifications-outline" label="Notifications" count={counts.data?.notifications} onPress={() => router.push("/notifications" as never)} />
      </View>
    </View>
  );
}

function HeaderButton({
  icon,
  label,
  count,
  onPress,
}: {
  icon: "chatbubbles-outline" | "notifications-outline";
  label: string;
  count?: number;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityLabel={count ? `${label}, ${count} unread` : label}
      accessibilityRole="button"
      onPress={onPress}
      style={{ alignItems: "center", height: 44, justifyContent: "center", width: 44 }}
    >
      <Ionicons color={theme.text} name={icon} size={23} />
      {count ? (
        <View style={{ alignItems: "center", backgroundColor: theme.accent, borderRadius: 9, minWidth: 18, paddingHorizontal: 4, position: "absolute", right: 4, top: 4 }}>
          <Text style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "800" }}>{count > 99 ? "99+" : count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
