import React from "react";
import { ScrollView, View, type ViewStyle } from "react-native";
import { useTheme } from "@/theme";

/**
 * RTL-correct horizontal carousel. Under manual RTL the scroll view is
 * mirrored so the FIRST item sits at the visual right edge (where an Arabic
 * reader starts); each child is mirrored back. LTR renders untouched.
 */
export function HScroll({
  children,
  gap = 10,
  bleed = 0,
  style,
}: {
  children: React.ReactNode;
  gap?: number;
  /** Negative-margin bleed so cards can run to the screen edge. */
  bleed?: number;
  style?: ViewStyle;
}) {
  const { isRTL } = useTheme();
  const flip = isRTL ? { transform: [{ scaleX: -1 }] as const } : undefined;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[flip, bleed ? { marginHorizontal: -bleed } : null, style]}
      contentContainerStyle={{ gap, flexDirection: "row", paddingHorizontal: bleed }}
    >
      {React.Children.map(children, (child) =>
        child == null ? null : <View style={flip}>{child}</View>,
      )}
    </ScrollView>
  );
}
