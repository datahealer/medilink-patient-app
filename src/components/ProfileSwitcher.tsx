import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { useTheme } from "@/theme";
import { pickLang, useI18n } from "@/i18n";
import { repositories } from "@/data";
import { useQueryish } from "@/data/hooks";
import { useAppStore } from "@/stores/appStore";
import type { Person } from "@/data/types";
import { ageFrom } from "@/utils/format";
import { AppText, Avatar, Badge, Card, Divider, Icon, Sheet } from "@/components/ui";

const RELATION_KEY: Record<string, string> = {
  self: "profiles.you",
  spouse: "records.relationSpouse",
  child: "records.relationChild",
  parent: "records.relationParent",
  sibling: "records.relationSibling",
  other: "records.relationOther",
};

export function personName(p: Person, isRTL: boolean) {
  return pickLang(isRTL, p.full_name, p.full_name_ar);
}

/** Reads the person whose file is currently open (account holder by default). */
export function useActivePerson() {
  const activePatientId = useAppStore((s) => s.activePatientId);
  const person = useQueryish(() => repositories.patient.getPerson(activePatientId), [activePatientId]);
  // isLoading is surfaced so screens can hold a skeleton instead of flashing a
  // blank identity while the profile loads (visible on real network latency).
  return { activePatientId, person: person.data, isLoading: person.isLoading, refetch: person.refetch };
}

/**
 * Profile switcher — the account holder taps their avatar to open the family's
 * profiles and read any member's file. Members have no login of their own, so
 * switching is always initiated from (and returns to) the account holder.
 */
export function ProfileSwitcher({
  visible,
  onClose,
  onManageFamily,
}: {
  visible: boolean;
  onClose: () => void;
  onManageFamily?: () => void;
}) {
  const { colors, spacing, row, isRTL } = useTheme();
  const { t } = useI18n();
  const activePatientId = useAppStore((s) => s.activePatientId);
  const setActivePatient = useAppStore((s) => s.setActivePatient);
  const list = useQueryish(() => repositories.patient.listPeople(), [visible]);

  return (
    <Sheet visible={visible} onClose={onClose} title={t("profiles.switch")}>
      <View style={{ gap: 2 }}>
        {(list.data ?? []).map((p, i) => {
          const active = p.id === activePatientId;
          return (
            <View key={p.id}>
              {i > 0 ? <Divider inset={0} /> : null}
              <Pressable
                onPress={() => {
                  setActivePatient(p.id);
                  onClose();
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                style={({ pressed }) => ({
                  flexDirection: row,
                  gap: 12,
                  alignItems: "center",
                  paddingVertical: 12,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Avatar name={personName(p, isRTL)} hue={p.avatarHue} size={46} />
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: row, gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <AppText role="cardTitle" weight="bold" numberOfLines={1} style={{ flexShrink: 1 }}>
                      {personName(p, isRTL)}
                    </AppText>
                    {p.is_account_holder ? <Badge label={t("profiles.accountHolder")} tone="lavender" /> : null}
                  </View>
                  <AppText role="caption" color={colors.textMuted}>
                    {t(RELATION_KEY[p.relation] as never)} · {t("records.memberAge", { n: ageFrom(p.date_of_birth) })}
                  </AppText>
                </View>
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    borderWidth: 2,
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: active ? colors.primary : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {active ? <Icon name="check" size={13} color={colors.textOnPrimary} strokeWidth={3} /> : null}
                </View>
              </Pressable>
            </View>
          );
        })}
      </View>

      {onManageFamily ? (
        <Card
          padded={false}
          style={{ marginTop: spacing.md, paddingHorizontal: spacing.md }}
          onPress={() => {
            onClose();
            onManageFamily();
          }}
        >
          <View style={{ flexDirection: row, gap: 12, alignItems: "center", paddingVertical: 12 }}>
            <View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
              <Icon name="users" size={18} color="#2E1A47" />
            </View>
            <AppText role="label" weight="bold" style={{ flex: 1 }}>
              {t("records.family")}
            </AppText>
            <Icon name={isRTL ? "chevron-left" : "chevron-right"} size={16} color={colors.textFaint} />
          </View>
        </Card>
      ) : null}

      <AppText role="tiny" color={colors.textFaint} style={{ marginTop: spacing.sm }}>
        {t("profiles.onlyHolder")}
      </AppText>
    </Sheet>
  );
}

/**
 * "You're viewing X's file" banner + one tap back to your own. Renders nothing
 * when the account holder is looking at their own file.
 */
export function ViewingAsBanner({ person }: { person: Person | null | undefined }) {
  const { colors, radii, spacing, row, isRTL } = useTheme();
  const { t } = useI18n();
  const setActivePatient = useAppStore((s) => s.setActivePatient);
  if (!person || person.is_account_holder) return null;

  return (
    <Pressable
      onPress={() => setActivePatient("self")}
      accessibilityRole="button"
      accessibilityLabel={t("profiles.backToMine")}
      style={{
        flexDirection: row,
        alignItems: "center",
        gap: 10,
        backgroundColor: colors.infoSurface,
        borderRadius: radii.md,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginTop: spacing.sm,
      }}
    >
      <Icon name="users" size={16} color={colors.info} />
      <AppText role="tiny" color={colors.info} weight="bold" style={{ flex: 1 }}>
        {t("profiles.viewingAs", { name: personName(person, isRTL) })}
      </AppText>
      <AppText role="tiny" color={colors.info} weight="bold">
        {t("profiles.backToMine")}
      </AppText>
      <Icon name={isRTL ? "chevron-left" : "chevron-right"} size={14} color={colors.info} />
    </Pressable>
  );
}

/** Avatar button that opens the switcher — used in the Home header. */
export function ProfileAvatarButton({ size = 44 }: { size?: number }) {
  const { isRTL } = useTheme();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const { person } = useActivePerson();

  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={t("profiles.switch")}>
        <Avatar name={person ? personName(person, isRTL) : ""} hue={person?.avatarHue ?? 275} size={size} />
      </Pressable>
      <ProfileSwitcher visible={open} onClose={() => setOpen(false)} />
    </>
  );
}
