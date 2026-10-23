import type { ReactNode } from "react";
import { StyleSheet, Text, TextInput, type TextInputProps, View } from "react-native";
import { Radius } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
export function FormField({ label, hint, ...props }: TextInputProps & { label: string; hint?: string }) { const theme = useTheme(); return <View style={{ gap: 7 }}><Text style={[styles.label, { color: theme.text }]}>{label}</Text><TextInput placeholderTextColor={theme.textSecondary} style={[styles.input, { backgroundColor: theme.backgroundElement, borderColor: theme.border, color: theme.text }, props.multiline ? styles.multiline : null]} {...props} accessibilityLabel={props.accessibilityLabel ?? label} />{hint ? <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{hint}</Text> : null}</View>; }
export function FormGroup({ children }: { children: ReactNode }) { return <View style={{ gap: 18 }}>{children}</View>; }
const styles = StyleSheet.create({ label: { fontSize: 14, fontWeight: "800" }, input: { borderRadius: Radius.md, borderWidth: 1, fontSize: 16, minHeight: 50, paddingHorizontal: 14, paddingVertical: 12 }, multiline: { minHeight: 104, textAlignVertical: "top" } });
