import React, { useState } from "react";
import { ActivityIndicator, Pressable, View, type ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/theme";
import { AppText } from "./AppText";
import { Icon, type IconName } from "./Icon";

type Variant = "primary" | "tonal" | "outline" | "ghost" | "danger";

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  style?: ViewStyle;
}

export function Button({ label, onPress, variant = "primary", icon, loading, disabled, small, style }: ButtonProps) {
  const { colors, radii, row, hit } = useTheme();
  const palette: Record<Variant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: colors.primary, fg: colors.textOnPrimary },
    tonal: { bg: colors.accent, fg: "#2E1A47" },
    outline: { bg: "transparent", fg: colors.text, border: colors.border },
    ghost: { bg: "transparent", fg: colors.primaryMuted },
    danger: { bg: colors.errorSurface, fg: colors.error },
  };
  const c = palette[variant];
  const height = small ? 38 : hit + 6;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress?.();
      }}
      style={({ pressed }) => [
        {
          height,
          borderRadius: radii.md,
          backgroundColor: c.bg,
          borderWidth: c.border ? 1.2 : 0,
          borderColor: c.border,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: small ? 14 : 20,
          opacity: disabled ? 0.45 : pressed ? 0.82 : 1,
          flexDirection: row,
          gap: 8,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={c.fg} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={small ? 16 : 19} color={c.fg} /> : null}
          <AppText role={small ? "label" : "button"} weight="bold" color={c.fg} align="center">
            {label}
          </AppText>
        </>
      )}
    </Pressable>
  );
}

/**
 * The signature Medilink CTA — soft angled trailing edge (brand p29),
 * automatically mirrored in RTL. One per screen: the primary action.
 */
export function CtaButton({
  label,
  onPress,
  icon,
  loading,
  disabled,
  tone = "primary",
  style,
}: {
  label: string;
  onPress?: () => void;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  tone?: "primary" | "lavender" | "white";
  style?: ViewStyle;
}) {
  const { colors, isRTL, row } = useTheme();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const tones = {
    primary: { bg: colors.primary, fg: colors.textOnPrimary },
    lavender: { bg: "#DFC8E7", fg: "#2E1A47" },
    white: { bg: "#FFFFFF", fg: "#2E1A47" },
  } as const;
  const c = tones[tone];
  const h = 54;
  const slant = 16;
  const r = 14;
  const w = size.w;

  // Rounded start edge, straight top, trailing edge slants inward to the bottom.
  const path =
    w > 0
      ? `M ${r} 0 H ${w - 4} Q ${w} 0 ${w - 1.2} 3 L ${w - slant + 2} ${h - 3} Q ${w - slant} ${h} ${w - slant - 4} ${h} H ${r} Q 0 ${h} 0 ${h - r} V ${r} Q 0 0 ${r} 0 Z`
      : "";

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress?.();
      }}
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h })}
      style={({ pressed }) => [
        { height: h, opacity: disabled ? 0.45 : pressed ? 0.85 : 1, justifyContent: "center" },
        style,
      ]}
    >
      {w > 0 ? (
        <Svg
          width={w}
          height={h}
          style={{ position: "absolute", transform: [{ scaleX: isRTL ? -1 : 1 }] }}
        >
          <Path d={path} fill={c.bg} />
        </Svg>
      ) : null}
      <View
        style={{
          flexDirection: row,
          gap: 10,
          alignItems: "center",
          justifyContent: "center",
          paddingEnd: slant,
        }}
      >
        {loading ? (
          <ActivityIndicator color={c.fg} />
        ) : (
          <>
            {icon ? <Icon name={icon} size={20} color={c.fg} strokeWidth={2} /> : null}
            <AppText role="button" color={c.fg} align="center">
              {label}
            </AppText>
          </>
        )}
      </View>
    </Pressable>
  );
}
