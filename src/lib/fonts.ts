import { FontFamilies } from "../constants/palette";

type StyleLike = { fontFamily?: string; fontWeight?: string | number } | undefined;

// Letters the brand fonts lack. Manrope has Russian but not these Kazakh letters, and
// Bricolage Grotesque has no Cyrillic at all. The phone would borrow them from another
// font mid-word, so text people and Twins write uses the system font instead
// (San Francisco on iOS, Roboto on Android), which covers Kazakh, Russian and more.
export const MANROPE_MISSING = "әғқңұӘҒҚҢҰ";

// Pure helper: pick the concrete font family for a weight. Heading text uses
// Bricolage Grotesque (700/800); everything else uses Manrope (500–800).
// `content` (messages and what people type) returns undefined: the system font.
export function resolveFontFamily(style: StyleLike, heading = false, content = false): string | undefined {
  if (style?.fontFamily) return style.fontFamily;
  if (content) return undefined;
  const raw = style?.fontWeight;
  const weight = raw === "bold" ? 700 : Number(raw ?? 500) || 500;
  if (heading) return weight >= 800 ? FontFamilies.heading[800] : FontFamilies.heading[700];
  if (weight >= 800) return FontFamilies.body[800];
  if (weight >= 700) return FontFamilies.body[700];
  if (weight >= 600) return FontFamilies.body[600];
  return FontFamilies.body[500];
}
