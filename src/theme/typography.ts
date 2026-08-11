/**
 * Font roles — identical strategy to production:
 *  - arabic  → 29LT Zarid Sans (static weights; VF default master is Thin)
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

export const ARABIC_FONT_SCALE = 1.08;

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
