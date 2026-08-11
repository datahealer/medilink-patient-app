import React from "react";
import { Image, Pressable, View } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme";
import { useI18n } from "@/i18n";
import { AppText } from "./AppText";
import { Icon, type IconName } from "./Icon";

const TABS: { name: string; icon: IconName; labelKey: string }[] = [
  { name: "index", icon: "home", labelKey: "tabs.home" },
  { name: "explore", icon: "compass", labelKey: "tabs.explore" },
  { name: "me", icon: "sparkle", labelKey: "tabs.me" },
  { name: "appointments", icon: "calendar", labelKey: "tabs.appointments" },
  { name: "records", icon: "file-heart", labelKey: "tabs.records" },
];

/**
 * Custom 5-tab bar — labels always visible, 44pt targets, order mirrors in
 * RTL, centre "Me" is the raised brand submark tile.
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
        const isMe = tab.name === "me";
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
            {isMe ? (
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 16,
                  marginTop: -22,
                  backgroundColor: "#2E1A47",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 3.5,
                  borderColor: colors.surface,
                  ...(shadow(2) as object),
                }}
              >
                <Image
                  source={require("../../../assets/brand/me-mark.png")}
                  style={{ width: 24, height: 24, resizeMode: "contain" }}
                />
              </View>
            ) : (
              <Icon name={tab.icon} size={22} color={color} strokeWidth={focused ? 2.1 : 1.7} />
            )}
            <AppText role="tiny" weight={focused ? "bold" : "medium"} color={isMe && !focused ? colors.textFaint : color}>
              {t(tab.labelKey as never)}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
