import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, View } from "react-native";
import { useTheme } from "@/theme";
import { AppText } from "./AppText";

/**
 * Narrated waiting — instead of a mute skeleton, tell the patient what is
 * happening ("loading your visits…", "finding clinics near you…"). Messages
 * cross-fade on a fixed cadence; the last one holds until the caller unmounts
 * us (data arrived). Perceived speed is communication, not silence.
 */
export function LoadingNarrator({
  messages,
  intervalMs = 1600,
  align = "center",
}: {
  /** Already-translated lines, shown in order; the last one holds. */
  messages: string[];
  intervalMs?: number;
  align?: "center" | "start";
}) {
  const { colors, row } = useTheme();
  const [index, setIndex] = useState(0);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 350, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    if (index >= messages.length - 1) return;
    const t = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 220, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() => {
        setIndex((i) => Math.min(i + 1, messages.length - 1));
      });
    }, intervalMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, messages.length]);

  return (
    <View
      style={{
        flexDirection: row,
        gap: 8,
        alignItems: "center",
        justifyContent: align === "center" ? "center" : "flex-start",
      }}
      accessibilityLiveRegion="polite"
    >
      <Pulse color={colors.primaryMuted} />
      <Animated.View style={{ opacity }}>
        <AppText role="caption" color={colors.textMuted}>
          {messages[index]}
        </AppText>
      </Animated.View>
    </View>
  );
}

/** Three soft dots breathing in sequence — quieter than a spinner. */
function Pulse({ color }: { color: string }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return (
    <Animated.View style={{ flexDirection: "row", gap: 3, opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }) }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: color }} />
      ))}
    </Animated.View>
  );
}
