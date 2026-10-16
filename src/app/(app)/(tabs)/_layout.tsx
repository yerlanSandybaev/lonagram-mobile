import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { AppHeader } from "@/components/app-header";
import { useTheme } from "@/hooks/use-theme";

export default function TabLayout() {
  const theme = useTheme();
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
          height: 66,
          paddingBottom: 8,
          paddingTop: 7,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Home", tabBarIcon: ({ color, focused, size }) => <Ionicons color={color} name={focused ? "home" : "home-outline"} size={size} /> }}
      />
      <Tabs.Screen
        name="connections"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: "Discover",
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
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons color={color} name={focused ? "chatbubble" : "chatbubble-outline"} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{ title: "Notifications", tabBarIcon: ({ color, focused, size }) => <Ionicons color={color} name={focused ? "notifications" : "notifications-outline"} size={size} /> }}
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
