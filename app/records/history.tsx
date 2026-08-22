import React from "react";
import { View } from "react-native";
import { useTheme } from "@/theme";
import { useI18n } from "@/i18n";
import { repositories } from "@/data";
import { useQueryish } from "@/data/hooks";
import { pickLang } from "@/i18n";
import { personName, useActivePerson } from "@/components/ProfileSwitcher";
import { AppHeader, AppText, Badge, Card, EmptyState, Icon, Screen, type IconName } from "@/components/ui";

/** Medical history — of whichever profile is active, not always the account holder's. */
export default function MedicalHistoryScreen() {
  const { colors, spacing, row, isRTL } = useTheme();
  const { t } = useI18n();
  const { activePatientId, person } = useActivePerson();
  const history = useQueryish(() => repositories.patient.getMedicalHistory(activePatientId), [activePatientId]);
  const h = history.data;
  const who = person ? personName(person, isRTL) : "";

  if (!h) return <Screen header={<AppHeader back title={t("records.history")} />}>{null}</Screen>;

  const sections: { icon: IconName; title: string; items: string[]; tone: "error" | "warning" | "blue" | "lavender" }[] = [
    { icon: "alert", title: t("records.allergies"), items: h.allergies.map((a) => pickLang(isRTL, a.en, a.ar)), tone: "error" },
    { icon: "heart-pulse", title: t("records.conditions"), items: h.conditions.map((c) => pickLang(isRTL, c.en, c.ar)), tone: "warning" },
    { icon: "pill", title: t("records.medications"), items: h.medications, tone: "lavender" },
    { icon: "scan", title: t("records.surgeries"), items: h.surgeries.map((s) => pickLang(isRTL, s.en, s.ar)), tone: "blue" },
  ];

  const empty = sections.every((s) => s.items.length === 0);

  return (
    <Screen header={<AppHeader back title={t("records.history")} />}>
      {/* Whose file this is — essential once profiles can be switched */}
      {person ? (
        <View style={{ flexDirection: row, gap: 8, alignItems: "center", marginTop: spacing.sm }}>
          <Icon name="user" size={15} color={colors.textFaint} />
          <AppText role="caption" color={colors.textMuted}>
            {who}
          </AppText>
        </View>
      ) : null}

      {empty ? (
        <EmptyState icon="file" title={t("profiles.emptyRecords")} body={t("profiles.emptyRecordsBody", { name: who })} />
      ) : (
        <View style={{ gap: 12, marginTop: spacing.md }}>
          {sections.map((s) => (
            <Card key={s.title}>
              <View style={{ flexDirection: row, gap: 8, alignItems: "center", marginBottom: 10 }}>
                <Icon name={s.icon} size={17} color={colors.textMuted} />
                <AppText role="label" weight="bold">
                  {s.title}
                </AppText>
              </View>
              <View style={{ flexDirection: row, flexWrap: "wrap", gap: 8 }}>
                {s.items.length ? s.items.map((item) => <Badge key={item} label={item} tone={s.tone} />) : (
                  <AppText role="caption" color={colors.textFaint}>
                    —
                  </AppText>
                )}
              </View>
            </Card>
          ))}
          <Card>
            <View style={{ flexDirection: row, gap: 8, alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flexDirection: row, gap: 8, alignItems: "center" }}>
                <Icon name="info" size={17} color={colors.textMuted} />
                <AppText role="label" weight="bold">
                  {t("records.smoking")}
                </AppText>
              </View>
              <Badge
                label={h.smoking_status === "never" ? t("records.smokingNever") : h.smoking_status === "former" ? t("records.smokingFormer") : t("records.smokingCurrent")}
                tone={h.smoking_status === "never" ? "success" : h.smoking_status === "former" ? "warning" : "error"}
              />
            </View>
          </Card>
        </View>
      )}
    </Screen>
  );
}
