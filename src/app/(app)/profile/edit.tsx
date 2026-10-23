import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Stack, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { FormField, FormGroup } from "@/components/form-ui";
import { Avatar, PrimaryButton, QueryState } from "@/components/mobile-ui";
import { useTheme } from "@/hooks/use-theme";
import { loadMyBundle, saveProfile } from "@/lib/lonagram";
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
  async function choosePhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset) return;
    const resized = await ImageManipulator.manipulateAsync(
      asset.uri,
      [{ resize: { width: 384, height: 384 } }],
      { base64: true, compress: 0.6, format: ImageManipulator.SaveFormat.JPEG },
    );
    if (!resized.base64) return;
    const dataUrl = `data:image/jpeg;base64,${resized.base64}`;
    if ((resized.base64.length * 3) / 4 > 120_000 || dataUrl.length > 180_000) {
      Alert.alert(
        "Photo is too large",
        "Choose a simpler or smaller image and try again.",
      );
      return;
    }
    setValues((current) => ({ ...current, avatarUrl: dataUrl }));
  }
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
          <View style={{ alignItems: "center", gap: 10 }}>
            <Avatar
              name={values.displayName || "L"}
              uri={values.avatarUrl}
              size={96}
            />
            <Pressable
              onPress={() =>
                void choosePhoto().catch(() =>
                  Alert.alert("Could not open photo", "Please try again."),
                )
              }
            >
              <Text style={{ color: theme.primary, fontWeight: "800" }}>
                Choose profile photo
              </Text>
            </Pressable>
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
