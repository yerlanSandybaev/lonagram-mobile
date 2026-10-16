import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { BrandMark } from "@/components/brand-mark";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/providers/auth-provider";

type Mode = "sign-in" | "sign-up";

export function AuthScreen({ mode }: { mode: Mode }) {
  const theme = useTheme();
  const { configured, configError, signIn, signUp } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [is18Plus, setIs18Plus] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ text: string; notice: boolean } | null>(null);

  async function submit() {
    setPending(true);
    setMessage(null);
    const result =
      mode === "sign-up"
        ? await signUp({ email, password, username, displayName, is18Plus })
        : await signIn({ email, password });
    setPending(false);
    if (result.error) setMessage({ text: result.error, notice: Boolean(result.notice) });
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <BrandMark size={40} />
          <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{mode === "sign-up" ? "Create your account" : "Sign in"}</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {mode === "sign-up"
              ? "Lonagram is for adults 18 and older. Your twin comes next, after a profile that is actually yours."
              : "Pick up your profile, your twin, and the conversations you already chose."}
          </Text>
          {configError ? (
            <Text accessibilityRole="alert" style={[styles.alert, { color: theme.danger }]}>
              {configError}
            </Text>
          ) : null}
          {!configured && !configError ? (
            <Text style={[styles.notice, { backgroundColor: theme.backgroundElement, color: theme.textSecondary }]}>
              Add the public Supabase URL and publishable key to .env.local before signing in. The service-role key stays on the server.
            </Text>
          ) : null}
          {mode === "sign-up" ? (
            <>
              <Field label="Display name" theme={theme}>
                <TextInput
                  accessibilityLabel="Display name"
                  autoCapitalize="words"
                  autoComplete="nickname"
                  maxLength={40}
                  onChangeText={setDisplayName}
                  placeholder="How people see you"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, inputStyle(theme)]}
                  value={displayName}
                />
              </Field>
              <Field label="Username" theme={theme}>
                <TextInput
                  accessibilityLabel="Username"
                  autoCapitalize="none"
                  autoComplete="username"
                  autoCorrect={false}
                  maxLength={20}
                  onChangeText={setUsername}
                  placeholder="lowercase letters, numbers, _"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, inputStyle(theme)]}
                  value={username}
                />
              </Field>
              <Text style={[styles.hint, { color: theme.textSecondary }]}>
                3–20 characters. Letters, numbers, and underscores only.
              </Text>
            </>
          ) : null}
          <Field label="Email" theme={theme}>
            <TextInput
              accessibilityLabel="Email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              inputMode="email"
              keyboardType="email-address"
              onChangeText={setEmail}
              style={[styles.input, inputStyle(theme)]}
              value={email}
            />
          </Field>
          <Field label="Password" theme={theme}>
            <TextInput
              accessibilityLabel="Password"
              autoCapitalize="none"
              autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
              onChangeText={setPassword}
              secureTextEntry
              style={[styles.input, inputStyle(theme)]}
              value={password}
            />
          </Field>
          {mode === "sign-up" ? (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: is18Plus }}
              onPress={() => setIs18Plus((current) => !current)}
              style={styles.checkRow}
            >
              <View
                style={[
                  styles.checkbox,
                  { borderColor: theme.text },
                  is18Plus ? { backgroundColor: theme.text } : null,
                ]}
              />
              <Text style={[styles.checkLabel, { color: theme.text }]}>
                I confirm I am 18 or older. Lonagram is only for adults.
              </Text>
            </Pressable>
          ) : null}
          {message ? (
            <Text accessibilityRole="alert" style={[styles.alert, { color: message.notice ? theme.text : theme.danger }]}>
              {message.text}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            disabled={pending}
            onPress={() => void submit()}
            style={[styles.button, { backgroundColor: theme.text, opacity: pending ? 0.7 : 1 }]}
          >
            {pending ? (
              <ActivityIndicator color={theme.background} />
            ) : (
              <Text style={[styles.buttonLabel, { color: theme.background }]}>
                {mode === "sign-up" ? "Create account" : "Sign in"}
              </Text>
            )}
          </Pressable>
          <Text style={[styles.footer, { color: theme.textSecondary }]}>
            {mode === "sign-up" ? "Already have an account? " : "New here? "}
            <Link href={mode === "sign-up" ? "/sign-in" : "/sign-up"} style={{ color: theme.text, textDecorationLine: "underline" }}>
              {mode === "sign-up" ? "Sign in" : "Create an account"}
            </Link>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label,
  theme,
  children,
}: {
  label: string;
  theme: { text: string };
  children: ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      {children}
    </View>
  );
}

function inputStyle(theme: { background: string; border: string; text: string }) {
  return {
    backgroundColor: theme.background,
    borderColor: theme.border,
    color: theme.text,
  };
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: {
    alignSelf: "center",
    flexGrow: 1,
    justifyContent: "center",
    maxWidth: 440,
    paddingHorizontal: 24,
    paddingVertical: 32,
    width: "100%",
  },
  title: { fontSize: 32, fontWeight: "600", letterSpacing: -0.6, marginTop: 28 },
  subtitle: { fontSize: 15, lineHeight: 22, marginTop: 8 },
  field: { marginTop: 16 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  input: { borderRadius: 12, borderWidth: 1, fontSize: 16, minHeight: 48, paddingHorizontal: 14 },
  hint: { fontSize: 12, lineHeight: 18, marginTop: 8 },
  checkRow: { alignItems: "flex-start", flexDirection: "row", gap: 12, marginTop: 18 },
  checkbox: { borderRadius: 4, borderWidth: 1.5, height: 18, marginTop: 2, width: 18 },
  checkLabel: { flex: 1, fontSize: 14, lineHeight: 20 },
  alert: { fontSize: 14, lineHeight: 20, marginTop: 16 },
  notice: { borderRadius: 12, fontSize: 14, lineHeight: 20, marginTop: 16, padding: 12 },
  button: { alignItems: "center", borderRadius: 12, justifyContent: "center", marginTop: 20, minHeight: 48 },
  buttonLabel: { fontSize: 16, fontWeight: "600" },
  footer: { fontSize: 14, marginTop: 18 },
});
