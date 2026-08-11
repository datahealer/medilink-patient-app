import React from "react";
import { StyleSheet } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

/**
 * Brand decoration layers (guideline p27-28): soft orbs and the
 * connected-dots "link" pattern. Absolute-positioned, purely decorative.
 */
export function Orbs({ color = "#FFFFFF", opacity = 0.08 }: { color?: string; opacity?: number }) {
  return (
    <Svg style={StyleSheet.absoluteFill} viewBox="0 0 200 120" preserveAspectRatio="xMaxYMin slice">
      <Circle cx={185} cy={-6} r={55} fill={color} opacity={opacity} />
      <Circle cx={140} cy={95} r={38} fill={color} opacity={opacity * 0.8} />
      <Circle cx={12} cy={110} r={46} fill={color} opacity={opacity * 0.6} />
    </Svg>
  );
}

/** Two dots joined by a soft neck — the Medilink "link" metaball motif. */
export function LinkDots({ color = "#2E1A47", opacity = 0.12 }: { color?: string; opacity?: number }) {
  return (
    <Svg style={StyleSheet.absoluteFill} viewBox="0 0 220 100" preserveAspectRatio="xMinYMid slice">
      <Path
        d="M28 26a12 12 0 1 1 12 12c8 2 14 8 16 16a12 12 0 1 1-12-12c-8-2-14-8-16-16z"
        fill={color}
        opacity={opacity}
      />
      <Circle cx={92} cy={30} r={7} fill={color} opacity={opacity * 0.75} />
      <Path
        d="M150 52a10 10 0 1 1 10 10c7 1.6 12 6.6 13.5 13.5A10 10 0 1 1 163 65c-7-1.6-11.4-6-13-13z"
        fill={color}
        opacity={opacity * 0.9}
      />
      <Circle cx={205} cy={22} r={5} fill={color} opacity={opacity * 0.6} />
    </Svg>
  );
}
