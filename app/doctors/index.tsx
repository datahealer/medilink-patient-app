import React from "react";
import { useLocalSearchParams } from "expo-router";
import { useI18n } from "@/i18n";
import { DoctorsBrowser } from "@/features/DoctorsBrowser";
import { AppHeader, Screen } from "@/components/ui";

/** Doctors — dedicated screen with doctor-scoped search + filters. */
export default function DoctorsScreen() {
  const { t } = useI18n();
  const params = useLocalSearchParams<{ specialty?: string; q?: string }>();

  return (
    <Screen scroll={false} padded={false} header={<AppHeader back title={t("explore.doctors")} />}>
      <DoctorsBrowser specialty={params.specialty ?? null} initialQuery={params.q ?? ""} />
    </Screen>
  );
}
