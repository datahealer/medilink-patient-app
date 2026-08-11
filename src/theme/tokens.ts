/**
 * Raw brand tokens — Medilink Brand Identity Guidelines V1.
 * Never import from screens; screens consume semantic ThemeColors via useTheme().
 * Mirrors mobile/src/theme/tokens.ts in the production repo for a mechanical port.
 */
export const brand = {
  violet: "#2E1A47", // Russian Violet — primary
  lavender: "#DFC8E7", // Shocking Lavender — accent
  blue: "#C3D7EE", // Smooth Pastel Blue — accent 2
  white: "#F9F4FA", // Eye White — surface
} as const;

export const palette = {
  violet: brand.violet,
  violet900: "#1C1030",
  violet800: "#241640",
  violet700: "#3A2560",
  violet600: "#4A3168",
  lavender: brand.lavender,
  lavender200: "#E8DCF1",
  lavender100: "#F1E8F7",
  blue: brand.blue,
  blue100: "#E2ECF8",
  white: brand.white,
  pureWhite: "#FFFFFF",
  ink: "#241338",
  muted: "#6C6379",
  faint: "#9A92A8",
  borderLight: "#E8E0F0",
  // Semantic status — carry meaning only, never decorative.
  success: "#2F8F63",
  warning: "#B07D12",
  error: "#C93B56",
  info: "#3B6AA8",
} as const;

/** 8-pt spatial grid. */
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;

/** Corner radii — buttons use md (14); pill reserved for chips. */
export const radii = { sm: 8, md: 14, lg: 22, xl: 28, pill: 999 } as const;

/** Minimum touch target (pt). */
export const HIT_TARGET = 44;

/** Soft elevation presets tuned for the Eye White canvas. */
export const shadow = (level: 1 | 2 | 3) =>
  ({
    1: {
      shadowColor: palette.violet,
      shadowOpacity: 0.06,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    2: {
      shadowColor: palette.violet,
      shadowOpacity: 0.1,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 5,
    },
    3: {
      shadowColor: palette.violet,
      shadowOpacity: 0.16,
      shadowRadius: 26,
      shadowOffset: { width: 0, height: 12 },
      elevation: 9,
    },
  })[level];
