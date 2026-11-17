import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useEffect, useRef, useState } from "react";
import { Pressable } from "react-native";

import { useTheme } from "@/hooks/use-theme";

// Small Copy icon under a Twin's reply. Shows a check for a moment after copying.
export function CopyButton({ text }: { text: string }) {
  const theme = useTheme();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  async function copy() {
    try {
      await Clipboard.setStringAsync(text);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // Copy is a convenience; the text stays selectable.
    }
  }
  return (
    <Pressable
      accessibilityLabel={copied ? "Copied" : "Copy reply"}
      accessibilityRole="button"
      onPress={() => void copy()}
      style={{ alignItems: "center", height: 32, justifyContent: "center", marginLeft: -6, width: 32 }}
    >
      <Ionicons color={theme.textSecondary} name={copied ? "checkmark" : "copy-outline"} size={16} />
    </Pressable>
  );
}
