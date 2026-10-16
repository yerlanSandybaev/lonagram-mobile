import { Text, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";

export function Destination({
  title,
  body,
  detail,
  banner,
}: {
  title: string;
  body: string;
  detail: string;
  banner?: string;
}) {
  const theme = useTheme();
  return (
    <View style={{ backgroundColor: theme.background, flex: 1, paddingHorizontal: 24, paddingTop: 28 }}>
      {banner ? (
        <Text
          style={{
            backgroundColor: theme.backgroundElement,
            borderRadius: 12,
            color: theme.text,
            fontSize: 14,
            lineHeight: 20,
            marginBottom: 20,
            padding: 12,
          }}
        >
          {banner}
        </Text>
      ) : null}
      <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 28, fontWeight: "600", letterSpacing: -0.4 }}>
        {title}
      </Text>
      <Text style={{ color: theme.text, fontSize: 16, lineHeight: 24, marginTop: 12 }}>{body}</Text>
      <Text style={{ color: theme.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 12 }}>{detail}</Text>
    </View>
  );
}
