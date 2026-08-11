import React from "react";
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "@/theme";

interface ScreenProps {
  children: React.ReactNode;
  /** Scrollable content (default true). */
  scroll?: boolean;
  padded?: boolean;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  background?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Extra space at the bottom of scroll content (e.g. above tab bar). */
  bottomInset?: number;
  style?: ViewStyle;
}

export function Screen({
  children,
  scroll = true,
  padded = true,
  header,
  footer,
  background,
  refreshing,
  onRefresh,
  bottomInset = 0,
  style,
}: ScreenProps) {
  const { colors, spacing, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const bg = background ?? colors.background;

  const content = scroll ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[
        padded && { paddingHorizontal: spacing.md },
        { paddingBottom: insets.bottom + spacing.lg + bottomInset },
        style,
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primaryMuted} />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, padded && { paddingHorizontal: spacing.md }, style]}>{children}</View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: bg, paddingTop: insets.top }}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      {header}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {content}
        {footer ? (
          <View
            style={{
              paddingHorizontal: spacing.md,
              paddingTop: spacing.sm,
              paddingBottom: insets.bottom + spacing.sm,
              backgroundColor: bg,
            }}
          >
            {footer}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}
