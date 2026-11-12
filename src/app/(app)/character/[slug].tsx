import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";

import { Text } from "@/components/app-text";
import { Monogram } from "@/components/character-ui";
import { PrimaryButton } from "@/components/mobile-ui";
import { EmptyState } from "@/components/premium-ui";
import { Radius } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { characterDisclaimer, findCharacter } from "@/lib/characters";
import { characterChatApi } from "@/lib/lonagram";

// Mirrors the website's /characters/<slug> page.
export default function CharacterProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const character = findCharacter(slug);

  if (!character)
    return (
      <View style={{ backgroundColor: theme.background, flex: 1, padding: 24 }}>
        <Stack.Screen options={{ title: "" }} />
        <EmptyState icon="person-outline" title="Character not found" body="This Character Twin is not in the app yet." action="Back" onPress={() => router.back()} />
      </View>
    );

  const chatReady = characterChatApi !== null;
  return (
    <ScrollView contentContainerStyle={{ alignSelf: "center", gap: 28, maxWidth: 680, padding: 24, paddingBottom: 48, width: "100%" }}>
      <Stack.Screen options={{ title: "" }} />
      <View style={{ gap: 6 }}>
        <Monogram character={character} size={72} />
        <Text style={{ color: theme.accent, fontSize: 13, fontWeight: "800", marginTop: 12 }}>Character Twin</Text>
        <Text heading accessibilityRole="header" style={{ color: theme.text, fontSize: 40, fontWeight: "800", letterSpacing: -0.8 }}>
          {character.name}
        </Text>
        <Text style={{ color: theme.textSecondary, fontSize: 15 }}>
          {character.lifetime} · {character.place}
        </Text>
      </View>

      <View style={{ gap: 8 }}>
        <View style={{ alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 14 }}>
          <View style={{ minWidth: 200 }}>
            <PrimaryButton
              icon="chatbubble-ellipses"
              label={`Chat with ${character.name}`}
              disabled={!chatReady}
              onPress={() => router.push({ pathname: "/character-chat/[slug]" as never, params: { slug: character.slug } } as never)}
            />
          </View>
          <Text style={{ color: theme.textSecondary, fontSize: 14 }}>{character.role}</Text>
        </View>
        {chatReady ? null : <Text style={{ color: theme.textSecondary, fontSize: 13 }}>Coming soon to the app</Text>}
      </View>

      <Section title="About">
        {character.about.map((paragraph) => (
          <Text key={paragraph.slice(0, 24)} style={{ color: theme.text, fontSize: 15, lineHeight: 24 }}>
            {paragraph}
          </Text>
        ))}
      </Section>

      <Section title="Known for">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {character.knownFor.map((item) => (
            <View key={item} style={{ backgroundColor: theme.tint, borderRadius: Radius.pill, paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ color: theme.tintText, fontSize: 13, fontWeight: "700" }}>{item}</Text>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Life">
        <View>
          {character.timeline.map((step, index) => {
            const last = index === character.timeline.length - 1;
            return (
              <View key={step.year} style={{ flexDirection: "row", gap: 14 }}>
                <View style={{ alignItems: "center", width: 12 }}>
                  <View style={{ backgroundColor: theme.primary, borderRadius: 5, height: 10, marginTop: 5, width: 10 }} />
                  {last ? null : <View style={{ backgroundColor: theme.border, flex: 1, marginTop: 4, width: 2 }} />}
                </View>
                <View style={{ flex: 1, gap: 2, paddingBottom: last ? 0 : 18 }}>
                  <Text style={{ color: theme.text, fontSize: 14, fontWeight: "800" }}>{step.year}</Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 14, lineHeight: 21 }}>{step.text}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </Section>

      <Section title="Works">
        <Text style={{ color: theme.text, fontSize: 15, lineHeight: 24 }}>{character.works.join(" · ")}</Text>
      </Section>

      <Text style={{ color: theme.textSecondary, fontSize: 13, lineHeight: 19 }}>{characterDisclaimer(character)}</Text>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ gap: 10 }}>
      <Text heading accessibilityRole="header" style={{ color: theme.text, fontSize: 20, fontWeight: "800" }}>
        {title}
      </Text>
      {children}
    </View>
  );
}
