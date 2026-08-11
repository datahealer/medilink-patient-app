import React, { useState } from "react";
import { FlatList, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useTheme } from "@/theme";
import { useI18n } from "@/i18n";
import { repositories } from "@/data";
import { useQueryish } from "@/data/hooks";
import { ClinicMap } from "@/components/ClinicMap";
import { AppHeader, AppText, ClinicCard, EmptyState, Screen, SearchField, SegmentedTabs, Skeleton } from "@/components/ui";

/**
 * Clinics — dedicated screen. The list ⇄ map switch is a full-width
 * segmented control right under the search bar: impossible to miss.
 */
export default function ClinicsScreen() {
  const { colors, spacing, radii } = useTheme();
  const { t } = useI18n();
  const params = useLocalSearchParams<{ q?: string }>();
  const [query, setQuery] = useState(params.q ?? "");
  const [view, setView] = useState<"list" | "map">("list");
  const clinics = useQueryish(() => repositories.discovery.searchClinics(query), [query]);

  return (
    <Screen scroll={false} padded={false} header={<AppHeader back title={t("explore.clinics")} />}>
      <View style={{ paddingHorizontal: spacing.md, gap: spacing.sm + 2 }}>
        <SearchField placeholder={t("explore.searchClinics")} value={query} onChangeText={setQuery} />
        <SegmentedTabs
          options={[
            { id: "list", label: t("explore.list") },
            { id: "map", label: t("explore.map") },
          ]}
          value={view}
          onChange={(id) => setView(id as "list" | "map")}
        />
        {!clinics.isLoading && view === "list" ? (
          <AppText role="tiny" color={colors.textFaint}>
            {t("explore.results", { n: clinics.data?.length ?? 0 })}
          </AppText>
        ) : null}
      </View>

      {view === "map" ? (
        <View style={{ flex: 1, margin: spacing.md, marginTop: spacing.sm }}>
          <ClinicMap clinics={clinics.data ?? []} />
        </View>
      ) : clinics.isLoading ? (
        <View style={{ paddingHorizontal: spacing.md, gap: 10, marginTop: spacing.sm }}>
          <Skeleton height={150} radius={radii.lg} />
          <Skeleton height={150} radius={radii.lg} />
        </View>
      ) : (
        <FlatList
          data={clinics.data ?? []}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => <ClinicCard clinic={item} wide />}
          contentContainerStyle={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: 40, gap: 10 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyState icon="search" title={t("explore.noResults")} />}
        />
      )}
    </Screen>
  );
}
