import { FontFamilies } from "@/constants/theme";

type StyleLike = { fontFamily?: string; fontWeight?: string | number } | undefined;

// Pure helper: pick the concrete font family for a weight. Heading text uses
// Bricolage Grotesque (700/800); everything else uses Manrope (500–800).
export function resolveFontFamily(style: StyleLike, heading = false): string | undefined {
  if (style?.fontFamily) return style.fontFamily;
  const raw = style?.fontWeight;
  const weight = raw === "bold" ? 700 : Number(raw ?? 500) || 500;
  if (heading) return weight >= 800 ? FontFamilies.heading[800] : FontFamilies.heading[700];
  if (weight >= 800) return FontFamilies.body[800];
  if (weight >= 700) return FontFamilies.body[700];
  if (weight >= 600) return FontFamilies.body[600];
  return FontFamilies.body[500];
}
