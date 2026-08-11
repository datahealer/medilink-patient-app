import React, { createContext, useContext, useMemo } from "react";
import { useColorScheme } from "react-native";
import { darkColors, lightColors, type ThemeColors } from "./colors";
import { HIT_TARGET, radii, shadow, spacing } from "./tokens";
import { useAppStore } from "@/stores/appStore";
import { useI18n } from "@/i18n";

export interface Theme {
  colors: ThemeColors;
  spacing: typeof spacing;
  radii: typeof radii;
  shadow: typeof shadow;
  hit: number;
  scheme: "light" | "dark";
}

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const mode = useAppStore((s) => s.mode);
  const system = useColorScheme();
  const scheme: "light" | "dark" = mode === "system" ? (system === "dark" ? "dark" : "light") : mode;

  const value = useMemo<Theme>(
    () => ({
      colors: scheme === "dark" ? darkColors : lightColors,
      spacing,
      radii,
      shadow,
      hit: HIT_TARGET,
      scheme,
    }),
    [scheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** The single hook every screen consumes: theme + direction together. */
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  const { isRTL, dir } = useI18n();
  return { ...ctx, isRTL, dir, row: (isRTL ? "row-reverse" : "row") as "row" | "row-reverse" };
}
