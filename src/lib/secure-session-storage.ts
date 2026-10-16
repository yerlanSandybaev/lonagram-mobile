import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { createChunkedSecureStorage, type KeyValueStore } from "@/lib/chunked-secure-storage";

const nativeStore: KeyValueStore = {
  getItem(key) {
    return SecureStore.getItemAsync(key);
  },
  setItem(key, value) {
    return SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  },
  removeItem(key) {
    return SecureStore.deleteItemAsync(key);
  },
};

const unsupportedStore: KeyValueStore = {
  async getItem() {
    return null;
  },
  async setItem() {
    throw new Error("Secure session storage is available on Android and iOS.");
  },
  async removeItem() {
    return undefined;
  },
};

const platformStore = Platform.OS === "ios" || Platform.OS === "android" ? nativeStore : unsupportedStore;

export const secureSessionStorage = createChunkedSecureStorage(platformStore);
