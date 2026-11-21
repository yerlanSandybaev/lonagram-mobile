import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text, TextInput } from "@/components/app-text";
import { PersonAvatar } from "@/components/person-avatar";
import { Pastels, Radius } from "@/constants/theme";
import { useCharacters } from "@/hooks/use-characters";
import { useTheme } from "@/hooks/use-theme";
import { characterYears, monogram, searchCharacters, type Character } from "@/lib/characters";
import { discoverApi, type DiscoverCard } from "@/lib/lonagram";
import { useAuth } from "@/providers/auth-provider";

const LIMIT = 30;

// A plain list: Character Twins, then People. One search field filters both.
export default function DiscoverScreen() {
  const theme = useTheme();
  const router = useRouter();
  const cache = useQueryClient();
  const { session } = useAuth();
  const userId = session!.user.id;
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const { characters: allCharacters } = useCharacters();
  const characters = useMemo(() => searchCharacters(search, allCharacters), [search, allCharacters]);
  const people = useQuery({
    queryKey: ["discover-cards", userId, query],
    queryFn: () => discoverApi.list({ query, limit: LIMIT }),
  });

  function openPerson(card: DiscoverCard) {
    // The profile screen reads the card from here; there is no single-profile operation yet.
    cache.setQueryData(["discover-person", userId, card.id], card);
    router.push({ pathname: "/person/[id]" as never, params: { id: card.id } } as never);
  }

  return (
    <SafeAreaView edges={["left", "right"]} style={{ backgroundColor: theme.background, flex: 1 }}>
      <ScrollView contentContainerStyle={{ alignSelf: "center", maxWidth: 680, paddingBottom: 32, width: "100%" }} keyboardShouldPersistTaps="handled">
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <View style={{ alignItems: "center", borderColor: theme.border, borderRadius: Radius.md, borderWidth: 1, flexDirection: "row", gap: 8, paddingHorizontal: 14 }}>
            <Ionicons color={theme.textSecondary} name="search" size={18} />
            <TextInput
              accessibilityLabel="Search Character Twins and people"
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setSearch}
              placeholder="Search"
              placeholderTextColor={theme.textSecondary}
              returnKeyType="search"
              style={{ color: theme.text, flex: 1, fontSize: 16, minHeight: 46 }}
              value={search}
            />
          </View>
        </View>

        <SectionHeader title="Character Twins" body="Talk with people from history. AI portrayals, not the real people." />
        {characters.length ? (
          <CharacterCards
            characters={characters}
            onOpen={(slug) => router.push({ pathname: "/character/[slug]" as never, params: { slug } } as never)}
            onChat={(slug) => router.push({ pathname: "/character-chat/[slug]" as never, params: { slug } } as never)}
          />
        ) : (
          <Muted>No Character Twin matches that search.</Muted>
        )}

        <SectionHeader title="People" body="Talk to their Twin first. A real chat opens only if you both say yes." />
        {people.isLoading ? (
          <View style={{ padding: 24 }}>
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : people.error ? (
          <View style={{ gap: 4, paddingHorizontal: 16 }}>
            <Text accessibilityRole="alert" style={{ color: theme.danger, fontSize: 14 }}>
              {people.error.message}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => void people.refetch()} style={{ alignSelf: "flex-start", justifyContent: "center", minHeight: 44 }}>
              <Text style={{ color: theme.primary, fontSize: 14, fontWeight: "800" }}>Try again</Text>
            </Pressable>
          </View>
        ) : people.data?.length ? (
          people.data.map((card, index) => <PersonRow key={card.id} card={card} last={index === people.data!.length - 1} onPress={() => openPerson(card)} />)
        ) : (
          <Muted>{query ? "No one matches that search. Try a different word." : "New people appear here as they join. Check back soon."}</Muted>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ title, body }: { title: string; body: string }) {
  const theme = useTheme();
  return (
    <View style={{ gap: 4, paddingHorizontal: 16, paddingBottom: 4, paddingTop: 24 }}>
      <Text heading accessibilityRole="header" style={{ color: theme.text, fontSize: 20, fontWeight: "800" }}>
        {title}
      </Text>
      <Text style={{ color: theme.textSecondary, fontSize: 13, lineHeight: 19 }}>{body}</Text>
    </View>
  );
}

function Muted({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return <Text style={{ color: theme.textSecondary, fontSize: 14, paddingHorizontal: 16, paddingVertical: 12 }}>{children}</Text>;
}

function ListRow({ last, onPress, label, children }: { last: boolean; onPress: () => void; label: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: "flex-start",
        backgroundColor: pressed ? theme.backgroundSelected : "transparent",
        borderBottomColor: theme.border,
        borderBottomWidth: last ? 0 : 1,
        flexDirection: "row",
        gap: 12,
        marginHorizontal: 16,
        paddingVertical: 14,
      })}
    >
      {children}
    </Pressable>
  );
}

// Colour cards, one per Character Twin. Phones scroll sideways; wide screens show a grid.
const CARD_INK = "#2A2140";
function CharacterCards({ characters, onOpen, onChat }: { characters: Character[]; onOpen: (slug: string) => void; onChat: (slug: string) => void }) {
  const { width } = useWindowDimensions();
  const wide = width >= 640;
  const column = Math.min(width, 680) - 32;
  const cardWidth = wide ? (column - 24) / 3 : Math.round(column * 0.44);
  const cards = characters.map((character) => (
    <CharacterCard key={character.slug} character={character} width={cardWidth} onOpen={() => onOpen(character.slug)} onChat={() => onChat(character.slug)} />
  ));
  if (wide) return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, paddingHorizontal: 16, paddingTop: 12 }}>{cards}</View>;
  return (
    <ScrollView
      horizontal
      decelerationRate="fast"
      showsHorizontalScrollIndicator={false}
      snapToInterval={cardWidth + 12}
      contentContainerStyle={{ gap: 12, paddingHorizontal: 16, paddingTop: 12 }}
    >
      {cards}
    </ScrollView>
  );
}

function CharacterCard({ character, width, onOpen, onChat }: { character: Character; width: number; onOpen: () => void; onChat: () => void }) {
  const theme = useTheme();
  return (
    <View style={{ gap: 8, width }}>
      <Pressable
        accessibilityLabel={`${character.name}, ${characterYears(character)}, ${character.role}`}
        accessibilityRole="button"
        onPress={onOpen}
        style={({ pressed }) => ({ backgroundColor: character.tone, borderRadius: 24, flexGrow: 1, gap: 12, opacity: pressed ? 0.85 : 1, padding: 16 })}
      >
        <View style={{ alignItems: "center", backgroundColor: "rgba(255,255,255,0.65)", borderRadius: 28, height: 56, justifyContent: "center", width: 56 }}>
          <Text heading style={{ color: CARD_INK, fontSize: 24, fontWeight: "800" }}>
            {monogram(character)}
          </Text>
        </View>
        <View>
          <Text numberOfLines={1} style={{ color: CARD_INK, fontSize: 15, fontWeight: "700" }}>
            {character.name}
          </Text>
          <Text style={{ color: "#4A3F63", fontSize: 12, marginTop: 2 }}>{characterYears(character)}</Text>
        </View>
        <Text numberOfLines={2} style={{ color: "#3D3356", fontSize: 13, lineHeight: 18 }}>
          {character.role}
        </Text>
      </Pressable>
      <Pressable
        accessibilityLabel={`Chat with ${character.name}`}
        accessibilityRole="button"
        onPress={onChat}
        style={({ pressed }) => ({ alignItems: "center", backgroundColor: pressed ? theme.tint : theme.background, borderColor: theme.border, borderRadius: Radius.pill, borderWidth: 1, height: 36, justifyContent: "center" })}
      >
        <Text style={{ color: theme.text, fontSize: 14, fontWeight: "700" }}>Chat</Text>
      </Pressable>
    </View>
  );
}

function PersonRow({ card, last, onPress }: { card: DiscoverCard; last: boolean; onPress: () => void }) {
  const theme = useTheme();
  const shared = card.sharedInterests.slice(0, 3);
  return (
    <ListRow last={last} onPress={onPress} label={`${card.displayName}, @${card.username}`}>
      <PersonAvatar name={card.displayName} uri={card.avatarUrl} seed={card.avatarSeed} size={48} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text numberOfLines={1} style={{ color: theme.text, fontSize: 15, fontWeight: "800" }}>
          {card.displayName} <Text style={{ color: theme.textSecondary, fontWeight: "600" }}>@{card.username}</Text>
        </Text>
        {card.bio ? (
          <Text numberOfLines={1} style={{ color: theme.text, fontSize: 14, lineHeight: 20 }}>
            {card.bio}
          </Text>
        ) : null}
        {shared.length ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
            {shared.map((interest) => (
              <View key={interest} style={{ backgroundColor: Pastels.yellow.bg, borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 3 }}>
                <Text style={{ color: Pastels.yellow.text, fontSize: 12, fontWeight: "700" }}>{interest} · shared</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </ListRow>
  );
}
