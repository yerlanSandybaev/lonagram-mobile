import { Redirect, Stack, usePathname } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/providers/auth-provider";
import { loadMyBundle } from "@/lib/lonagram";

import { useTheme } from "@/hooks/use-theme";

export default function AppLayout() {
  const theme = useTheme();
  const { session } = useAuth(); const pathname = usePathname();
  const bundle = useQuery({ queryKey: ["bundle", session!.user.id], queryFn: () => loadMyBundle(session!.user.id) });
  if (bundle.data && !bundle.data.profile.onboardingComplete && pathname !== "/onboarding" && pathname !== "/settings") return <Redirect href={"/onboarding" as never} />;
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: theme.background },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        headerTitleStyle: { fontWeight: "600" },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
    </Stack>
  );
}
