import React from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TextInput, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme";
import { fontFamilyFor } from "@/theme/typography";
import { AppText } from "./AppText";
import { Icon } from "./Icon";

/* ------------------------------ SegmentedTabs ---------------------------- */
export function SegmentedTabs({
  options,
  value,
  onChange,
  style,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, radii, row } = useTheme();
  return (
    <View
      style={[
        {
          flexDirection: row,
          backgroundColor: colors.surfaceAlt,
          borderRadius: radii.md,
          padding: 3,
        },
        style,
      ]}
    >
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <Pressable
            key={opt.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(opt.id)}
            style={{
              flex: 1,
              height: 38,
              borderRadius: radii.md - 4,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: active ? colors.surface : "transparent",
              ...(active ? { shadowColor: "#2E1A47", shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 } : null),
            }}
          >
            <AppText role="label" weight={active ? "bold" : "medium"} color={active ? colors.text : colors.textMuted}>
              {opt.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

/* --------------------------------- Stepper ------------------------------- */
export function Stepper({ labels, current }: { labels: string[]; current: number }) {
  const { colors, row } = useTheme();
  return (
    <View style={{ flexDirection: row, gap: 6, alignItems: "center", marginVertical: 10 }}>
      {labels.map((label, i) => {
        const state = i < current ? "done" : i === current ? "active" : "todo";
        return (
          <View key={label} style={{ flex: 1, gap: 5 }}>
            <View
              style={{
                height: 4,
                borderRadius: 2,
                backgroundColor: state === "todo" ? colors.border : colors.primary,
                opacity: state === "active" ? 1 : state === "done" ? 0.55 : 1,
              }}
            />
            <AppText role="tiny" color={state === "active" ? colors.text : colors.textFaint} weight={state === "active" ? "bold" : "medium"}>
              {label}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

/* --------------------------------- Sheet --------------------------------- */
export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  const { colors, spacing, radii } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* The modal sits outside Screen's KeyboardAvoidingView, so it needs its
          own — otherwise the keyboard covers inputs (review comment, forms). */}
      <KeyboardAvoidingView style={{ flex: 1, justifyContent: "flex-end" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable style={{ flex: 1, backgroundColor: colors.overlay }} onPress={onClose} accessibilityRole="button" />
        <View
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: radii.xl,
            borderTopRightRadius: radii.xl,
            maxHeight: "88%",
          }}
        >
          <View style={{ width: 40, height: 4.5, borderRadius: 3, backgroundColor: colors.border, alignSelf: "center", marginTop: 10, marginBottom: 12 }} />
          {title ? (
            <AppText role="h2" weight="bold" align="center" style={{ marginBottom: 12, paddingHorizontal: spacing.md }}>
              {title}
            </AppText>
          ) : null}
          <ScrollView
            bounces={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: insets.bottom + spacing.md }}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ------------------------------- SearchField ----------------------------- */
export function SearchField({
  placeholder,
  value,
  onChangeText,
  autoFocus,
  onPressLauncher,
}: {
  placeholder: string;
  value?: string;
  onChangeText?: (t: string) => void;
  autoFocus?: boolean;
  /** Launcher mode: renders as a button that navigates — NOT a second input. */
  onPressLauncher?: () => void;
}) {
  const { colors, radii, row, isRTL } = useTheme();
  const inner = (
    <>
      <Icon name="search" size={19} color={colors.textFaint} />
      {onPressLauncher ? (
        <AppText role="body" color={colors.textFaint} numberOfLines={1} style={{ flex: 1 }}>
          {placeholder}
        </AppText>
      ) : (
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textFaint}
          autoFocus={autoFocus}
          style={{
            flex: 1,
            fontFamily: fontFamilyFor("body", "medium", isRTL),
            fontSize: 14.5,
            color: colors.text,
            textAlign: isRTL ? "right" : "left",
            paddingVertical: 0,
          }}
          returnKeyType="search"
        />
      )}
      {!onPressLauncher && value ? (
        <Pressable onPress={() => onChangeText?.("")} hitSlop={8}>
          <Icon name="x" size={16} color={colors.textFaint} />
        </Pressable>
      ) : null}
    </>
  );
  const frame: ViewStyle = {
    flexDirection: row,
    alignItems: "center",
    gap: 10,
    height: 48,
    borderRadius: radii.md + 2,
    paddingHorizontal: 14,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.border,
  };
  if (onPressLauncher) {
    return (
      <Pressable
        onPress={onPressLauncher}
        accessibilityRole="button"
        style={({ pressed }) => [frame, { opacity: pressed ? 0.75 : 1 }]}
      >
        {inner}
      </Pressable>
    );
  }
  return <View style={frame}>{inner}</View>;
}
