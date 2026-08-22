import React from "react";
import { View } from "react-native";
import { useTheme } from "@/theme";
import { useI18n } from "@/i18n";
import { ClinicsBrowser } from "@/features/ClinicsBrowser";
import { AppText, Screen } from "@/components/ui";

/**
 * Explore tab — the map-first way into the SAME clinics browser that
 * /clinics renders list-first. Two routes, one screen: this tab opens on the
 * map, "see all" under Clinics on the home screen opens on the list.
 * (Universal search moved to /search, reached from the home search bar, so the
 * app still has exactly one search entry point per scope.)
 */
export default function ExploreTab() {
  const { spacing } = useTheme();
  const { t } = useI18n();

  return (
    <Screen scroll={false} padded={false}>
      <View style={{ paddingHorizontal: spacing.md, marginTop: spacing.sm, marginBottom: spacing.sm }}>
        <AppText role="screenTitle">{t("explore.clinics")}</AppText>
      </View>
      <ClinicsBrowser initialView="map" />
    </Screen>
  );
}
