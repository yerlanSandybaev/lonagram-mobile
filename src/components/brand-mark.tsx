import { Image } from "expo-image";
import { Text, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";

const MARK = require("@/assets/brand/lonagram-mark.png");

export function BrandMark({ size = 32 }: { size?: number }) {
  const theme = useTheme();
  const fontSize = size >= 40 ? 22 : 17;
  return (
    <View style={{ alignItems: "center", flexDirection: "row", gap: 10 }}>
      <Image
        accessible={false}
        contentFit="contain"
        source={MARK}
        style={{ height: size, width: size }}
      />
      <Text style={{ color: theme.text, fontSize, fontWeight: "600", letterSpacing: -0.3 }}>Lonagram</Text>
    </View>
  );
}
