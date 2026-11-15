import { StyleSheet, Text as RNText, TextInput as RNTextInput, type TextInputProps, type TextProps } from "react-native";

import { resolveFontFamily } from "@/lib/fonts";

// Drop-in replacements for react-native Text/TextInput that apply the brand
// fonts. `fontWeight` in a style picks the matching font file, and font scaling
// stays on so large text settings are respected.
//
// `content`: text that people or Twins write (messages, replies, answers, the chat field).
// It uses the system font so Kazakh, Russian and any other script display fully, and is
// shown and sent exactly as typed or returned.
export function Text({ style, heading = false, content = false, ...rest }: TextProps & { heading?: boolean; content?: boolean }) {
  const flat = StyleSheet.flatten(style) as { fontFamily?: string; fontWeight?: string | number } | undefined;
  const fontFamily = resolveFontFamily(flat, heading, content);
  // Android ignores fontWeight once a custom family is set; the family carries the weight.
  // The system font needs fontWeight itself.
  return <RNText {...rest} style={[style, fontFamily ? { fontFamily, fontWeight: undefined } : null]} />;
}

export function TextInput({ style, content = false, ...rest }: TextInputProps & { content?: boolean }) {
  const flat = StyleSheet.flatten(style) as { fontFamily?: string; fontWeight?: string | number } | undefined;
  const fontFamily = resolveFontFamily(flat, false, content);
  return <RNTextInput {...rest} style={[style, fontFamily ? { fontFamily, fontWeight: undefined } : null]} />;
}
