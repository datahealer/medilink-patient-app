import React from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/theme";
import { pickLang, useI18n } from "@/i18n";
import { repositories } from "@/data";
import { useQueryish } from "@/data/hooks";
import { formatDayDate, formatTime } from "@/utils/format";
import { AppText, Button, CtaButton, Icon, LinkDots, Orbs, Screen } from "@/components/ui";

export default function BookingSuccess() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing, radii, isRTL } = useTheme();
  const i18n = useI18n();
  const { t } = i18n;
  const appt = useQueryish(() => repositories.appointment.get(id!), [id]);
  const doctor = useQueryish(
    () => (appt.data ? repositories.doctor.get(appt.data.doctor_id) : Promise.resolve(null)),
    [appt.data?.doctor_id],
  );

  const a = appt.data;

  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, justifyContent: "center", gap: spacing.md }}>
        <LinearGradient
          colors={[colors.heroFrom, colors.heroTo]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: radii.xl, padding: spacing.xl, alignItems: "center", overflow: "hidden" }}
        >
          <Orbs color="#DFC8E7" opacity={0.16} />
          <LinkDots color="#DFC8E7" opacity={0.1} />
          <View
            style={{
              width: 84,
              height: 84,
              borderRadius: 42,
              backgroundColor: "#DFC8E7",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: spacing.md,
            }}
          >
            <Icon name="check" size={40} color="#2E1A47" strokeWidth={2.6} />
          </View>
          <AppText role="h2" weight="bold" color="#F9F4FA" align="center">
            {t("booking.successTitle")}
          </AppText>
          {a ? (
            <AppText role="body" color="#DFC8E7" align="center" style={{ marginTop: 8 }}>
              {t("booking.successBody", {
                date: formatDayDate(a.slot_date, i18n),
                time: formatTime(a.slot_start, i18n),
              })}
            </AppText>
          ) : null}
          {doctor.data ? (
            <AppText role="label" color="#F9F4FA" align="center" style={{ marginTop: 10 }}>
              {pickLang(isRTL, doctor.data.full_name, doctor.data.full_name_ar)} · {pickLang(isRTL, doctor.data.facility, doctor.data.facility_ar)}
            </AppText>
          ) : null}
          <View
            style={{
              marginTop: spacing.lg,
              backgroundColor: "rgba(249,244,250,0.1)",
              borderRadius: radii.md,
              paddingHorizontal: 18,
              paddingVertical: 10,
              alignItems: "center",
              borderWidth: 1,
              borderColor: "rgba(223,200,231,0.35)",
              borderStyle: "dashed",
            }}
          >
            <AppText role="tiny" color="#C9B8D6">
              {t("booking.reference")}
            </AppText>
            <AppText role="h2" weight="bold" color="#F9F4FA" style={{ letterSpacing: 2 }}>
              {a?.reference_number ?? ""}
            </AppText>
          </View>
        </LinearGradient>

        <CtaButton label={t("booking.viewAppointment")} onPress={() => router.replace(`/appointments/${id}`)} />
        <Button label={t("booking.backHome")} variant="ghost" onPress={() => router.replace("/(tabs)")} />
      </View>
    </Screen>
  );
}
