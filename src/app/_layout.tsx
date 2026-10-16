import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { useColorScheme } from "react-native";

import { useAuth, AuthProvider } from "@/providers/auth-provider";
import { QueryProvider } from "@/providers/query-provider";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <QueryProvider><RootNavigator /></QueryProvider>
      </AuthProvider>
    </ThemeProvider>
  );
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
    </Stack>
  );
}
