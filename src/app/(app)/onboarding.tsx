import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { Stack, useRouter } from "expo-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text, TextInput } from "@/components/app-text";
import { Avatar, PrimaryButton } from "@/components/mobile-ui";
import { PrivateTwinChat } from "@/components/private-twin-chat";
import { Radius } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { completeOnboarding, loadMyBundle } from "@/lib/lonagram";
import {
  INTENTIONS,
  MAIN_LANGUAGES,
  OTHER_LANGUAGES,
  PHOTO_MAX_SIDE,
  PRESETS,
  SUGGESTED_INTERESTS,
  cleanUsername,
  deviceLanguage,
  quickOnboardingInput,
  smallJpegDataUrl,
  stepOneError,
  stepTwoError,
  toggleInterest,
  twinGreeting,
  type PrivacyPreset,
} from "@/lib/quick-onboarding";
import { useAuth } from "@/providers/auth-provider";

const TITLES = ["Who are you?", "What are you into?", "Meet your Twin"];
const SUBTITLES = [
  "Your name and photo. That's all for now.",
  "Tap what fits. Your Twin starts from here.",
  "Your Twin talks for you when you are away. Tell it a little about you so it sounds like you.",
];

function phoneLocale(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    return undefined;
  }
}

export default function OnboardingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const cache = useQueryClient();
  const { session } = useAuth();
  const userId = session!.user.id;
  const bundle = useQuery({ queryKey: ["bundle", userId], queryFn: () => loadMyBundle(userId) });
  const initialized = useRef(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [needsAdult, setNeedsAdult] = useState(false);
  const [adult, setAdult] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);
  const [interestDraft, setInterestDraft] = useState("");
  const [intentions, setIntentions] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>(() => [deviceLanguage(phoneLocale())]);
  const [showOther, setShowOther] = useState(false);
  const [preset, setPreset] = useState<PrivacyPreset>("balanced");

  useEffect(() => {
    if (!bundle.data || initialized.current) return;
    initialized.current = true;
    const { profile } = bundle.data;
    setDisplayName(profile.displayName);
    setUsername(profile.username);
    setAvatarUrl(profile.avatarUrl);
    // Accounts made with Google or Apple did not pass the sign-up checkbox.
    setNeedsAdult(!profile.is18Plus);
  }, [bundle.data]);

  const save = useMutation({
    mutationFn: () =>
      completeOnboarding(
        quickOnboardingInput({ username, displayName, avatarUrl, interests, intentions, languages, preset, adultConfirmation: needsAdult && adult }),
      ),
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: ["bundle", userId] });
      setStep(2);
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : "Could not save. Try again."),
  });

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], mediaTypes: ["images"], quality: 1 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setPhotoBusy(true);
    try {
      const resize = asset.width >= asset.height ? { width: Math.min(asset.width, PHOTO_MAX_SIDE) } : { height: Math.min(asset.height, PHOTO_MAX_SIDE) };
      const url = await smallJpegDataUrl(async (quality) => {
        const out = await ImageManipulator.manipulateAsync(asset.uri, [{ resize }], { base64: true, compress: quality, format: ImageManipulator.SaveFormat.JPEG });
        return out.base64;
      });
      setAvatarUrl(url);
      setError("");
    } catch {
      setError("This photo could not be read. Try a JPEG, PNG or WebP picture.");
    } finally {
      setPhotoBusy(false);
    }
  }

  function next() {
    if (step === 0) {
      const problem = stepOneError({ displayName, username }) ?? (needsAdult && !adult ? "Confirm that you are 18 or older." : null);
      if (problem) return setError(problem);
      setError("");
      return setStep(1);
    }
    const problem = stepTwoError({ interests, intentions, languages });
    if (problem) return setError(problem);
    setError("");
    save.mutate();
  }

  const toggle = (list: string[], value: string, set: (next: string[]) => void) =>
    set(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);

  const header = (
    <View style={{ gap: 8, paddingHorizontal: 20, paddingTop: 12 }}>
      <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: "700" }}>Step {step + 1} of 3</Text>
      <View style={{ backgroundColor: theme.tint, borderRadius: 3, height: 6, overflow: "hidden" }}>
        <View style={{ backgroundColor: theme.primary, height: 6, width: `${Math.round(((step + 1) / 3) * 100)}%` }} />
      </View>
      <Text heading accessibilityRole="header" style={{ color: theme.text, fontSize: 30, fontWeight: "800", marginTop: 12 }}>
        {TITLES[step]}
      </Text>
      <Text style={{ color: theme.textSecondary, fontSize: 15, lineHeight: 22 }}>{SUBTITLES[step]}</Text>
    </View>
  );

  if (step === 2)
    return (
      <SafeAreaView edges={["top", "left", "right"]} style={{ backgroundColor: theme.background, flex: 1 }}>
        <Stack.Screen options={{ headerShown: false }} />
        {header}
        <View style={{ flex: 1 }}>
          <PrivateTwinChat greeting={twinGreeting(displayName)} showQuestions={false} showMemoriesLink={false} placeholder="A few words is enough" bottomInset={false} />
        </View>
        <View style={{ paddingBottom: 16, paddingHorizontal: 20 }}>
          <PrimaryButton label="Go to Lonagram" onPress={() => router.replace("/")} />
        </View>
      </SafeAreaView>
    );

  return (
    <SafeAreaView edges={["top", "left", "right", "bottom"]} style={{ backgroundColor: theme.background, flex: 1 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ alignSelf: "center", gap: 24, maxWidth: 560, paddingBottom: 24, width: "100%" }}>
          {header}
          {step === 0 ? (
            <View style={{ gap: 20, paddingHorizontal: 20 }}>
              <Pressable accessibilityRole="button" disabled={photoBusy} onPress={() => void pickPhoto()} style={{ alignItems: "center", flexDirection: "row", gap: 16, minHeight: 44 }}>
                <Avatar name={displayName || "You"} uri={avatarUrl} size={64} />
                <Text style={{ color: theme.primary, fontSize: 15, fontWeight: "800" }}>
                  {photoBusy ? "Preparing photo…" : avatarUrl ? "Change photo" : "Add a photo"}
                </Text>
              </Pressable>
              <Field label="Your name">
                <Input value={displayName} onChangeText={(value) => setDisplayName(value.slice(0, 40))} autoComplete="name" />
              </Field>
              <Field label="Username" hint="You also sign in with it.">
                <Input value={username} onChangeText={(value) => setUsername(cleanUsername(value))} autoCapitalize="none" autoComplete="username" autoCorrect={false} />
              </Field>
              {needsAdult ? (
                <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: adult }} onPress={() => setAdult((value) => !value)} style={{ alignItems: "center", flexDirection: "row", gap: 12, minHeight: 44 }}>
                  <View style={{ alignItems: "center", backgroundColor: adult ? theme.primary : "transparent", borderColor: adult ? theme.primary : theme.textSecondary, borderRadius: 6, borderWidth: 1.5, height: 22, justifyContent: "center", width: 22 }}>
                    {adult ? <Ionicons color={theme.onPrimary} name="checkmark" size={16} /> : null}
                  </View>
                  <Text style={{ color: theme.text, flex: 1, fontSize: 15 }}>I am 18 or older.</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <View style={{ gap: 24, paddingHorizontal: 20 }}>
              <Group label="You like">
                <Chips>
                  {[...SUGGESTED_INTERESTS, ...interests.filter((item) => !(SUGGESTED_INTERESTS as readonly string[]).includes(item))].map((item) => (
                    <Chip key={item} label={item} selected={interests.includes(item)} onPress={() => setInterests((list) => toggleInterest(list, item))} />
                  ))}
                </Chips>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Input
                      value={interestDraft}
                      onChangeText={setInterestDraft}
                      placeholder="Something else"
                      returnKeyType="done"
                      onSubmitEditing={() => {
                        setInterests((list) => toggleInterest(list, interestDraft));
                        setInterestDraft("");
                      }}
                    />
                  </View>
                  <Chip
                    label="Add"
                    selected={false}
                    disabled={interestDraft.trim().length < 2}
                    onPress={() => {
                      setInterests((list) => toggleInterest(list, interestDraft));
                      setInterestDraft("");
                    }}
                  />
                </View>
              </Group>
              <Group label="You are here for">
                <Chips>
                  {INTENTIONS.map((item) => (
                    <Chip key={item.id} label={item.label} selected={intentions.includes(item.id)} onPress={() => toggle(intentions, item.id, setIntentions)} />
                  ))}
                </Chips>
              </Group>
              <Group label="You speak">
                <Chips>
                  {[...MAIN_LANGUAGES, ...languages.filter((item) => !(MAIN_LANGUAGES as readonly string[]).includes(item))].map((item) => (
                    <Chip key={item} label={item} selected={languages.includes(item)} onPress={() => toggle(languages, item, setLanguages)} />
                  ))}
                  <Chip label="Other…" selected={showOther} onPress={() => setShowOther((value) => !value)} />
                </Chips>
                {showOther ? (
                  <Chips>
                    {OTHER_LANGUAGES.filter((item) => !languages.includes(item)).map((item) => (
                      <Chip key={item} label={item} selected={false} onPress={() => toggle(languages, item, setLanguages)} />
                    ))}
                  </Chips>
                ) : null}
              </Group>
              <Group label="Who can talk to your Twin">
                {PRESETS.map((item) => {
                  const selected = preset === item.id;
                  return (
                    <Pressable
                      key={item.id}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      onPress={() => setPreset(item.id)}
                      style={{ backgroundColor: selected ? theme.tint : "transparent", borderColor: selected ? theme.primary : theme.border, borderRadius: Radius.md, borderWidth: 1, gap: 4, padding: 14 }}
                    >
                      <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={{ color: theme.text, fontSize: 15, fontWeight: "800" }}>{item.title}</Text>
                        {item.recommended ? <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Recommended</Text> : null}
                      </View>
                      <Text style={{ color: theme.textSecondary, fontSize: 13, lineHeight: 19 }}>{item.text}</Text>
                    </Pressable>
                  );
                })}
                <Text style={{ color: theme.textSecondary, fontSize: 12 }}>You can change every detail later in Settings.</Text>
              </Group>
            </View>
          )}
          {error ? (
            <Text accessibilityRole="alert" style={{ color: theme.danger, fontSize: 14, paddingHorizontal: 20 }}>
              {error}
            </Text>
          ) : null}
        </ScrollView>
        <View style={{ flexDirection: "row", gap: 10, paddingBottom: 12, paddingHorizontal: 20, paddingTop: 8 }}>
          {step > 0 ? (
            <Pressable
              accessibilityRole="button"
              disabled={save.isPending}
              onPress={() => {
                setError("");
                setStep(step - 1);
              }}
              style={{ alignItems: "center", borderColor: theme.border, borderRadius: Radius.pill, borderWidth: 1, justifyContent: "center", minHeight: 52, paddingHorizontal: 22 }}
            >
              <Text style={{ color: theme.text, fontSize: 16, fontWeight: "800" }}>Back</Text>
            </Pressable>
          ) : null}
          <View style={{ flex: 1 }}>
            <PrimaryButton
              label={save.isPending ? "Saving…" : step === 1 ? "Create my Twin" : "Continue"}
              disabled={save.isPending || photoBusy || !bundle.data}
              onPress={next}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: theme.text, fontSize: 14, fontWeight: "700" }}>{label}</Text>
      {children}
      {hint ? <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{hint}</Text> : null}
    </View>
  );
}

function Input(props: React.ComponentProps<typeof TextInput>) {
  const theme = useTheme();
  return (
    <TextInput
      placeholderTextColor={theme.textSecondary}
      {...props}
      style={{ borderColor: theme.border, borderRadius: Radius.md, borderWidth: 1, color: theme.text, fontSize: 16, minHeight: 48, paddingHorizontal: 14 }}
    />
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: theme.text, fontSize: 14, fontWeight: "700" }}>{label}</Text>
      {children}
    </View>
  );
}

function Chips({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{children}</View>;
}

function Chip({ label, selected, onPress, disabled }: { label: string; selected: boolean; onPress: () => void; disabled?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={{
        alignItems: "center",
        backgroundColor: selected ? theme.primary : "transparent",
        borderColor: selected ? theme.primary : theme.border,
        borderRadius: Radius.pill,
        borderWidth: 1,
        justifyContent: "center",
        minHeight: 44,
        opacity: disabled ? 0.5 : 1,
        paddingHorizontal: 16,
      }}
    >
      <Text style={{ color: selected ? theme.onPrimary : theme.text, fontSize: 14, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}
