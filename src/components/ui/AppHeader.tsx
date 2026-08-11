import React from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/theme";
import { AppText } from "./AppText";
import { Icon } from "./Icon";

interface AppHeaderProps {
  title?: string;
  /** Back button is never automatic — screens opt in explicitly. */
  back?: boolean;
  right?: React.ReactNode;
  transparent?: boolean;
  tint?: string;
}

export function AppHeader({ title, back, right, transparent, tint }: AppHeaderProps) {
  const { colors, spacing, isRTL, row, hit } = useTheme();
  const color = tint ?? colors.text;
  return (
    <View
      style={{
        flexDirection: row,
        alignItems: "center",
        paddingHorizontal: spacing.sm,
        height: 52,
        backgroundColor: transparent ? "transparent" : undefined,
      }}
    >
      <View style={{ width: hit, alignItems: "center" }}>
        {back ? (
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            accessibilityRole="button"
            style={({ pressed }) => ({
              width: 38,
              height: 38,
              borderRadius: 19,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: transparent ? colors.surface : colors.surfaceAlt,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Icon name={isRTL ? "arrow-right" : "arrow-left"} size={20} color={color} />
          </Pressable>
        ) : null}
      </View>
      <View style={{ flex: 1, alignItems: "center" }}>
        {title ? (
          <AppText role="cardTitle" weight="bold" color={color} align="center" numberOfLines={1}>
            {title}
          </AppText>
        ) : null}
      </View>
      <View style={{ minWidth: hit, flexDirection: row, alignItems: "center", justifyContent: "flex-end", gap: 6 }}>{right}</View>
    </View>
  );
}
