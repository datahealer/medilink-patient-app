import React, { useEffect, useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { useTheme } from "@/theme";
import { useI18n } from "@/i18n";
import { repositories } from "@/data";
import { useQueryish } from "@/data/hooks";
import { CLINIC_TYPES } from "@/data/types";
import type { Clinic } from "@/data/types";
import { ClinicMap } from "@/components/ClinicMap";
import {
  AppText,
  Button,
  Chip,
  ClinicCard,
  CtaButton,
  EmptyState,
  HScroll,
  Icon,
  SearchField,
  SegmentedTabs,
  Sheet,
  Skeleton,
} from "@/components/ui";

/**
 * Clinics browser — scoped search, list ⇄ map, and filters (distance replaces
 * the old hard-coded "near you" section). Rendered by /clinics (list-first),
 * the Explore tab (map-first) and the service screen (specialty fixed).
 */
export function ClinicsBrowser({
  specialty = null,
  initialQuery = "",
  initialView = "list",
  onCount,
}: {
  specialty?: string | null;
  initialQuery?: string;
  initialView?: "list" | "map";
  onCount?: (n: number) => void;
}) {
  const { colors, spacing, radii, row } = useTheme();
  const { t } = useI18n();

  const [query, setQuery] = useState(initialQuery);
  const [view, setView] = useState<"list" | "map">(initialView);
  const [type, setType] = useState<Clinic["type"] | null>(null);
  const [maxDistanceKm, setMaxDistanceKm] = useState<number | null>(null);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [openNow, setOpenNow] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => setQuery(initialQuery), [initialQuery]);

  const clinics = useQueryish(
    () =>
      repositories.discovery.searchClinics({
        query,
        specialty: specialty ?? undefined,
        type,
        maxDistanceKm: maxDistanceKm ?? undefined,
        minRating: minRating ?? undefined,
        openNow,
      }),
    [query, specialty, type, maxDistanceKm, minRating, openNow],
  );

  const count = clinics.data?.length ?? 0;
  useEffect(() => {
    if (!clinics.isLoading) onCount?.(count);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, clinics.isLoading]);

  // Only offer facility types that can actually serve this specialty —
  // "Dental" under Pediatrics is a chip that can only ever return nothing.
  const typeFacet = useQueryish(() => repositories.discovery.clinicTypes(specialty ?? undefined), [specialty]);
  const types = typeFacet.data ?? CLINIC_TYPES;
  useEffect(() => {
    if (type && typeFacet.data && !typeFacet.data.includes(type)) setType(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFacet.data, type]);

  const filterCount = [type, maxDistanceKm, minRating, openNow ? "open" : null].filter(Boolean).length;
  const clearAll = () => {
    setType(null);
    setMaxDistanceKm(null);
    setMinRating(null);
    setOpenNow(false);
  };

  return (
    <>
      <View style={{ paddingHorizontal: spacing.md, gap: spacing.sm + 2 }}>
        <View style={{ flexDirection: row, gap: 8, alignItems: "center" }}>
          <View style={{ flex: 1 }}>
            <SearchField placeholder={t("explore.searchClinics")} value={query} onChangeText={setQuery} />
          </View>
          <Pressable
            onPress={() => setFiltersOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t("explore.filters")}
            style={{
              width: 48,
              height: 48,
              borderRadius: radii.md + 2,
              backgroundColor: filterCount ? colors.primary : colors.surface,
              borderWidth: 1,
              borderColor: filterCount ? colors.primary : colors.border,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="sliders" size={20} color={filterCount ? colors.textOnPrimary : colors.text} />
            {filterCount ? (
              <View style={{ position: "absolute", top: 6, end: 6, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
                <AppText role="tiny" weight="bold" color="#2E1A47">
                  {filterCount}
                </AppText>
              </View>
            ) : null}
          </Pressable>
        </View>

        <SegmentedTabs
          options={[
            { id: "list", label: t("explore.list") },
            { id: "map", label: t("explore.map") },
          ]}
          value={view}
          onChange={(id) => setView(id as "list" | "map")}
        />

        <HScroll gap={8}>
          <Chip label={t("explore.all")} selected={!filterCount} onPress={clearAll} />
          <Chip label={t("explore.nearYou")} selected={maxDistanceKm === 5} onPress={() => setMaxDistanceKm(maxDistanceKm === 5 ? null : 5)} />
          <Chip label={t("explore.openNow")} selected={openNow} onPress={() => setOpenNow((v) => !v)} />
          <Chip icon="star" label={t("explore.topRated")} selected={minRating === 4.7} onPress={() => setMinRating(minRating === 4.7 ? null : 4.7)} />
          {types.length > 1
            ? types.map((ty) => (
                <Chip
                  key={ty}
                  label={t(`explore.type${ty.charAt(0).toUpperCase()}${ty.slice(1)}` as never)}
                  selected={type === ty}
                  onPress={() => setType(type === ty ? null : ty)}
                />
              ))
            : null}
        </HScroll>

        {!clinics.isLoading && view === "list" ? (
          <AppText role="tiny" color={colors.textFaint}>
            {t("explore.results", { n: count })}
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
          renderItem={({ item }) => <ClinicCard clinic={item} wide specialty={specialty} />}
          contentContainerStyle={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: 40, gap: 10 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon="search"
              title={t("explore.noResults")}
              body={t("explore.tryClear")}
              action={<Button label={t("explore.clearFilters")} variant="tonal" onPress={clearAll} />}
            />
          }
        />
      )}

      <Sheet visible={filtersOpen} onClose={() => setFiltersOpen(false)} title={t("explore.filters")}>
        <AppText role="label" color={colors.textMuted} style={{ marginBottom: 8 }}>
          {t("explore.distance")}
        </AppText>
        <View style={{ flexDirection: row, gap: 8, flexWrap: "wrap" }}>
          {[2, 5, 10, 25].map((km) => (
            <Chip
              key={km}
              label={t("explore.withinKm", { n: km })}
              selected={maxDistanceKm === km}
              onPress={() => setMaxDistanceKm(maxDistanceKm === km ? null : km)}
            />
          ))}
        </View>

        {types.length > 1 ? (
          <>
            <AppText role="label" color={colors.textMuted} style={{ marginVertical: 8, marginTop: 18 }}>
              {t("explore.clinicType")}
            </AppText>
            <View style={{ flexDirection: row, gap: 8, flexWrap: "wrap" }}>
              {types.map((ty) => (
                <Chip
                  key={ty}
                  label={t(`explore.type${ty.charAt(0).toUpperCase()}${ty.slice(1)}` as never)}
                  selected={type === ty}
                  onPress={() => setType(type === ty ? null : ty)}
                />
              ))}
            </View>
          </>
        ) : null}

        <AppText role="label" color={colors.textMuted} style={{ marginVertical: 8, marginTop: 18 }}>
          {t("explore.minRating")}
        </AppText>
        <View style={{ flexDirection: row, gap: 8 }}>
          {[4.0, 4.5, 4.7].map((r) => (
            <Chip key={r} icon="star" label={`${r.toFixed(1)}+`} selected={minRating === r} onPress={() => setMinRating(minRating === r ? null : r)} />
          ))}
        </View>

        <View style={{ flexDirection: row, gap: 8, marginTop: 18 }}>
          <Chip label={t("explore.openNow")} selected={openNow} onPress={() => setOpenNow((v) => !v)} />
        </View>

        <View style={{ flexDirection: row, gap: 10, marginTop: 18 }}>
          <Button label={t("explore.reset")} variant="outline" onPress={clearAll} style={{ flex: 1 }} />
          <View style={{ flex: 2 }}>
            <CtaButton label={t("explore.showResults", { n: count })} onPress={() => setFiltersOpen(false)} />
          </View>
        </View>
      </Sheet>
    </>
  );
}
