import React, { useEffect, useState } from "react";
import { FlatList, Pressable, ScrollView, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useTheme } from "@/theme";
import { pickLang, useI18n } from "@/i18n";
import { repositories } from "@/data";
import { useQueryish } from "@/data/hooks";
import { formatOMR } from "@/utils/format";
import {
  AppHeader,
  AppText,
  Button,
  Chip,
  CtaButton,
  DoctorCard,
  EmptyState,
  HScroll,
  Icon,
  Screen,
  SearchField,
  Sheet,
  Skeleton,
} from "@/components/ui";

/** Doctors — dedicated list screen with doctor-scoped search + filters. */
export default function DoctorsScreen() {
  const { colors, spacing, radii, row, isRTL } = useTheme();
  const i18n = useI18n();
  const { t } = i18n;
  const params = useLocalSearchParams<{ specialty?: string; q?: string }>();

  const [query, setQuery] = useState(params.q ?? "");
  const [specialty, setSpecialty] = useState<string | null>(params.specialty ?? null);
  const [gender, setGender] = useState<"any" | "male" | "female">("any");
  const [maxFee, setMaxFee] = useState<number | null>(null);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [availableToday, setAvailableToday] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    if (params.specialty) setSpecialty(params.specialty);
    if (params.q != null) setQuery(params.q);
  }, [params.specialty, params.q]);

  const specialties = useQueryish(() => repositories.discovery.listSpecialties(), []);
  const doctors = useQueryish(
    () =>
      repositories.doctor.search({
        query,
        specialty: specialty ?? undefined,
        gender,
        maxFee: maxFee ?? undefined,
        minRating: minRating ?? undefined,
        availableToday,
      }),
    [query, specialty, gender, maxFee, minRating, availableToday],
  );

  const filterCount = [specialty, gender !== "any" ? gender : null, maxFee, minRating].filter(Boolean).length;

  const clearAll = () => {
    setSpecialty(null);
    setGender("any");
    setMaxFee(null);
    setMinRating(null);
    setAvailableToday(false);
  };

  return (
    <Screen scroll={false} padded={false} header={<AppHeader back title={t("explore.doctors")} />}>
      <View style={{ paddingHorizontal: spacing.md, gap: spacing.sm + 2 }}>
        <View style={{ flexDirection: row, gap: 8, alignItems: "center" }}>
          <View style={{ flex: 1 }}>
            <SearchField placeholder={t("explore.searchDoctors")} value={query} onChangeText={setQuery} />
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

        <HScroll gap={8}>
          <Chip label={t("explore.all")} selected={!availableToday && !specialty} onPress={clearAll} />
          <Chip label={t("explore.availableToday")} selected={availableToday} onPress={() => setAvailableToday((v) => !v)} />
          {(specialties.data ?? []).map((s) => (
            <Chip
              key={s.id}
              label={pickLang(isRTL, s.name, s.name_ar)}
              selected={specialty === s.id}
              onPress={() => setSpecialty(specialty === s.id ? null : s.id)}
            />
          ))}
        </HScroll>

        {!doctors.isLoading ? (
          <AppText role="tiny" color={colors.textFaint}>
            {t("explore.results", { n: doctors.data?.length ?? 0 })}
          </AppText>
        ) : null}
      </View>

      {doctors.isLoading ? (
        <View style={{ paddingHorizontal: spacing.md, gap: 10, marginTop: spacing.sm }}>
          <Skeleton height={120} radius={radii.lg} />
          <Skeleton height={120} radius={radii.lg} />
          <Skeleton height={120} radius={radii.lg} />
        </View>
      ) : (
        <FlatList
          data={doctors.data ?? []}
          keyExtractor={(d) => d.id}
          renderItem={({ item }) => <DoctorCard doctor={item} />}
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

      {/* Filters sheet */}
      <Sheet visible={filtersOpen} onClose={() => setFiltersOpen(false)} title={t("explore.filters")}>
        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
          <AppText role="label" color={colors.textMuted} style={{ marginBottom: 8 }}>
            {t("explore.specialty")}
          </AppText>
          <View style={{ flexDirection: row, flexWrap: "wrap", gap: 8 }}>
            {(specialties.data ?? []).map((s) => (
              <Chip key={s.id} label={pickLang(isRTL, s.name, s.name_ar)} selected={specialty === s.id} onPress={() => setSpecialty(specialty === s.id ? null : s.id)} />
            ))}
          </View>

          <AppText role="label" color={colors.textMuted} style={{ marginVertical: 8, marginTop: 18 }}>
            {t("explore.gender")}
          </AppText>
          <View style={{ flexDirection: row, gap: 8 }}>
            {(["any", "female", "male"] as const).map((g) => (
              <Chip key={g} label={t(`explore.${g === "any" ? "any" : g}` as never)} selected={gender === g} onPress={() => setGender(g)} />
            ))}
          </View>

          <AppText role="label" color={colors.textMuted} style={{ marginVertical: 8, marginTop: 18 }}>
            {t("explore.maxFee")}
          </AppText>
          <View style={{ flexDirection: row, gap: 8 }}>
            {[10, 20, 30].map((fee) => (
              <Chip key={fee} label={formatOMR(fee, i18n)} selected={maxFee === fee} onPress={() => setMaxFee(maxFee === fee ? null : fee)} />
            ))}
          </View>

          <AppText role="label" color={colors.textMuted} style={{ marginVertical: 8, marginTop: 18 }}>
            {t("explore.minRating")}
          </AppText>
          <View style={{ flexDirection: row, gap: 8 }}>
            {[4.0, 4.5, 4.8].map((r) => (
              <Chip key={r} icon="star" label={`${r.toFixed(1)}+`} selected={minRating === r} onPress={() => setMinRating(minRating === r ? null : r)} />
            ))}
          </View>
        </ScrollView>
        <View style={{ flexDirection: row, gap: 10, marginTop: 18 }}>
          <Button label={t("explore.reset")} variant="outline" onPress={clearAll} style={{ flex: 1 }} />
          <View style={{ flex: 2 }}>
            <CtaButton label={t("explore.showResults", { n: doctors.data?.length ?? 0 })} onPress={() => setFiltersOpen(false)} />
          </View>
        </View>
      </Sheet>
    </Screen>
  );
}
