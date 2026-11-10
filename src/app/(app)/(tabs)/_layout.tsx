import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "@/components/app-header";
import { useTheme } from "@/hooks/use-theme";
import { loadTwinThreads } from "@/lib/lonagram";
import { useAuth } from "@/providers/auth-provider";

// Phone tabs as on the website: Home, Discover, Twin Inbox, Profile.
// Messages and Notifications open from the top bar.
export default function TabLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const twinThreads = useQuery({ queryKey: ["twin-threads", session!.user.id], queryFn: loadTwinThreads, refetchInterval: 30_000 });
  const unreadTwin = twinThreads.data?.filter((item) => item.unread).length;
  return (
    <Tabs
      screenOptions={{
        header: () => <AppHeader />,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarLabelStyle: { fontSize: 11, fontFamily: "Manrope_700Bold" },
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
        options={{
          title: "Home",
          tabBarHideOnKeyboard: true,
          tabBarIcon: ({ color, focused, size }) => <Ionicons color={color} name={focused ? "home" : "home-outline"} size={size} />,
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: "Discover",
          tabBarIcon: ({ color, focused, size }) => <Ionicons color={color} name={focused ? "compass" : "compass-outline"} size={size} />,
        }}
      />
      <Tabs.Screen
        name="twins"
        options={{
          title: "Twin Inbox",
          tabBarBadge: unreadTwin || undefined,
          tabBarIcon: ({ color, focused, size }) => <Ionicons color={color} name={focused ? "sparkles" : "sparkles-outline"} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused, size }) => <Ionicons color={color} name={focused ? "person" : "person-outline"} size={size} />,
        }}
      />
      <Tabs.Screen name="messages" options={{ href: null, title: "Messages" }} />
      <Tabs.Screen name="notifications" options={{ href: null, title: "Notifications" }} />
      <Tabs.Screen name="connections" options={{ href: null }} />
    </Tabs>
  );
}
