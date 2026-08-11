import React from "react";
import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/theme";
import { pickLang, useI18n } from "@/i18n";
import { repositories } from "@/data";
import { useQueryish } from "@/data/hooks";
import { formatShortDate } from "@/utils/format";
import { AppHeader, AppText, Badge, Card, Divider, Icon, Orbs, Screen } from "@/components/ui";

export default function Insurance() {
  const { colors, spacing, radii, row, isRTL } = useTheme();
  const { t } = useI18n();
  const insurance = useQueryish(() => repositories.patient.getInsurance(), []);
  const profile = useQueryish(() => repositories.patient.getProfile(), []);
  const ins = insurance.data;
  if (!ins) return <Screen header={<AppHeader back title={t("records.insurance")} />}>{null}</Screen>;

  return (
    <Screen header={<AppHeader back title={t("records.insurance")} />}>
      {/* The card itself — like the physical one in your wallet */}
      <LinearGradient
        colors={[colors.heroFrom, colors.heroTo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: radii.xl, padding: spacing.lg, overflow: "hidden", marginTop: spacing.sm, minHeight: 190, justifyContent: "space-between" }}
      >
        <Orbs color="#DFC8E7" opacity={0.14} />
        <View style={{ flexDirection: row, justifyContent: "space-between", alignItems: "center" }}>
          <AppText role="cardTitle" weight="bold" color="#F9F4FA">
            {pickLang(isRTL, ins.provider, ins.provider_ar)}
          </AppText>
          {ins.is_active ? <Badge label={t("records.active")} tone="success" /> : null}
        </View>
        <View style={{ gap: 2 }}>
          <AppText role="tiny" color="#C9B8D6">
            {t("records.memberNo")}
          </AppText>
          <AppText role="h2" weight="bold" color="#F9F4FA" style={{ letterSpacing: 3 }}>
            {ins.member_id}
          </AppText>
        </View>
        <View style={{ flexDirection: row, justifyContent: "space-between", alignItems: "flex-end" }}>
          <AppText role="label" color="#DFC8E7">
            {profile.data ? pickLang(isRTL, profile.data.full_name, profile.data.full_name_ar) : ""}
          </AppText>
          <AppText role="tiny" color="#C9B8D6">
            {t("records.validUntil")} {formatShortDate(ins.expiry_date, t)}
          </AppText>
        </View>
      </LinearGradient>

      <Card padded={false} style={{ marginTop: spacing.md, paddingHorizontal: spacing.md }}>
        {[
          { label: t("records.provider"), value: pickLang(isRTL, ins.provider, ins.provider_ar) },
          { label: t("records.policyNo"), value: ins.policy_number },
          { label: t("records.memberNo"), value: ins.member_id },
        ].map((r2, i) => (
          <View key={r2.label}>
            {i > 0 ? <Divider /> : null}
            <View style={{ flexDirection: row, justifyContent: "space-between", paddingVertical: 12 }}>
              <AppText role="label" color={colors.textMuted}>
                {r2.label}
              </AppText>
              <AppText role="label" weight="bold">
                {r2.value}
              </AppText>
            </View>
          </View>
        ))}
      </Card>

      <View style={{ flexDirection: row, gap: 8, alignItems: "center", marginTop: spacing.md }}>
        <Icon name="shield-check" size={16} color={colors.success} />
        <AppText role="caption" color={colors.textMuted} style={{ flex: 1 }}>
          {pickLang(isRTL, ins.coverage, ins.coverage_ar)}
        </AppText>
      </View>
    </Screen>
  );
}
