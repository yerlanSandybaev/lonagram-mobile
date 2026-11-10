import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { useColorScheme } from "react-native";
import {
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from "@expo-google-fonts/bricolage-grotesque";
import {
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from "@expo-google-fonts/manrope";
import { useFonts } from "expo-font";

import { Colors } from "@/constants/theme";
import { loadAppearance } from "@/lib/appearance";

void loadAppearance();

import { useAuth, AuthProvider } from "@/providers/auth-provider";
import { QueryProvider } from "@/providers/query-provider";
import { DraftProvider } from "@/providers/draft-provider";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
  // Hold the splash screen until fonts are ready. A load error falls back to system fonts.
  if (!fontsLoaded && !fontError) return null;
  const colors = colorScheme === "dark" ? Colors.dark : Colors.light;
  const base = colorScheme === "dark" ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: { ...base.colors, background: colors.background, card: colors.background, text: colors.text, border: colors.border, primary: colors.primary },
  };
  return (
    <ThemeProvider value={navTheme}>
      <AuthProvider>
        <AccountQueries />
      </AuthProvider>
    </ThemeProvider>
  );
}

function AccountQueries() {
  const { session } = useAuth();
  return <QueryProvider key={session?.user.id ?? "signed-out"}><DraftProvider><RootNavigator /></DraftProvider></QueryProvider>;
}

function RootNavigator() {
  const { ready, session } = useAuth();

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  if (!ready) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={session != null}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={session == null}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Screen name="auth/callback" />
    </Stack>
  );
}
