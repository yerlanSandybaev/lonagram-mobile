import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandMark } from "@/components/brand-mark";
import { useTheme } from "@/hooks/use-theme";

export function AppHeader() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: theme.background,
        borderBottomColor: theme.border,
        borderBottomWidth: 1,
        flexDirection: "row",
        justifyContent: "space-between",
        paddingBottom: 12,
        paddingHorizontal: 16,
        paddingTop: Math.max(insets.top, 12),
      }}
    >
      <BrandMark size={28} />
      <View style={{ flexDirection: "row", gap: 4 }}>
        <HeaderButton
          color={theme.text}
          icon="notifications-outline"
          label="Notifications"
          onPress={() => router.push("/notifications")}
        />
        <HeaderButton color={theme.text} icon="settings-outline" label="Settings" onPress={() => router.push("/settings")} />
      </View>
    </View>
  );
}

function HeaderButton({
  color,
  icon,
  label,
  onPress,
}: {
  color: string;
  icon: "notifications-outline" | "settings-outline";
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" hitSlop={8} onPress={onPress} style={{ padding: 8 }}>
      <Ionicons color={color} name={icon} size={22} />
    </Pressable>
  );
}
