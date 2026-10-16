import { Platform } from "react-native";

export const palette = {
  ink: "#0B0912", inkRaised: "#171321", inkSoft: "#211A2F", lavender: "#A78BFA",
  lavenderSoft: "#D7CBFF", blush: "#E9A8D7", cream: "#F8F6FC", muted: "#A8A2B5",
  line: "#2B2438", danger: "#FF8C9D", success: "#78D6AE",
} as const;

export const Colors = {
  light: {
    text: "#18131F", background: "#FBF8FC", backgroundElement: "#F1EAF5",
    backgroundSelected: "#E6DBF3", textSecondary: "#6D6575", border: "#E3D9E8",
    danger: "#B4234A", primary: "#7655D6", accent: "#B95799",
  },
  dark: {
    text: palette.cream, background: palette.ink, backgroundElement: palette.inkRaised,
    backgroundSelected: palette.inkSoft, textSecondary: palette.muted, border: palette.line,
    danger: palette.danger, primary: palette.lavender, accent: palette.blush,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
export const Fonts = Platform.select({
  ios: { sans: "system-ui", serif: "ui-serif", rounded: "ui-rounded", mono: "ui-monospace" },
  default: { sans: "normal", serif: "serif", rounded: "normal", mono: "monospace" },
  web: { sans: "system-ui", serif: "Georgia", rounded: "system-ui", mono: "monospace" },
})!;
export const Spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
export const Radius = { sm: 10, md: 16, lg: 24, pill: 999 } as const;
export const Motion = { quick: 160, standard: 260, gentle: 420 } as const;
export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
