import { palette } from "./tokens";

/**
 * Semantic color roles — same 25-role contract as the production app
 * (mobile/src/theme/{light,dark}.ts) so the port is a value swap, not a refactor.
 */
export const lightColors = {
  background: palette.white,
  surface: palette.pureWhite,
  surfaceAlt: "#F4EEF9",
  text: palette.ink,
  textMuted: palette.muted,
  textFaint: palette.faint,
  textOnPrimary: "#FFFFFF",
  primary: palette.violet,
  primaryMuted: "#6E4AA0",
  accent: palette.lavender,
  accent2: palette.blue,
  border: palette.borderLight,
  inputBackground: palette.pureWhite,
  overlay: "rgba(36,19,56,0.45)",
  success: palette.success,
  successSurface: "#DCF3E7",
  warning: palette.warning,
  warningSurface: "#F8EED8",
  error: palette.error,
  errorSurface: "#FBE7EC",
  info: palette.info,
  infoSurface: "#E2ECF8",
  heroFrom: "#2E1A47",
  heroTo: "#3B2056",
} as const;

export type ThemeColors = Record<keyof typeof lightColors, string>;

/** Dark mode = derived deep-violet palette (per DARK_MODE_COLOR_AUDIT). */
export const darkColors: ThemeColors = {
  background: "#160E26",
  surface: "#221634",
  surfaceAlt: "#2B1D40",
  text: "#F1EBF8",
  textMuted: "#B4A8C6",
  textFaint: "#7E7493",
  textOnPrimary: "#241338",
  primary: "#DFC8E7",
  primaryMuted: "#6E4AA0",
  accent: "#4A3168",
  accent2: "#2F4A6B",
  border: "#3A2B53",
  inputBackground: "#2B1D40",
  overlay: "rgba(0,0,0,0.55)",
  success: "#5FCF9B",
  successSurface: "rgba(95,207,155,0.18)",
  warning: "#E0B25A",
  warningSurface: "rgba(224,178,90,0.16)",
  error: "#EF7D93",
  errorSurface: "rgba(239,125,147,0.18)",
  info: "#9CC1EE",
  infoSurface: "rgba(156,193,238,0.16)",
  heroFrom: "#2E1A47",
  heroTo: "#3B2056",
};
