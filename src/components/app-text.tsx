import { StyleSheet, Text as RNText, TextInput as RNTextInput, type TextInputProps, type TextProps } from "react-native";

import { resolveFontFamily } from "@/lib/fonts";

// Drop-in replacements for react-native Text/TextInput that apply the brand
// fonts. `fontWeight` in a style picks the matching font file, and font scaling
// stays on so large text settings are respected.
export function Text({ style, heading = false, ...rest }: TextProps & { heading?: boolean }) {
  const flat = StyleSheet.flatten(style) as { fontFamily?: string; fontWeight?: string | number } | undefined;
  const fontFamily = resolveFontFamily(flat, heading);
  // Android ignores fontWeight once a custom family is set; the family carries the weight.
  return <RNText {...rest} style={[style, { fontFamily, fontWeight: undefined }]} />;
}

export function TextInput({ style, ...rest }: TextInputProps) {
  const flat = StyleSheet.flatten(style) as { fontFamily?: string; fontWeight?: string | number } | undefined;
  return <RNTextInput {...rest} style={[style, { fontFamily: resolveFontFamily(flat), fontWeight: undefined }]} />;
}
