import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Stack, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/components/app-text";
import { FormField, FormGroup } from "@/components/form-ui";
import { Avatar, PrimaryButton, QueryState } from "@/components/mobile-ui";
import { Radius } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { loadMyBundle, saveProfile } from "@/lib/lonagram";
import { PHOTO_MAX_SIDE, smallJpegDataUrl } from "@/lib/quick-onboarding";
import { useAuth } from "@/providers/auth-provider";

export default function EditProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const userId = session!.user.id;
  const bundle = useQuery({
    queryKey: ["bundle", userId],
    queryFn: () => loadMyBundle(userId),
  });
  const [values, setValues] = useState({
    username: "",
    displayName: "",
    bio: "",
    avatarUrl: null as string | null,
    city: "",
    languages: "",
    intentions: "",
    interests: "",
  });
  const initialized = useRef(false);
  useEffect(() => {
    if (!bundle.data || initialized.current) return;
    initialized.current = true;
    const { profile, interests } = bundle.data;
    setValues({
      username: profile.username,
      displayName: profile.displayName,
      bio: profile.bio,
      avatarUrl: profile.avatarUrl,
      city: profile.city ?? "",
      languages: profile.languages.join(", "),
      intentions: profile.intentions.join(", "),
      interests: interests.join(", "),
    });
  }, [bundle.data]);
  const save = useMutation({
    mutationFn: () =>
      saveProfile(
        userId,
        {
          username: values.username,
          displayName: values.displayName,
          bio: values.bio,
          avatarUrl: values.avatarUrl,
          city: values.city,
          languages: split(values.languages),
          intentions: split(values.intentions),
        },
        split(values.interests),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["bundle", userId] });
      router.back();
    },
    onError: (error) => Alert.alert("Could not save profile", error.message),
  });
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");
  // Resized on the device to a small JPEG before it is sent (server limit 120 KB).
  async function choosePhoto() {
    if (photoBusy) return;
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
      setValues((current) => ({ ...current, avatarUrl: url }));
      setPhotoError("");
    } catch {
      setPhotoError("This photo could not be used. Try a smaller PNG, JPEG, GIF or WebP picture.");
    } finally {
      setPhotoBusy(false);
    }
  }
  const pickPhoto = () => void choosePhoto().catch(() => setPhotoError("Could not open your photos. Please try again."));
  const hasPhoto = Boolean(values.avatarUrl);
  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: "Edit profile" }} />
      <ScrollView
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { backgroundColor: theme.background },
        ]}
      >
        <QueryState loading={bundle.isLoading} error={bundle.error}>
          <View style={{ gap: 10 }}>
            <View style={{ alignItems: "center", flexDirection: "row", gap: 16 }}>
              <Pressable
                accessibilityHint="Opens your photos"
                accessibilityLabel={hasPhoto ? "Change profile photo" : "Upload profile photo"}
                accessibilityRole="button"
                disabled={photoBusy}
                onPress={pickPhoto}
                style={{ height: 80, width: 80 }}
              >
                <Avatar name={values.displayName || "L"} uri={values.avatarUrl} size={80} />
                <View
                  style={{
                    alignItems: "center",
                    backgroundColor: theme.text,
                    borderColor: theme.background,
                    borderRadius: Radius.pill,
                    borderWidth: 2,
                    bottom: -4,
                    flexDirection: "row",
                    gap: 3,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    position: "absolute",
                    right: -6,
                  }}
                >
                  <Ionicons color={theme.background} name="camera" size={11} />
                  <Text style={{ color: theme.background, fontSize: 11, fontWeight: "800" }}>Change</Text>
                </View>
              </Pressable>
              <View style={{ alignItems: "flex-start", flex: 1, gap: 4 }}>
                <Pressable
                  accessibilityRole="button"
                  disabled={photoBusy}
                  onPress={pickPhoto}
                  style={{ alignItems: "center", borderColor: theme.border, borderRadius: Radius.pill, borderWidth: 1, justifyContent: "center", minHeight: 44, paddingHorizontal: 18 }}
                >
                  <Text style={{ color: theme.text, fontSize: 14, fontWeight: "800" }}>
                    {photoBusy ? "Preparing…" : hasPhoto ? "Change photo" : "Upload photo"}
                  </Text>
                </Pressable>
                {hasPhoto ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={photoBusy}
                    onPress={() => setValues((current) => ({ ...current, avatarUrl: null }))}
                    style={{ justifyContent: "center", minHeight: 36, paddingHorizontal: 6 }}
                  >
                    <Text style={{ color: theme.textSecondary, fontSize: 14, fontWeight: "700" }}>Remove</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
            <Text style={{ color: theme.textSecondary, fontSize: 13, lineHeight: 19 }}>
              Optional. PNG, JPEG, GIF, or WebP under 120 KB. Skipping keeps your current photo.
            </Text>
            {photoError ? (
              <Text accessibilityRole="alert" style={{ color: theme.danger, fontSize: 13 }}>
                {photoError}
              </Text>
            ) : null}
          </View>
          <FormGroup>
            <FormField
              label="Display name"
              value={values.displayName}
              onChangeText={(displayName) =>
                setValues((v) => ({ ...v, displayName }))
              }
            />
            <FormField
              label="Username"
              autoCapitalize="none"
              value={values.username}
              onChangeText={(username) =>
                setValues((v) => ({ ...v, username }))
              }
            />
            <FormField
              label="Bio"
              multiline
              maxLength={280}
              value={values.bio}
              onChangeText={(bio) => setValues((v) => ({ ...v, bio }))}
            />
            <FormField
              label="City"
              value={values.city}
              onChangeText={(city) => setValues((v) => ({ ...v, city }))}
            />
            <FormField
              label="Interests"
              hint="Separate with commas"
              value={values.interests}
              onChangeText={(interests) =>
                setValues((v) => ({ ...v, interests }))
              }
            />
            <FormField
              label="Languages"
              hint="Separate with commas"
              value={values.languages}
              onChangeText={(languages) =>
                setValues((v) => ({ ...v, languages }))
              }
            />
            <FormField
              label="Intentions"
              hint="friendship, dating, professional, casual, shared_interests"
              value={values.intentions}
              onChangeText={(intentions) =>
                setValues((v) => ({ ...v, intentions }))
              }
            />
            <PrimaryButton
              label={save.isPending ? "Saving…" : "Save profile"}
              disabled={save.isPending}
              onPress={() => save.mutate()}
            />
          </FormGroup>
        </QueryState>
      </ScrollView>
    </>
  );
}
function split(value: string) {
  return [
    ...new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}
const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: 24, padding: 20 },
});
