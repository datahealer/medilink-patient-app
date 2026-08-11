import React from "react";
import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/theme";
import { AppText } from "./AppText";
import { Icon, type IconName } from "./Icon";
import { LinkDots } from "./Decor";

/**
 * Branded identity avatar — deterministic pastel gradient from the entity's
 * hue + initials. A real photo (profile_photo_url) drops into the same frame
 * later without any layout change.
 */
export function Avatar({
  name,
  hue = 268,
  size = 52,
  radius,
}: {
  name: string;
  hue?: number;
  size?: number;
  radius?: number;
}) {
  const clean = name
    .replace(/^د\.\s*/, "")
    .replace(/^Dr\.?\s*/i, "")
    .trim();
  // Arabic letters don't form natural two-letter monograms — use one letter.
  const isArabic = /[؀-ۿ]/.test(clean);
  const initials = isArabic
    ? (clean[0] ?? "")
    : clean
        .split(/\s+/)
        .map((p) => p[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("");
  const r = radius ?? Math.round(size * 0.36);
  return (
    <LinearGradient
      colors={[`hsl(${hue}, 52%, 88%)`, `hsl(${(hue + 28) % 360}, 48%, 78%)`]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: r, alignItems: "center", justifyContent: "center" }}
    >
      <AppText
        role="cardTitle"
        weight="bold"
        color={`hsl(${hue}, 42%, 30%)`}
        style={{ fontSize: size * 0.34, lineHeight: size * 0.44 }}
      >
        {initials}
      </AppText>
    </LinearGradient>
  );
}

const CLINIC_ICON: Record<string, IconName> = {
  hospital: "building",
  clinic: "stethoscope",
  dental: "tooth",
  lab: "flask",
  physiotherapy: "dumbbell",
  optical: "eye",
  pharmacy: "pill",
};

/** Branded clinic cover — gradient + link-dots pattern + type watermark. */
export function ClinicCover({
  hue,
  type,
  height = 86,
  children,
}: {
  hue: number;
  type: string;
  height?: number;
  children?: React.ReactNode;
}) {
  return (
    <LinearGradient
      colors={[`hsl(${hue}, 55%, 90%)`, `hsl(${(hue + 26) % 360}, 52%, 80%)`]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ height, justifyContent: "center", overflow: "hidden" }}
    >
      <LinkDots color={`hsl(${hue}, 45%, 55%)`} opacity={0.18} />
      <View style={{ position: "absolute", end: -8, bottom: -12, opacity: 0.16 }}>
        <Icon name={CLINIC_ICON[type] ?? "building"} size={height * 0.9} color={`hsl(${hue}, 50%, 30%)`} strokeWidth={1.1} />
      </View>
      {children}
    </LinearGradient>
  );
}
