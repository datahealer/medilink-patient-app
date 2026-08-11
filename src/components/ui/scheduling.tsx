import React, { useMemo } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useTheme } from "@/theme";
import { useI18n } from "@/i18n";
import { AppText } from "./AppText";
import { Icon } from "./Icon";
import type { AvailableSlot } from "@/data/types";
import { formatTime, isoAddDays } from "@/utils/format";

/* -------------------------------- DayStrip ------------------------------- */
export function DayStrip({
  selected,
  onSelect,
  days = 14,
}: {
  selected: string | null;
  onSelect: (iso: string) => void;
  days?: number;
}) {
  const { colors, radii, isRTL } = useTheme();
  const { t } = useI18n();
  const items = useMemo(() => {
    const base = new Date();
    return Array.from({ length: days }, (_, i) => {
      const iso = isoAddDays(base, i);
      const date = new Date(iso + "T12:00:00");
      return { iso, dow: date.getDay(), day: date.getDate(), friday: date.getDay() === 5 };
    });
  }, [days]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingVertical: 4, flexDirection: "row" }}
      style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined}
    >
      {items.map((item) => {
        const active = item.iso === selected;
        const disabled = item.friday;
        return (
          <Pressable
            key={item.iso}
            disabled={disabled}
            onPress={() => onSelect(item.iso)}
            accessibilityRole="button"
            accessibilityState={{ selected: active, disabled }}
            style={[
              {
                width: 56,
                paddingVertical: 9,
                borderRadius: radii.md,
                alignItems: "center",
                gap: 3,
                backgroundColor: active ? colors.primary : colors.surface,
                borderWidth: 1,
                borderColor: active ? colors.primary : colors.border,
                opacity: disabled ? 0.38 : 1,
              },
              isRTL && { transform: [{ scaleX: -1 }] },
            ]}
          >
            <AppText role="tiny" color={active ? colors.textOnPrimary : colors.textMuted}>
              {t(`common.dowS${item.dow}` as never)}
            </AppText>
            <AppText role="cardTitle" weight="bold" color={active ? colors.textOnPrimary : colors.text}>
              {String(item.day)}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/* -------------------------------- SlotGrid ------------------------------- */
export function SlotGrid({
  slots,
  selected,
  onSelect,
}: {
  slots: AvailableSlot[];
  selected: string | null;
  onSelect: (start: string) => void;
}) {
  const { colors, radii, row } = useTheme();
  const i18n = useI18n();
  const groups: { key: "morning" | "afternoon" | "evening"; icon: "sun" | "clock" | "crescent" }[] = [
    { key: "morning", icon: "sun" },
    { key: "afternoon", icon: "clock" },
    { key: "evening", icon: "crescent" },
  ];
  return (
    <View style={{ gap: 14 }}>
      {groups.map((g) => {
        const items = slots.filter((s) => s.period === g.key);
        if (!items.length) return null;
        return (
          <View key={g.key} style={{ gap: 8 }}>
            <View style={{ flexDirection: row, alignItems: "center", gap: 6 }}>
              <Icon name={g.icon} size={14} color={colors.textFaint} />
              <AppText role="tiny" weight="bold" color={colors.textFaint}>
                {i18n.t(`common.${g.key}` as never)}
              </AppText>
            </View>
            <View style={{ flexDirection: row, flexWrap: "wrap", gap: 8 }}>
              {items.map((s) => {
                const active = s.start === selected;
                return (
                  <Pressable
                    key={s.start}
                    onPress={() => onSelect(s.start)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={{
                      paddingHorizontal: 13,
                      height: 38,
                      borderRadius: radii.sm + 2,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: active ? colors.primary : colors.surface,
                      borderWidth: 1,
                      borderColor: active ? colors.primary : colors.border,
                    }}
                  >
                    <AppText role="label" weight={active ? "bold" : "medium"} color={active ? colors.textOnPrimary : colors.text}>
                      {formatTime(s.start, i18n)}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}
