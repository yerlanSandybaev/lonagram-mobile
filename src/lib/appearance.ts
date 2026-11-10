import { Appearance } from "react-native";
import * as SecureStore from "expo-secure-store";

export type AppearanceChoice = "system" | "light" | "dark";
const KEY = "lonagram.appearance";

function apply(choice: AppearanceChoice) {
  // Not every platform (web) supports overriding the scheme; it then follows the system.
  try {
    Appearance.setColorScheme?.((choice === "system" ? "unspecified" : choice) as never);
  } catch {
    // ignore
  }
}

export async function loadAppearance(): Promise<AppearanceChoice> {
  try {
    const value = await SecureStore.getItemAsync(KEY);
    const choice: AppearanceChoice = value === "light" || value === "dark" ? value : "system";
    apply(choice);
    return choice;
  } catch {
    return "system";
  }
}

export async function setAppearance(choice: AppearanceChoice) {
  apply(choice);
  try {
    await SecureStore.setItemAsync(KEY, choice);
  } catch {
    // The choice still applies for this session.
  }
}
