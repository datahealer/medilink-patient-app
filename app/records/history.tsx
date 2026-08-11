import React from "react";
import { View } from "react-native";
import { useTheme } from "@/theme";
import { pickLang, useI18n } from "@/i18n";
import { repositories } from "@/data";
import { useQueryish } from "@/data/hooks";
import { AppHeader, AppText, Badge, Card, Icon, Screen, type IconName } from "@/components/ui";

export default function MedicalHistoryScreen() {
  const { colors, spacing, row, isRTL } = useTheme();
  const { t } = useI18n();
  const history = useQueryish(() => repositories.patient.getMedicalHistory(), []);
  const h = history.data;
  if (!h) return <Screen header={<AppHeader back title={t("records.history")} />}>{null}</Screen>;

  const sections: { icon: IconName; title: string; items: string[]; tone: "error" | "warning" | "blue" | "lavender" }[] = [
    { icon: "alert", title: t("records.allergies"), items: h.allergies.map((a) => pickLang(isRTL, a.en, a.ar)), tone: "error" },
    { icon: "heart-pulse", title: t("records.conditions"), items: h.conditions.map((c) => pickLang(isRTL, c.en, c.ar)), tone: "warning" },
    { icon: "pill", title: t("records.medications"), items: h.medications, tone: "lavender" },
    { icon: "scan", title: t("records.surgeries"), items: h.surgeries.map((s) => pickLang(isRTL, s.en, s.ar)), tone: "blue" },
  ];

  return (
    <Screen header={<AppHeader back title={t("records.history")} />}>
      <View style={{ gap: 12, marginTop: spacing.sm }}>
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
            <Badge label={t("records.smokingNever")} tone="success" />
          </View>
        </Card>
      </View>
    </Screen>
  );
}
