import React, { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { useTheme } from "@/theme";
import { useI18n } from "@/i18n";
import { AppText } from "./AppText";
import { Icon } from "./Icon";
import { HScroll } from "./HScroll";

/* ------------------------------- date maths ------------------------------ */
const pad = (n: number) => String(n).padStart(2, "0");
const toISO = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
/** Day-of-week of the 1st, Sunday = 0 (Omani week starts Sunday). */
const firstDow = (y: number, m: number) => new Date(y, m, 1).getDay();

function parseISO(iso: string | null): { y: number; m: number; d: number } | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { y, m: m - 1, d };
}

/**
 * Bilingual calendar field. Two deliberate choices:
 *  - NOT the native picker: that renders in the device locale, so an
 *    Arabic-first app on an English phone would show English months inside an
 *    Arabic form. This builds the calendar from our own i18n month/day names.
 *  - Expands INLINE rather than in a modal: this field is used inside bottom
 *    sheets (add family member), and a modal inside a modal doesn't stack
 *    reliably — the calendar ended up off-screen.
 */
export function DateField({
  label,
  value,
  onChange,
  maxDate,
  minYear = 1920,
  placeholder,
}: {
  label?: string;
  value: string | null;
  onChange: (iso: string) => void;
  /** Defaults to today — birth dates can't be in the future. */
  maxDate?: Date;
  minYear?: number;
  placeholder?: string;
}) {
  const { colors, radii, spacing, row, isRTL } = useTheme();
  const { t } = useI18n();
  const max = maxDate ?? new Date();
  const parsed = parseISO(value);

  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(parsed?.y ?? max.getFullYear() - 30);
  const [month, setMonth] = useState(parsed?.m ?? 0);

  const years = useMemo(() => {
    const out: number[] = [];
    for (let y = max.getFullYear(); y >= minYear; y--) out.push(y);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minYear, max.getFullYear()]);

  const toggle = () => {
    if (!open) {
      const p = parseISO(value);
      setYear(p?.y ?? max.getFullYear() - 30);
      setMonth(p?.m ?? 0);
    }
    setOpen((v) => !v);
  };

  const total = daysInMonth(year, month);
  const lead = firstDow(year, month);
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];

  const isFuture = (d: number) => new Date(year, month, d) > max;
  const isSelected = (d: number) => !!parsed && parsed.y === year && parsed.m === month && parsed.d === d;

  const display = parsed
    ? `${parsed.d} ${t(`common.m${parsed.m}` as never)} ${parsed.y}`
    : (placeholder ?? t("date.pick"));

  return (
    <View style={{ gap: 7 }}>
      {label ? (
        <AppText role="label" color={colors.textMuted}>
          {label}
        </AppText>
      ) : null}

      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={label ?? t("date.pick")}
        style={({ pressed }) => ({
          flexDirection: row,
          alignItems: "center",
          gap: 10,
          height: 48,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.inputBackground,
          paddingHorizontal: 14,
          opacity: pressed ? 0.75 : 1,
        })}
      >
        <Icon name="calendar" size={18} color={colors.textFaint} />
        <AppText role="body" color={parsed ? colors.text : colors.textFaint} style={{ flex: 1 }} numberOfLines={1}>
          {display}
        </AppText>
        <Icon name={open ? "chevron-up" : "chevron-down"} size={16} color={colors.textFaint} />
      </Pressable>

      {open ? (
        <View
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            borderRadius: radii.md,
            padding: spacing.sm + 2,
          }}
        >
        {/* Year — newest first, so recent births are one tap away */}
        <HScroll gap={8}>
          {years.map((y) => (
            <Pressable
              key={y}
              onPress={() => setYear(y)}
              accessibilityRole="radio"
              accessibilityState={{ selected: y === year }}
              style={{
                minWidth: 62,
                height: 36,
                borderRadius: radii.md - 2,
                borderWidth: 1.5,
                borderColor: y === year ? colors.primary : colors.border,
                backgroundColor: y === year ? colors.primary : colors.surface,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 10,
              }}
            >
              <AppText role="label" weight="bold" color={y === year ? colors.textOnPrimary : colors.text}>
                {y}
              </AppText>
            </Pressable>
          ))}
        </HScroll>

        {/* Month */}
        <View style={{ flexDirection: row, alignItems: "center", justifyContent: "space-between", marginTop: spacing.sm + 2 }}>
          <Pressable
            onPress={() => setMonth((m) => (m === 0 ? 11 : m - 1))}
            hitSlop={8}
            accessibilityRole="button"
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center" }}
          >
            <Icon name={isRTL ? "chevron-right" : "chevron-left"} size={16} color={colors.text} />
          </Pressable>
          <AppText role="cardTitle" weight="bold">
            {t(`common.m${month}` as never)} {year}
          </AppText>
          <Pressable
            onPress={() => setMonth((m) => (m === 11 ? 0 : m + 1))}
            hitSlop={8}
            accessibilityRole="button"
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center" }}
          >
            <Icon name={isRTL ? "chevron-left" : "chevron-right"} size={16} color={colors.text} />
          </Pressable>
        </View>

        {/* Weekday header — Sunday first (Oman) */}
        <View style={{ flexDirection: row, marginTop: spacing.sm }}>
          {[0, 1, 2, 3, 4, 5, 6].map((dow) => (
            <View key={dow} style={{ flex: 1, alignItems: "center", paddingVertical: 6 }}>
              <AppText role="tiny" color={colors.textFaint} weight="bold">
                {t(`common.dowS${dow}` as never)}
              </AppText>
            </View>
          ))}
        </View>

        {/* Day grid */}
        <View style={{ flexDirection: row, flexWrap: "wrap" }}>
          {cells.map((day, idx) => {
            if (day === null) return <View key={`pad-${idx}`} style={{ width: `${100 / 7}%`, height: 44 }} />;
            const disabled = isFuture(day);
            const selected = isSelected(day);
            return (
              <View key={day} style={{ width: `${100 / 7}%`, height: 44, alignItems: "center", justifyContent: "center" }}>
                <Pressable
                  disabled={disabled}
                  onPress={() => {
                    onChange(toISO(year, month, day));
                    setOpen(false);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected, disabled }}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 13,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: selected ? colors.primary : "transparent",
                  }}
                >
                  <AppText
                    role="label"
                    weight={selected ? "bold" : "medium"}
                    color={disabled ? colors.textFaint : selected ? colors.textOnPrimary : colors.text}
                  >
                    {day}
                  </AppText>
                </Pressable>
              </View>
            );
          })}
        </View>
        </View>
      ) : null}
    </View>
  );
}
