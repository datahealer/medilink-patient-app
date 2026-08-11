import React from "react";
import { Text, type StyleProp, type TextProps, type TextStyle } from "react-native";
import { useTheme } from "@/theme";
import { ARABIC_FONT_SCALE, fontFamilyFor, typeRoles, type FontWeight, type TextRole } from "@/theme/typography";

export interface AppTextProps extends Omit<TextProps, "role"> {
  role?: TextRole;
  color?: string;
  weight?: FontWeight;
  align?: "auto" | "start" | "center" | "end";
  /** Force the serif display face even for short Arabic-mode English snippets. */
  serif?: boolean;
  style?: StyleProp<TextStyle>;
}

/**
 * The only text component screens may use. Handles the Arabic font swap,
 * the Arabic size bump, and start/end alignment under manual RTL.
 */
export function AppText({
  role = "body",
  color,
  weight,
  align = "start",
  serif,
  style,
  children,
  ...rest
}: AppTextProps) {
  const { colors, isRTL } = useTheme();
  const variant = typeRoles[role];
  const w = weight ?? variant.weight;
  const family = fontFamilyFor(serif ? "heading" : variant.role, w, isRTL);
  const scale = isRTL ? ARABIC_FONT_SCALE : 1;

  const textAlign: TextStyle["textAlign"] =
    align === "center" ? "center" : align === "auto" ? undefined : (align === "start") === !isRTL ? "left" : "right";

  return (
    <Text
      {...rest}
      style={[
        {
          fontFamily: family,
          fontSize: variant.fontSize * scale,
          lineHeight: variant.lineHeight * scale,
          color: color ?? colors.text,
          textAlign,
          writingDirection: isRTL ? "rtl" : "ltr",
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
