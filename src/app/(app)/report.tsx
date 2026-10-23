import { useMutation } from "@tanstack/react-query";
import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text } from "react-native";
import { FormField } from "@/components/form-ui";
import { PrimaryButton } from "@/components/mobile-ui";
import { useTheme } from "@/hooks/use-theme";
import { reportProfile } from "@/lib/lonagram";
import { useAuth } from "@/providers/auth-provider";

const reasons = [
  "spam",
  "scam",
  "harassment",
  "impersonation",
  "underage",
  "other",
] as const;
export default function ReportScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const { session } = useAuth();
  const theme = useTheme();
  const [reason, setReason] = useState<string>("other");
  const [details, setDetails] = useState("");
  const report = useMutation({
    mutationFn: () => reportProfile(session!.user.id, id, reason, details),
  });
  return (
    <ScrollView
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        flexGrow: 1,
        backgroundColor: theme.background,
        padding: 24,
        gap: 16,
      }}
    >
      <Stack.Screen
        options={{ headerShown: true, title: `Report ${name ?? "profile"}` }}
      />
      <Text style={{ color: theme.textSecondary }}>
        Choose a reason. Your report is sent to Lonagram for review.
      </Text>
      {reasons.map((value) => (
        <Pressable
          key={value}
          accessibilityRole="radio"
          accessibilityState={{ checked: value === reason }}
          disabled={report.isPending || report.isSuccess}
          onPress={() => setReason(value)}
          style={{
            minHeight: 48,
            padding: 12,
            backgroundColor: theme.backgroundElement,
            borderRadius: 12,
            borderWidth: value === reason ? 2 : 0,
            borderColor: theme.primary,
          }}
        >
          <Text style={{ color: theme.text, textTransform: "capitalize" }}>
            {value}
          </Text>
        </Pressable>
      ))}
      <FormField
        label="Details (optional)"
        multiline
        maxLength={500}
        editable={!report.isPending && !report.isSuccess}
        value={details}
        onChangeText={setDetails}
      />
      {report.error ? (
        <Text accessibilityRole="alert" style={{ color: theme.danger }}>
          {report.error.message}
        </Text>
      ) : null}
      <PrimaryButton
        label={
          report.isSuccess
            ? "Report received"
            : report.isPending
              ? "Sending report…"
              : "Submit report"
        }
        disabled={report.isPending || report.isSuccess}
        onPress={() => report.mutate()}
      />
    </ScrollView>
  );
}
