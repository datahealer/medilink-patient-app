import React from "react";
import { useLocalSearchParams } from "expo-router";
import { useI18n } from "@/i18n";
import { ClinicsBrowser } from "@/features/ClinicsBrowser";
import { AppHeader, Screen } from "@/components/ui";

/**
 * Clinics — list-first. (The Explore tab renders the same browser map-first,
 * so both routes land on identical content with a different default view.)
 */
export default function ClinicsScreen() {
  const { t } = useI18n();
  const params = useLocalSearchParams<{ q?: string; view?: string; specialty?: string }>();

  return (
    <Screen scroll={false} padded={false} header={<AppHeader back title={t("explore.clinics")} />}>
      <ClinicsBrowser
        initialQuery={params.q ?? ""}
        initialView={params.view === "map" ? "map" : "list"}
        specialty={params.specialty ?? null}
      />
    </Screen>
  );
}
