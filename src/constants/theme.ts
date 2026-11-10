import { Platform } from "react-native";

// Mirrors the web design system (docs/design-system.md): lavender-tinted white,
// deep ink, one violet primary, pastel panels, big radii.
export const palette = {
  ink: "#17122B", inkRaised: "#1F1836", inkSoft: "#271F40", violet: "#A78BFA",
  cream: "#F5F1FF", muted: "#B3ACC9", line: "rgba(255,255,255,0.2)",
  danger: "#FF8FA8", coral: "#FF7A9C",
} as const;

export { Pastels } from "./palette";

export const Colors = {
  light: {
    text: "#1B1533", background: "#FAF8FF", backgroundElement: "#FFFFFF",
    backgroundSelected: "#EDE7FF", textSecondary: "#5B5575", border: "#E4DEF5",
    danger: "#B3335A", primary: "#5B2EE0", accent: "#E8456F",
    success: "#1E9E6A", onPrimary: "#FFFFFF", tint: "#EDE7FF", tintText: "#3D1FA8", scrim: "rgba(27,21,51,0.8)",
  },
  dark: {
    text: palette.cream, background: palette.ink, backgroundElement: palette.inkRaised,
    backgroundSelected: palette.inkSoft, textSecondary: palette.muted, border: palette.line,
    danger: palette.danger, primary: palette.violet, accent: palette.coral,
    success: "#3DBE8A", onPrimary: "#17122B", tint: palette.inkSoft, tintText: "#DCD2FF", scrim: "rgba(27,21,51,0.8)",
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

// Custom fonts have one family per weight, so weights map to family names.
// System fallbacks keep text readable until (or if) the fonts fail to load.
export const FontFamilies = {
  body: { 500: "Manrope_500Medium", 600: "Manrope_600SemiBold", 700: "Manrope_700Bold", 800: "Manrope_800ExtraBold" },
  heading: { 700: "BricolageGrotesque_700Bold", 800: "BricolageGrotesque_800ExtraBold" },
} as const;

export const Fonts = Platform.select({
  ios: { sans: "system-ui", serif: "ui-serif", rounded: "ui-rounded", mono: "ui-monospace" },
  default: { sans: "normal", serif: "serif", rounded: "normal", mono: "monospace" },
  web: { sans: "system-ui", serif: "Georgia", rounded: "system-ui", mono: "monospace" },
})!;
export const Spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
// About 16 for cards and inputs, 24 for chat bubbles, buttons fully round.
export const Radius = { sm: 10, md: 16, lg: 16, xl: 20, bubble: 24, pill: 999 } as const;
export const Motion = { quick: 160, standard: 260, gentle: 420 } as const;
export const TouchTarget = { min: 44, primary: 52 } as const;
export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
