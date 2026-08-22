import type { TextStyle } from "react-native";

/**
 * Font roles — identical strategy to production:
 *  - arabic  → 29LT Zarid Sans (static instances cut from the VF; each file's
 *    internal family/PostScript name is patched to match its key below —
 *    as exported they all shared one name, so iOS/CoreText registered only
 *    the first and every weight silently fell back to Regular)
 *  - heading → Agatho serif (EN display / brand moments)
 *  - body    → Manrope (EN UI)
 * Arabic gets a +8% size bump (smaller x-height than Manrope).
 */
export const BRAND_FONT_FILES = {
  "Agatho-Regular": require("../../assets/fonts/Agatho-Regular.otf"),
  "Agatho-Medium": require("../../assets/fonts/Agatho-Medium.otf"),
  "Agatho-Bold": require("../../assets/fonts/Agatho-Bold.otf"),
  "Manrope-Regular": require("../../assets/fonts/Manrope-Regular.otf"),
  "Manrope-Medium": require("../../assets/fonts/Manrope-Medium.otf"),
  "Manrope-SemiBold": require("../../assets/fonts/Manrope-SemiBold.otf"),
  "Manrope-Bold": require("../../assets/fonts/Manrope-Bold.otf"),
  "Manrope-ExtraBold": require("../../assets/fonts/Manrope-ExtraBold.otf"),
  "ZaridSans-Regular": require("../../assets/fonts/ZaridSans-Regular.ttf"),
  "ZaridSans-Medium": require("../../assets/fonts/ZaridSans-Medium.ttf"),
  "ZaridSans-SemiBold": require("../../assets/fonts/ZaridSans-SemiBold.ttf"),
  "ZaridSans-Bold": require("../../assets/fonts/ZaridSans-Bold.ttf"),
} as const;

export type FontRole = "heading" | "body" | "arabic";
export type FontWeight = "regular" | "medium" | "semibold" | "bold" | "extrabold";

/** Zarid has a smaller x-height than Manrope, so Arabic is scaled up… */
export const ARABIC_FONT_SCALE = 1.08;
/** …plus a flat +1px on top of the scale (client request, 2026-08-11). */
export const ARABIC_FONT_BUMP = 1;

/**
 * Arabic-aware size for a type role. The leading ratio of the role is kept, so
 * a bigger face also gets a proportionally taller line box — Arabic needs the
 * room for its descenders and diacritics.
 */
export function scaleType(fontSize: number, lineHeight: number, isArabic: boolean) {
  if (!isArabic) return { fontSize, lineHeight };
  const size = fontSize * ARABIC_FONT_SCALE + ARABIC_FONT_BUMP;
  return { fontSize: size, lineHeight: Math.round(size * (lineHeight / fontSize) * 10) / 10 };
}

/**
 * Same bump for raw <TextInput>s, which style themselves instead of going
 * through <AppText> — without this, typed Arabic stays smaller than the
 * labels above it.
 */
export function inputFontSize(base: number, isArabic: boolean): number {
  return isArabic ? base * ARABIC_FONT_SCALE + ARABIC_FONT_BUMP : base;
}

/**
 * Zarid Sans defaults to old-style (text) figures — 0/1/2 sit at x-height,
 * 6/8 ascend, 3/4/5/7/9 descend — so a run of digits looks vertically
 * misaligned. Every bundled Zarid weight carries the OpenType 'lnum' feature,
 * so force lining figures whenever the Arabic face is in use. Pair this with
 * every fontFamilyFor(…, isArabic) that can render digits.
 *
 * Returned as a spreadable fragment: native RN crashes on a present-but-empty
 * fontVariant key (processFontVariant calls .split on it), so the key must be
 * absent entirely in English mode.
 */
export function figuresFor(isArabic: boolean): Pick<TextStyle, "fontVariant"> | null {
  return isArabic ? { fontVariant: ["lining-nums"] } : null;
}

export function fontFamilyFor(role: FontRole, weight: FontWeight, isArabic: boolean): string {
  if (isArabic || role === "arabic") {
    switch (weight) {
      case "extrabold":
      case "bold":
        return "ZaridSans-Bold";
      case "semibold":
        return "ZaridSans-SemiBold";
      case "medium":
        return "ZaridSans-Medium";
      default:
        return "ZaridSans-Regular";
    }
  }
  if (role === "heading") {
    switch (weight) {
      case "extrabold":
      case "bold":
        return "Agatho-Bold";
      case "semibold":
      case "medium":
        return "Agatho-Medium";
      default:
        return "Agatho-Regular";
    }
  }
  switch (weight) {
    case "extrabold":
      return "Manrope-ExtraBold";
    case "bold":
      return "Manrope-Bold";
    case "semibold":
      return "Manrope-SemiBold";
    case "medium":
      return "Manrope-Medium";
    default:
      return "Manrope-Regular";
  }
}

export interface TypeVariant {
  fontSize: number;
  lineHeight: number;
  weight: FontWeight;
  role: FontRole;
}

/** Text roles used by <AppText role=…> — the only sizes screens may use. */
export const typeRoles = {
  display: { fontSize: 34, lineHeight: 42, weight: "bold", role: "heading" },
  screenTitle: { fontSize: 24, lineHeight: 31, weight: "bold", role: "heading" },
  h2: { fontSize: 19, lineHeight: 26, weight: "bold", role: "body" },
  sectionTitle: { fontSize: 15, lineHeight: 21, weight: "bold", role: "body" },
  cardTitle: { fontSize: 15.5, lineHeight: 22, weight: "semibold", role: "body" },
  body: { fontSize: 14, lineHeight: 21, weight: "regular", role: "body" },
  label: { fontSize: 13, lineHeight: 18, weight: "semibold", role: "body" },
  caption: { fontSize: 12, lineHeight: 17, weight: "regular", role: "body" },
  tiny: { fontSize: 10.5, lineHeight: 14, weight: "medium", role: "body" },
  button: { fontSize: 15, lineHeight: 20, weight: "bold", role: "body" },
  price: { fontSize: 16, lineHeight: 22, weight: "extrabold", role: "body" },
} as const satisfies Record<string, TypeVariant>;

export type TextRole = keyof typeof typeRoles;
