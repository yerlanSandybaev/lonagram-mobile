import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Pressable, Switch, View } from "react-native";

import { Text } from "@/components/app-text";
import { Radius } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { loadAppearance, setAppearance, type AppearanceChoice } from "@/lib/appearance";
import { saveTwin, type Bundle } from "@/lib/lonagram";

// Settings > Your Twin (publish) and Appearance (light / dark / system).
export function SettingsPreferences({ userId, bundle }: { userId: string; bundle: Bundle | undefined }) {
  const theme = useTheme();
  const cache = useQueryClient();
  const [appearance, setChoice] = useState<AppearanceChoice>("system");
  useEffect(() => {
    void loadAppearance().then(setChoice);
  }, []);
  const publish = useMutation({
    mutationFn: (enabled: boolean) => saveTwin(userId, { ...bundle!.twin, enabled }),
    onSuccess: () => cache.invalidateQueries({ queryKey: ["bundle", userId] }),
  });
  const published = publish.isPending ? Boolean(publish.variables) : Boolean(bundle?.twin.enabled);
  return (
    <View style={{ gap: 20 }}>
      <View style={{ gap: 6 }}>
        <Text heading accessibilityRole="header" style={{ color: theme.text, fontSize: 19, fontWeight: "800" }}>Your Twin</Text>
        <View style={{ alignItems: "center", flexDirection: "row", gap: 12, minHeight: 52 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.text, fontSize: 15, fontWeight: "700" }}>Publish my Twin</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 13, lineHeight: 19 }}>
              {published ? "People can find your Twin and talk to it." : "Only you talk to your Twin."}
            </Text>
          </View>
          <Switch
            accessibilityLabel="Publish my Twin"
            disabled={!bundle || publish.isPending}
            onValueChange={(value) => publish.mutate(value)}
            thumbColor="#FFFFFF"
            trackColor={{ false: theme.border, true: theme.primary }}
            value={published}
          />
        </View>
        {publish.error ? <Text accessibilityRole="alert" style={{ color: theme.danger, fontSize: 13 }}>{publish.error.message}</Text> : null}
      </View>
      <View style={{ gap: 10 }}>
        <Text heading accessibilityRole="header" style={{ color: theme.text, fontSize: 19, fontWeight: "800" }}>Appearance</Text>
        <View accessibilityRole="radiogroup" style={{ backgroundColor: theme.tint, borderRadius: Radius.pill, flexDirection: "row", padding: 4 }}>
          {(["system", "light", "dark"] as const).map((choice) => {
            const selected = appearance === choice;
            return (
              <Pressable
                key={choice}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => {
                  setChoice(choice);
                  void setAppearance(choice);
                }}
                style={{ alignItems: "center", backgroundColor: selected ? theme.background : "transparent", borderRadius: Radius.pill, flex: 1, justifyContent: "center", minHeight: 44 }}
              >
                <Text style={{ color: selected ? theme.text : theme.textSecondary, fontSize: 14, fontWeight: "800" }}>
                  {choice === "system" ? "System" : choice === "light" ? "Light" : "Dark"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}
