import React from "react";
import { useLocalSearchParams } from "expo-router";
import { useI18n } from "@/i18n";
import { PackagesBrowser } from "@/features/PackagesBrowser";
import { AppHeader, Screen } from "@/components/ui";

/** Health packages — dedicated screen with package-scoped search + filters. */
export default function PackagesScreen() {
  const { t } = useI18n();
  const params = useLocalSearchParams<{ q?: string }>();

  return (
    <Screen scroll={false} padded={false} header={<AppHeader back title={t("packages.title")} />}>
      <PackagesBrowser initialQuery={params.q ?? ""} />
    </Screen>
  );
}
