import React, { useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useTheme } from "@/theme";
import { pickLang, useI18n } from "@/i18n";
import { repositories } from "@/data";
import { useQueryish } from "@/data/hooks";
import { DoctorsBrowser } from "@/features/DoctorsBrowser";
import { ClinicsBrowser } from "@/features/ClinicsBrowser";
import { AppHeader, AppText, Screen, SegmentedTabs } from "@/components/ui";

/**
 * A service (specialty) is not only offered by doctors — clinics offer it too.
 * So picking "General Medicine" lands here, on a Doctors ⇄ Clinics switch with
 * both sides filtered to that specialty, each keeping its own search + filters.
 */
export default function ServiceScreen() {
  const { specialty } = useLocalSearchParams<{ specialty: string }>();
  const { colors, spacing, row, isRTL } = useTheme();
  const { t } = useI18n();
  const [tab, setTab] = useState<"doctors" | "clinics">("doctors");
  const [doctorCount, setDoctorCount] = useState<number | null>(null);
  const [clinicCount, setClinicCount] = useState<number | null>(null);

  const specialties = useQueryish(() => repositories.discovery.listSpecialties(), []);
  const current = specialties.data?.find((s) => s.id === specialty);
  const name = current ? pickLang(isRTL, current.name, current.name_ar) : "";

  return (
    <Screen scroll={false} padded={false} header={<AppHeader back title={name} />}>
      <View style={{ paddingHorizontal: spacing.md, gap: 6, marginBottom: spacing.sm }}>
        <SegmentedTabs
          options={[
            { id: "doctors", label: t("explore.doctors") },
            { id: "clinics", label: t("explore.clinics") },
          ]}
          value={tab}
          onChange={(id) => setTab(id as "doctors" | "clinics")}
        />
        <View style={{ flexDirection: row, gap: 6, alignItems: "center" }}>
          <AppText role="tiny" color={colors.textFaint}>
            {doctorCount != null ? t("explore.doctorsCount", { n: doctorCount }) : ""}
            {doctorCount != null && clinicCount != null ? " · " : ""}
            {clinicCount != null ? t("explore.clinicsCount", { n: clinicCount }) : ""}
            {name ? ` ${t("explore.inSpecialty", { name })}` : ""}
          </AppText>
        </View>
      </View>

      {/* Both stay mounted so switching tabs keeps each side's filters & scroll. */}
      <View style={{ flex: 1, display: tab === "doctors" ? "flex" : "none" }}>
        <DoctorsBrowser specialty={specialty ?? null} lockSpecialty onCount={setDoctorCount} />
      </View>
      <View style={{ flex: 1, display: tab === "clinics" ? "flex" : "none" }}>
        <ClinicsBrowser specialty={specialty ?? null} onCount={setClinicCount} />
      </View>
    </Screen>
  );
}
