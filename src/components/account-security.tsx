import { useState, type ReactNode } from "react";
import { View } from "react-native";

import { Text } from "@/components/app-text";
import { FormField } from "@/components/form-ui";
import { PrimaryButton } from "@/components/mobile-ui";
import { Pastels, Radius } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
  changePassword,
  setRecoveryEmail,
  signOutOtherDevices,
  type AccountResult,
} from "@/lib/account";
import { getSupabase } from "@/lib/supabase";

// `email` is the confirmed recovery email from settings.get: "" when none is set,
// undefined when the server has not been updated to report it yet.
export function AccountSecurity({ email, loginEmail }: { email: string | undefined; loginEmail: string | undefined }) {
  const theme = useTheme();
  const [newEmail, setNewEmail] = useState("");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [state, setState] = useState<Record<string, AccountResult | "pending" | undefined>>({});
  const origin = process.env.EXPO_PUBLIC_LONAGRAM_API_URL;

  async function run(key: string, action: () => Promise<AccountResult>, onOk?: () => void) {
    if (state[key] === "pending") return;
    setState((all) => ({ ...all, [key]: "pending" }));
    const result = await action();
    setState((all) => ({ ...all, [key]: result }));
    if (result.ok) onOk?.();
  }
  const status = (key: string) => {
    const value = state[key];
    if (!value || value === "pending") return null;
    return value.ok ? (
      <Text accessibilityRole="summary" style={{ backgroundColor: theme.tint, borderRadius: Radius.md, color: theme.tintText, fontSize: 14, lineHeight: 20, overflow: "hidden", padding: 12 }}>
        {value.notice}
      </Text>
    ) : (
      <Text accessibilityRole="alert" style={{ color: theme.danger, fontSize: 14, lineHeight: 20 }}>{value.error}</Text>
    );
  };
  const pending = (key: string) => state[key] === "pending";
  const known = typeof email === "string";

  return (
    <View style={{ gap: 14 }}>
      <Card title="Recovery email" badge={known ? (email ? "Confirmed" : "Not set") : undefined} confirmed={Boolean(email)}>
        <Text style={{ color: theme.textSecondary, fontSize: 14, lineHeight: 21 }}>
          {email
            ? `Password reset links go to ${email}. We never show this email to other people.`
            : "Without a recovery email, nobody can reset your password if you forget it. Add one now."}
        </Text>
        <FormField
          label={email ? "New recovery email" : "Recovery email"}
          value={newEmail}
          onChangeText={setNewEmail}
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          keyboardType="email-address"
          maxLength={254}
          placeholder="you@example.com"
        />
        <PrimaryButton
          label={pending("email") ? "Please wait…" : "Send confirmation link"}
          disabled={pending("email") || !newEmail.trim()}
          onPress={() => void run("email", () => setRecoveryEmail(getSupabase(), newEmail, origin), () => setNewEmail(""))}
        />
        {status("email")}
      </Card>

      <Card title="Change password">
        <Text style={{ color: theme.textSecondary, fontSize: 14, lineHeight: 21 }}>You will need your current password.</Text>
        <FormField label="Current password" value={current} onChangeText={setCurrent} secureTextEntry autoCapitalize="none" autoComplete="current-password" />
        <FormField label="New password" value={next} onChangeText={setNext} secureTextEntry autoCapitalize="none" autoComplete="new-password" hint="Use at least 8 characters. A longer, unique password is safer." />
        <FormField label="Confirm new password" value={confirm} onChangeText={setConfirm} secureTextEntry autoCapitalize="none" autoComplete="new-password" />
        <PrimaryButton
          label={pending("password") ? "Please wait…" : "Update password"}
          disabled={pending("password") || !current || !next || !confirm}
          onPress={() =>
            void run(
              "password",
              () => changePassword(getSupabase(), { email: loginEmail, current, next, confirm }),
              () => {
                setCurrent("");
                setNext("");
                setConfirm("");
              },
            )
          }
        />
        {status("password")}
      </Card>

      <Card title="Devices">
        <Text style={{ color: theme.textSecondary, fontSize: 14, lineHeight: 21 }}>
          Signed in somewhere you no longer use? Sign out everywhere except here.
        </Text>
        <PrimaryButton
          label={pending("others") ? "Signing out other devices…" : "Sign out other devices"}
          disabled={pending("others")}
          onPress={() => void run("others", () => signOutOtherDevices(getSupabase()))}
        />
        {status("others")}
      </Card>
    </View>
  );
}

function Card({ title, badge, confirmed, children }: { title: string; badge?: string; confirmed?: boolean; children: ReactNode }) {
  const theme = useTheme();
  const tone = confirmed ? Pastels.green : Pastels.yellow;
  return (
    <View style={{ backgroundColor: theme.backgroundElement, borderColor: theme.border, borderRadius: Radius.xl, borderWidth: 1, gap: 12, padding: 20 }}>
      <View style={{ alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "space-between" }}>
        <Text heading accessibilityRole="header" style={{ color: theme.text, fontSize: 19, fontWeight: "800" }}>{title}</Text>
        {badge ? (
          <View style={{ backgroundColor: tone.bg, borderRadius: Radius.pill, paddingHorizontal: 12, paddingVertical: 4 }}>
            <Text style={{ color: tone.text, fontSize: 12, fontWeight: "800" }}>{badge}</Text>
          </View>
        ) : null}
      </View>
      {children}
    </View>
  );
}
