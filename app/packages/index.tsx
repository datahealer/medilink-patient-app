import React, { useState } from "react";
import { FlatList, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useTheme } from "@/theme";
import { pickLang, useI18n } from "@/i18n";
import { repositories } from "@/data";
import { useQueryish } from "@/data/hooks";
import type { HealthPackage } from "@/data/types";
import { formatOMR } from "@/utils/format";
import { AppHeader, AppText, Badge, Card, EmptyState, Icon, Screen, SearchField, Skeleton } from "@/components/ui";

/** Health packages — dedicated screen with package-scoped search. */
export default function PackagesScreen() {
  const { colors, spacing, radii } = useTheme();
  const { t } = useI18n();
  const params = useLocalSearchParams<{ q?: string }>();
  const [query, setQuery] = useState(params.q ?? "");
  const packages = useQueryish(() => repositories.discovery.searchPackages(query), [query]);

  return (
    <Screen scroll={false} padded={false} header={<AppHeader back title={t("packages.title")} />}>
      <View style={{ paddingHorizontal: spacing.md, gap: spacing.sm + 2 }}>
        <SearchField placeholder={t("explore.searchPackages")} value={query} onChangeText={setQuery} />
        {!packages.isLoading ? (
          <AppText role="tiny" color={colors.textFaint}>
            {t("explore.results", { n: packages.data?.length ?? 0 })}
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
          ListEmptyComponent={<EmptyState icon="search" title={t("explore.noResults")} />}
        />
      )}
    </Screen>
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
