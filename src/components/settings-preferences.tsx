import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Pressable, Switch, View } from "react-native";

import { Text } from "@/components/app-text";
import { Radius } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { loadAppearance, setAppearance, type AppearanceChoice } from "@/lib/appearance";
import { saveTwin, setTwinCheckIns, setTwinShareChatMemories, type Bundle } from "@/lib/lonagram";

// Settings > Your Twin (publish, use what I tell it, message me first) and Appearance (light / dark / system).
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
  const refresh = () => cache.invalidateQueries({ queryKey: ["bundle", userId] });
  const shareFacts = useMutation({ mutationFn: setTwinShareChatMemories, onSuccess: refresh });
  const checkIns = useMutation({ mutationFn: setTwinCheckIns, onSuccess: refresh });
  const sharing = shareFacts.isPending ? Boolean(shareFacts.variables) : Boolean(bundle?.twin.shareChatMemories);
  // Check-ins are on unless the owner turned them off.
  const checking = checkIns.isPending ? Boolean(checkIns.variables) : bundle?.twin.checkInsEnabled !== false;
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
        <Toggle
          title="Let my Twin use what I tell it"
          detail={
            sharing
              ? "On — things you tell your Twin on Home can be used when it talks to others. Health, money, religion, relationships and other sensitive things stay private."
              : "Off — things you tell your Twin stay private. You can still share a single fact from the chat or from Your Twin's memories."
          }
          value={sharing}
          disabled={!bundle || shareFacts.isPending}
          onChange={(value) => shareFacts.mutate(value)}
          error={shareFacts.error?.message}
        />
        <Toggle
          title="Let my Twin message me first"
          detail={
            checking
              ? "On — your Twin asks you one short question a day at most, to know you better. Answers are remembered privately."
              : "Off — your Twin only replies when you write."
          }
          value={checking}
          disabled={!bundle || checkIns.isPending}
          onChange={(value) => checkIns.mutate(value)}
          error={checkIns.error?.message}
        />
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

function Toggle({ title, detail, value, disabled, onChange, error }: { title: string; detail: string; value: boolean; disabled: boolean; onChange: (value: boolean) => void; error?: string }) {
  const theme = useTheme();
  return (
    <View style={{ gap: 4 }}>
      <View style={{ alignItems: "center", flexDirection: "row", gap: 12, minHeight: 52 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.text, fontSize: 15, fontWeight: "700" }}>{title}</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 13, lineHeight: 19 }}>{detail}</Text>
        </View>
        <Switch
          accessibilityLabel={title}
          disabled={disabled}
          onValueChange={onChange}
          thumbColor="#FFFFFF"
          trackColor={{ false: theme.border, true: theme.primary }}
          value={value}
        />
      </View>
      {error ? <Text accessibilityRole="alert" style={{ color: theme.danger, fontSize: 13 }}>{error}</Text> : null}
    </View>
  );
}
