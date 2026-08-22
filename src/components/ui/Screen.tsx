import React, { useEffect, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, RefreshControl, ScrollView, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "@/theme";

/**
 * Whether the on-screen keyboard is up (always false on web/desktop). "will"
 * events on iOS so the footer is gone BEFORE the keyboard animates in — the
 * auto-scroll that reveals the focused input then measures the true space.
 */
function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (Platform.OS === "web") return;
    const show = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", () => setOpen(true));
    const hide = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () => setOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return open;
}

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
  const keyboardOpen = useKeyboardOpen();

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
      keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
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
        {/* The sticky CTA steps aside while typing: riding above the keyboard
            it covered the very input being edited (booking's reason box), and
            iOS scrolls the focused field to the keyboard's edge, unaware a
            button occupies that strip. Dismiss (tap outside / drag) brings it
            back. Web never has an overlay keyboard, so it never hides there. */}
        {footer && !keyboardOpen ? (
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
