// Dependency-free color constants, importable from tests (theme.ts pulls in react-native).
export const Pastels = {
  yellow: { bg: "#FFF1B8", text: "#5A4500" },
  green: { bg: "#D9F4E7", text: "#126B47" },
  pink: { bg: "#FFE3EC", text: "#A3204C" },
  blue: { bg: "#DCEBFF", text: "#1D4FB3" },
  lavender: { bg: "#EDE7FF", text: "#3D1FA8" },
  peach: { bg: "#FFD9C2", text: "#5A2D10" },
} as const;

// Custom fonts have one family per weight, so weights map to family names.
// System fallbacks keep text readable until (or if) the fonts fail to load.
export const FontFamilies = {
  body: { 500: "Manrope_500Medium", 600: "Manrope_600SemiBold", 700: "Manrope_700Bold", 800: "Manrope_800ExtraBold" },
  heading: { 700: "BricolageGrotesque_700Bold", 800: "BricolageGrotesque_800ExtraBold" },
} as const;
