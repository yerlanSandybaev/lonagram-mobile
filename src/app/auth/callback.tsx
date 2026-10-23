import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";
import { PrimaryButton } from "@/components/mobile-ui";
import { useAuth } from "@/providers/auth-provider";
import { MOBILE_AUTH_REDIRECT } from "@/lib/oauth-callback";
import { useTheme } from "@/hooks/use-theme";

export default function AuthCallback() {
  const params = useLocalSearchParams<{ code?: string; error?: string }>();
  const { completeOAuth } = useAuth(); const router = useRouter(); const theme = useTheme();
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const query = new URLSearchParams();
    if (typeof params.code === "string") query.set("code", params.code);
    if (typeof params.error === "string") query.set("error", params.error);
    void completeOAuth(`${MOBILE_AUTH_REDIRECT}?${query}`).then((result) => {
      if (!active) return;
      if (result.error) setError(result.error); else router.replace("/");
    });
    return () => { active = false; };
  }, [params.code, params.error, completeOAuth, router]);
  return <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: "center", padding: 24, gap: 16 }}>{error ? <><Text accessibilityRole="alert" style={{ color: theme.danger }}>{error}</Text><PrimaryButton label="Return to sign in" onPress={() => router.replace("/sign-in")} /></> : <ActivityIndicator color={theme.primary} />}</View>;
}
