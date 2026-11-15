import { useEffect, useState } from "react";
import { View } from "react-native";

import { Text } from "@/components/app-text";
import { useTheme } from "@/hooks/use-theme";

// "<name> is thinking" with three typing dots.
export function Thinking({ name }: { name: string }) {
  const theme = useTheme();
  const label = `${name} is thinking`;
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setStep((value) => (value + 1) % 3), 400);
    return () => clearInterval(timer);
  }, []);
  return (
    <View accessibilityLabel={`${label}`} accessibilityLiveRegion="polite" style={{ alignItems: "center", flexDirection: "row", gap: 8, marginTop: 10 }}>
      <Text style={{ color: theme.textSecondary, fontSize: 14 }}>{label}</Text>
      <View style={{ flexDirection: "row", gap: 4 }}>
        {[0, 1, 2].map((dot) => (
          <View key={dot} style={{ backgroundColor: theme.textSecondary, borderRadius: 3, height: 6, opacity: dot === step ? 1 : 0.35, width: 6 }} />
        ))}
      </View>
    </View>
  );
}
