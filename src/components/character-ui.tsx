import { View } from "react-native";

import { Text } from "@/components/app-text";
import { CHARACTER_INK, monogram, type Character } from "@/lib/characters";

// Round monogram on the character's pastel. Dark text in both themes.
export function Monogram({ character, size = 48 }: { character: Pick<Character, "name" | "tone">; size?: number }) {
  return (
    <View
      accessible={false}
      style={{ alignItems: "center", backgroundColor: character.tone, borderRadius: size / 2, height: size, justifyContent: "center", width: size }}
    >
      <Text heading style={{ color: CHARACTER_INK, fontSize: size * 0.42, fontWeight: "800" }}>
        {monogram(character)}
      </Text>
    </View>
  );
}
