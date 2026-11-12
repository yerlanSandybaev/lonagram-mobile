import { Image } from "expo-image";
import { View } from "react-native";

import { Text } from "@/components/app-text";
import { avatarTone, initials } from "@/lib/discover";

// Photo, or initials on the same pastel the website uses for this person.
export function PersonAvatar({ name, uri, seed, size = 48 }: { name: string; uri: string | null; seed: string; size?: number }) {
  if (uri)
    return <Image accessibilityLabel={`Photo of ${name}`} contentFit="cover" source={{ uri }} style={{ borderRadius: size / 2, height: size, width: size }} />;
  return (
    <View style={{ alignItems: "center", backgroundColor: avatarTone(seed), borderRadius: size / 2, height: size, justifyContent: "center", width: size }}>
      <Text heading style={{ color: "rgba(0,0,0,0.45)", fontSize: size * 0.38, fontWeight: "800" }}>
        {initials(name) || "?"}
      </Text>
    </View>
  );
}
