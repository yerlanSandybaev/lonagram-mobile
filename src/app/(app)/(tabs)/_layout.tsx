import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { AppHeader } from "@/components/app-header";
import { useTheme } from "@/hooks/use-theme";
import { useQuery } from "@tanstack/react-query";
import { loadCounts } from "@/lib/lonagram";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const counts = useQuery({ queryKey: ["counts"], queryFn: loadCounts, refetchInterval: 15_000 });
  return (
    <Tabs
      screenOptions={{
        header: () => <AppHeader />,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
          height: 58 + Math.max(insets.bottom, 8),
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 7,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Dating", tabBarIcon: ({ color, focused, size }) => <Ionicons color={color} name={focused ? "heart" : "heart-outline"} size={size} /> }}
      />
      <Tabs.Screen
        name="connections"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          href: null,
          title: "Dating",
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons color={color} name={focused ? "compass" : "compass-outline"} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="twins"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Chats",
          tabBarBadge: counts.data?.messages || undefined,
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons color={color} name={focused ? "chatbubble" : "chatbubble-outline"} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{ title: "Notifications", tabBarBadge: counts.data?.notifications || undefined, tabBarIcon: ({ color, focused, size }) => <Ionicons color={color} name={focused ? "notifications" : "notifications-outline"} size={size} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons color={color} name={focused ? "person" : "person-outline"} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
