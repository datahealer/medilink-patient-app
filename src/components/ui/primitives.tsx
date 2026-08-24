import React from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "@/theme";
import { useI18n } from "@/i18n";
import { AppText } from "./AppText";
import { Icon, type IconName } from "./Icon";

/* ---------------------------------- Card --------------------------------- */
export function Card({
  children,
  onPress,
  style,
  padded = true,
  elevated = true,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  elevated?: boolean;
}) {
  const { colors, radii, spacing, shadow } = useTheme();
  const base: ViewStyle = {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    ...(padded ? { padding: spacing.md } : null),
    ...(elevated ? (shadow(1) as ViewStyle) : null),
  };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [base, { transform: [{ scale: pressed ? 0.985 : 1 }] }, style]}
    >
      {children}
    </Pressable>
  );
}

/* ---------------------------------- Chip --------------------------------- */
export function Chip({
  label,
  selected,
  onPress,
  icon,
  style,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, radii, row } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: row,
          alignItems: "center",
          gap: 6,
          paddingHorizontal: 14,
          height: 36,
          borderRadius: radii.pill,
          backgroundColor: selected ? colors.primary : colors.surface,
          borderWidth: 1,
          borderColor: selected ? colors.primary : colors.border,
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={15} color={selected ? colors.textOnPrimary : colors.textMuted} /> : null}
      <AppText role="label" color={selected ? colors.textOnPrimary : colors.text}>
        {label}
      </AppText>
    </Pressable>
  );
}

/* ---------------------------------- Badge -------------------------------- */
export function Badge({
  label,
  tone = "lavender",
  icon,
}: {
  label: string;
  tone?: "lavender" | "blue" | "success" | "warning" | "error" | "violet";
  icon?: IconName;
}) {
  const { colors, row, scheme } = useTheme();
  const tones = {
    lavender: { bg: colors.accent, fg: scheme === "dark" ? colors.text : "#2E1A47" },
    blue: { bg: colors.accent2, fg: scheme === "dark" ? colors.text : "#1E3A5F" },
    success: { bg: colors.successSurface, fg: colors.success },
    warning: { bg: colors.warningSurface, fg: colors.warning },
    error: { bg: colors.errorSurface, fg: colors.error },
    violet: { bg: colors.primary, fg: colors.textOnPrimary },
  } as const;
  const t = tones[tone];
  return (
    <View
      style={{
        flexDirection: row,
        alignItems: "center",
        gap: 4,
        backgroundColor: t.bg,
        borderRadius: 999,
        paddingHorizontal: 9,
        height: 23,
        alignSelf: "flex-start",
      }}
    >
      {icon ? <Icon name={icon} size={12} color={t.fg} strokeWidth={2.2} /> : null}
      <AppText role="tiny" weight="bold" color={t.fg}>
        {label}
      </AppText>
    </View>
  );
}

/* ------------------------------ SectionHeader ---------------------------- */
export function SectionHeader({
  title,
  actionLabel,
  onAction,
  style,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, row, spacing } = useTheme();
  return (
    <View
      style={[
        {
          flexDirection: row,
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: spacing.lg,
          marginBottom: spacing.sm + 2,
        },
        style,
      ]}
    >
      <AppText role="sectionTitle">{title}</AppText>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button">
          <AppText role="label" color={colors.primaryMuted}>
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

/* -------------------------------- ListItem ------------------------------- */
export function ListItem({
  icon,
  iconTone = "lavender",
  title,
  subtitle,
  trailing,
  onPress,
  danger,
}: {
  icon?: IconName;
  iconTone?: "lavender" | "blue" | "plain";
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  onPress?: () => void;
  danger?: boolean;
}) {
  const { colors, row, isRTL, spacing, scheme } = useTheme();
  const tileBg = iconTone === "lavender" ? colors.accent : iconTone === "blue" ? colors.accent2 : colors.surfaceAlt;
  const fg = danger ? colors.error : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: row,
        alignItems: "center",
        gap: spacing.md - 2,
        paddingVertical: 12,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {icon ? (
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 13,
            backgroundColor: danger ? colors.errorSurface : tileBg,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name={icon} size={19} color={danger ? colors.error : scheme === "dark" ? colors.text : "#2E1A47"} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <AppText role="cardTitle" color={fg} numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText role="caption" color={colors.textMuted} numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {trailing ?? <Icon name={isRTL ? "chevron-left" : "chevron-right"} size={17} color={colors.textFaint} />}
    </Pressable>
  );
}

/* -------------------------------- Divider -------------------------------- */
export function Divider({ inset = 0 }: { inset?: number }) {
  const { colors } = useTheme();
  return <View style={{ height: 1, backgroundColor: colors.border, marginStart: inset }} />;
}

/* ------------------------------ RatingStars ------------------------------ */
export function Rating({ value, count, compact }: { value: number; count?: number; compact?: boolean }) {
  const { colors, row } = useTheme();
  const { t } = useI18n();
  // DESIGN.md rule: never render "0.0 (0)" — an unrated provider is "new",
  // not zero-rated (live data has genuinely-new providers; mock rarely did).
  if (count === 0 || (count == null && value === 0)) {
    return (
      <View style={{ flexDirection: row, alignItems: "center", gap: 4 }}>
        <AppText role={compact ? "tiny" : "caption"} weight="bold" color={colors.primaryMuted}>
          {t("tags.new")}
        </AppText>
      </View>
    );
  }
  return (
    <View style={{ flexDirection: row, alignItems: "center", gap: 4 }}>
      <Icon name="star" size={compact ? 13 : 15} color="#E8A33D" fill strokeWidth={0} />
      <AppText role={compact ? "tiny" : "label"} weight="bold">
        {value.toFixed(1)}
      </AppText>
      {count != null ? (
        <AppText role={compact ? "tiny" : "caption"} color={colors.textFaint}>
          ({count})
        </AppText>
      ) : null}
    </View>
  );
}

/* -------------------------------- Skeleton ------------------------------- */
export function Skeleton({ height = 16, width = "100%" as number | `${number}%`, radius = 8, style }: { height?: number; width?: number | `${number}%`; radius?: number; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return <View style={[{ height, width, borderRadius: radius, backgroundColor: colors.surfaceAlt }, style]} />;
}

/* ------------------------------- EmptyState ------------------------------ */
export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: IconName;
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  const { colors, spacing, scheme } = useTheme();
  return (
    <View style={{ alignItems: "center", paddingVertical: spacing.xl, paddingHorizontal: spacing.lg, gap: 10 }}>
      <View
        style={{
          width: 74,
          height: 74,
          borderRadius: 26,
          backgroundColor: colors.accent,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 4,
        }}
      >
        <Icon name={icon} size={32} color={scheme === "dark" ? colors.text : "#2E1A47"} strokeWidth={1.5} />
      </View>
      <AppText role="cardTitle" weight="bold" align="center">
        {title}
      </AppText>
      {body ? (
        <AppText role="caption" color={colors.textMuted} align="center" style={{ maxWidth: 280 }}>
          {body}
        </AppText>
      ) : null}
      {action ? <View style={{ marginTop: 8, alignSelf: "stretch" }}>{action}</View> : null}
    </View>
  );
}
