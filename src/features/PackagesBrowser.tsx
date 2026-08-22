import React, { useEffect, useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/theme";
import { pickLang, useI18n } from "@/i18n";
import { repositories } from "@/data";
import { useQueryish } from "@/data/hooks";
import type { HealthPackage } from "@/data/types";
import type { PackageSearchParams } from "@/data/repositories";
import { formatOMR } from "@/utils/format";
import {
  AppText,
  Badge,
  Button,
  Card,
  Chip,
  CtaButton,
  EmptyState,
  HScroll,
  Icon,
  SearchField,
  Sheet,
  Skeleton,
} from "@/components/ui";

type Sort = NonNullable<PackageSearchParams["sort"]>;
const SORTS: Sort[] = ["popular", "priceAsc", "priceDesc", "tests"];
const SORT_KEY: Record<Sort, string> = {
  popular: "packages.sortPopular",
  priceAsc: "packages.sortPriceAsc",
  priceDesc: "packages.sortPriceDesc",
  tests: "packages.sortTests",
};

/** Health packages browser — scoped search plus price / tests / discount / sort filters. */
export function PackagesBrowser({ initialQuery = "" }: { initialQuery?: string }) {
  const { colors, spacing, radii, row } = useTheme();
  const i18n = useI18n();
  const { t } = i18n;

  const [query, setQuery] = useState(initialQuery);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [minTests, setMinTests] = useState<number | null>(null);
  const [discountedOnly, setDiscountedOnly] = useState(false);
  const [sort, setSort] = useState<Sort>("popular");
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => setQuery(initialQuery), [initialQuery]);

  const packages = useQueryish(
    () =>
      repositories.discovery.searchPackages({
        query,
        maxPrice: maxPrice ?? undefined,
        minTests: minTests ?? undefined,
        discountedOnly,
        sort,
      }),
    [query, maxPrice, minTests, discountedOnly, sort],
  );

  const count = packages.data?.length ?? 0;
  const filterCount = [maxPrice, minTests, discountedOnly ? "d" : null, sort !== "popular" ? sort : null].filter(Boolean).length;
  const clearAll = () => {
    setMaxPrice(null);
    setMinTests(null);
    setDiscountedOnly(false);
    setSort("popular");
  };

  return (
    <>
      <View style={{ paddingHorizontal: spacing.md, gap: spacing.sm + 2 }}>
        <View style={{ flexDirection: row, gap: 8, alignItems: "center" }}>
          <View style={{ flex: 1 }}>
            <SearchField placeholder={t("explore.searchPackages")} value={query} onChangeText={setQuery} />
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
          <Chip label={t("explore.all")} selected={!filterCount} onPress={clearAll} />
          <Chip label={t("packages.discounted")} selected={discountedOnly} onPress={() => setDiscountedOnly((v) => !v)} />
          <Chip label={t("packages.sortPriceAsc")} selected={sort === "priceAsc"} onPress={() => setSort(sort === "priceAsc" ? "popular" : "priceAsc")} />
          <Chip label={t("packages.sortTests")} selected={sort === "tests"} onPress={() => setSort(sort === "tests" ? "popular" : "tests")} />
          {[20, 40, 60].map((p) => (
            <Chip
              key={p}
              label={`≤ ${formatOMR(p, i18n)}`}
              selected={maxPrice === p}
              onPress={() => setMaxPrice(maxPrice === p ? null : p)}
            />
          ))}
        </HScroll>

        {!packages.isLoading ? (
          <AppText role="tiny" color={colors.textFaint}>
            {t("explore.results", { n: count })}
          </AppText>
        ) : null}
      </View>

      {packages.isLoading ? (
        <View style={{ paddingHorizontal: spacing.md, gap: 10, marginTop: spacing.sm }}>
          <Skeleton height={90} radius={radii.lg} />
          <Skeleton height={90} radius={radii.lg} />
        </View>
      ) : (
        <FlatList
          data={packages.data ?? []}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => <PackageRow pkg={item} />}
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
          {t("packages.sort")}
        </AppText>
        <View style={{ flexDirection: row, gap: 8, flexWrap: "wrap" }}>
          {SORTS.map((s) => (
            <Chip key={s} label={t(SORT_KEY[s] as never)} selected={sort === s} onPress={() => setSort(s)} />
          ))}
        </View>

        <AppText role="label" color={colors.textMuted} style={{ marginVertical: 8, marginTop: 18 }}>
          {t("packages.maxPrice")}
        </AppText>
        <View style={{ flexDirection: row, gap: 8, flexWrap: "wrap" }}>
          {[20, 40, 60, 100].map((p) => (
            <Chip key={p} label={formatOMR(p, i18n)} selected={maxPrice === p} onPress={() => setMaxPrice(maxPrice === p ? null : p)} />
          ))}
        </View>

        <AppText role="label" color={colors.textMuted} style={{ marginVertical: 8, marginTop: 18 }}>
          {t("packages.testsCount")}
        </AppText>
        <View style={{ flexDirection: row, gap: 8, flexWrap: "wrap" }}>
          {[10, 20, 30].map((n) => (
            <Chip key={n} label={t("packages.testsAtLeast", { n })} selected={minTests === n} onPress={() => setMinTests(minTests === n ? null : n)} />
          ))}
        </View>

        <View style={{ flexDirection: row, gap: 8, marginTop: 18 }}>
          <Chip label={t("packages.discounted")} selected={discountedOnly} onPress={() => setDiscountedOnly((v) => !v)} />
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

function PackageRow({ pkg }: { pkg: HealthPackage }) {
  const { colors, row, isRTL, spacing, radii, scheme } = useTheme();
  const i18n = useI18n();
  const { t } = i18n;
  return (
    <Card onPress={() => router.push(`/packages/${pkg.id}`)}>
      <View style={{ flexDirection: row, gap: spacing.md - 2, alignItems: "center" }}>
        <View style={{ width: 46, height: 46, borderRadius: radii.md, backgroundColor: colors.accent2, alignItems: "center", justifyContent: "center" }}>
          <Icon name="file-heart" size={22} color={scheme === "dark" ? colors.text : "#1E3A5F"} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: row, alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <AppText role="cardTitle" weight="bold" numberOfLines={1} style={{ flexShrink: 1 }}>
              {pickLang(isRTL, pkg.name, pkg.name_ar)}
            </AppText>
            {pkg.tag ? (
              <Badge label={t(`tags.${pkg.tag.key}` as never, { n: pkg.tag.n ?? 0 })} tone={pkg.tag.key === "discount" ? "error" : "violet"} />
            ) : null}
          </View>
          <AppText role="caption" color={colors.textMuted} numberOfLines={1}>
            {t("packages.includes", { n: pkg.tests_count })}
          </AppText>
        </View>
        <View style={{ alignItems: isRTL ? "flex-start" : "flex-end" }}>
          <AppText role="price">{formatOMR(pkg.price_omr, i18n)}</AppText>
          {pkg.old_price_omr ? (
            <AppText role="tiny" color={colors.textFaint} style={{ textDecorationLine: "line-through" }}>
              {formatOMR(pkg.old_price_omr, i18n)}
            </AppText>
          ) : null}
        </View>
      </View>
    </Card>
  );
}
