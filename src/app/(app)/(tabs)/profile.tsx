import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ScrollView, Share, View } from "react-native";

import { Text } from "@/components/app-text";
import { Avatar, PrimaryButton, QueryState, Row } from "@/components/mobile-ui";
import { Radius } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { publicTwinUrl } from "@/lib/account";
import { loadMyBundle } from "@/lib/lonagram";
import { useAuth } from "@/providers/auth-provider";

// No container: the person, one primary action (share your Twin), and quiet links.
export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { session } = useAuth();
  const userId = session!.user.id;
  const bundle = useQuery({ queryKey: ["bundle", userId], queryFn: () => loadMyBundle(userId) });
  const data = bundle.data;
  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={{ alignSelf: "center", gap: 24, maxWidth: 560, padding: 20, width: "100%" }}>
      <QueryState loading={bundle.isLoading} error={bundle.error}>
        {data ? (
          <>
            <View style={{ alignItems: "center", gap: 8, paddingTop: 8 }}>
              <Avatar name={data.profile.displayName} uri={data.profile.avatarUrl} size={96} />
              <Text heading style={{ color: theme.text, fontSize: 28, fontWeight: "800", marginTop: 8, textAlign: "center" }}>
                {data.profile.displayName}
              </Text>
              <Text style={{ color: theme.textSecondary, fontSize: 15 }}>@{data.profile.username}</Text>
              {data.profile.bio ? (
                <Text style={{ color: theme.text, fontSize: 15, lineHeight: 22, textAlign: "center" }}>{data.profile.bio}</Text>
              ) : null}
              <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                {data.twin.enabled ? "Your Twin is published" : "Your Twin is private"}
              </Text>
            </View>
            {data.interests.length ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                {data.interests.map((interest) => (
                  <View key={interest} style={{ backgroundColor: theme.tint, borderRadius: Radius.pill, paddingHorizontal: 12, paddingVertical: 6 }}>
                    <Text style={{ color: theme.tintText, fontSize: 13, fontWeight: "700" }}>{interest}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            <PrimaryButton
              icon="share-outline"
              label="Share my Twin"
              disabled={!data.twin.enabled}
              onPress={() => {
                const url = publicTwinUrl(data.profile.username);
                void Share.share({ message: `Talk to my Twin on Lonagram: ${url}`, url });
              }}
            />
            {!data.twin.enabled ? (
              <Text style={{ color: theme.textSecondary, fontSize: 13, marginTop: -12, textAlign: "center" }}>
                Publish your Twin in Settings to share it.
              </Text>
            ) : null}
            <View>
              <Row icon="person-outline" title="Edit profile" onPress={() => router.push("/profile/edit" as never)} />
              <Row icon="sparkles-outline" title="Your Twin" onPress={() => router.push("/twin" as never)} />
              <Row icon="albums-outline" title="Your Twin's memories" onPress={() => router.push("/twin-memories" as never)} />
              <Row icon="heart-outline" title="Dating" onPress={() => router.push("/dating-preferences" as never)} />
              <Row icon="settings-outline" title="Settings" onPress={() => router.push("/settings" as never)} />
            </View>
          </>
        ) : null}
      </QueryState>
    </ScrollView>
  );
}
