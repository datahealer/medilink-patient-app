import React from "react";
import { Pressable, View } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme";
import { useI18n } from "@/i18n";
import { AppText } from "./AppText";
import { Icon, type IconName } from "./Icon";

// The "Me" assistant tab is hidden for now (client feedback 2026-08-20) —
// its route still exists at /(tabs)/me; restore the entry here to bring it back.
const TABS: { name: string; icon: IconName; labelKey: string }[] = [
  { name: "index", icon: "home", labelKey: "tabs.home" },
  { name: "explore", icon: "compass", labelKey: "tabs.explore" },
  { name: "appointments", icon: "calendar", labelKey: "tabs.appointments" },
  // A person, not a case file: the tab is the profile hub (identity, family, records, account).
  { name: "records", icon: "user", labelKey: "tabs.records" },
];

/**
 * Custom tab bar — labels always visible, 44pt targets, order mirrors in RTL.
 */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const { colors, isRTL, shadow } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const items = isRTL ? [...TABS].reverse() : TABS;

  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingBottom: insets.bottom > 0 ? insets.bottom - 4 : 8,
        paddingTop: 7,
        paddingHorizontal: 6,
        ...(shadow(2) as object),
      }}
    >
      {items.map((tab) => {
        const routeIndex = state.routes.findIndex((r) => r.name === tab.name);
        const focused = state.index === routeIndex;
        const color = focused ? colors.primary : colors.textFaint;
        return (
          <Pressable
            key={tab.name}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={t(tab.labelKey as never)}
            onPress={() => {
              const event = navigation.emit({ type: "tabPress", target: state.routes[routeIndex].key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(tab.name);
            }}
            style={{ flex: 1, alignItems: "center", gap: 3, paddingVertical: 2 }}
          >
            <Icon name={tab.icon} size={22} color={color} strokeWidth={focused ? 2.1 : 1.7} />
            <AppText role="tiny" weight={focused ? "bold" : "medium"} color={color}>
              {t(tab.labelKey as never)}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
