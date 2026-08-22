import React, { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/theme";
import { pickLang, useI18n } from "@/i18n";
import { repositories } from "@/data";
import { useQueryish } from "@/data/hooks";
import {
  AppHeader,
  AppText,
  Card,
  ClinicCard,
  DoctorCard,
  EmptyState,
  Icon,
  ListItem,
  Screen,
  SearchField,
  SectionHeader,
  type IconName,
} from "@/components/ui";

/**
 * Search — the universal hub behind the home search bar. Empty state shows
 * four doors to the dedicated screens; typing searches everything at once,
 * grouped, with "see all" carrying the query into the matching screen.
 */
export default function SearchScreen() {
  const { colors, spacing, radii, row, isRTL, scheme } = useTheme();
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const q = query.trim();

  const doctors = useQueryish(() => (q ? repositories.doctor.search({ query: q }) : Promise.resolve([])), [q]);
  const clinics = useQueryish(() => (q ? repositories.discovery.searchClinics(q) : Promise.resolve([])), [q]);
  const packages = useQueryish(() => (q ? repositories.discovery.searchPackages(q) : Promise.resolve([])), [q]);
  const specialties = useQueryish(() => repositories.discovery.listSpecialties(), []);

  const totalDoctors = useQueryish(() => repositories.doctor.search(), []);
  const totalClinics = useQueryish(() => repositories.discovery.searchClinics(""), []);
  const totalPackages = useQueryish(() => repositories.discovery.searchPackages(""), []);

  const searching = q.length > 0;
  const nothing =
    searching && !doctors.isLoading && !clinics.isLoading && !packages.isLoading &&
    !(doctors.data?.length || clinics.data?.length || packages.data?.length);

  const doors: { icon: IconName; title: string; count: string; route: string }[] = [
    { icon: "stethoscope", title: t("explore.doctors"), count: t("explore.doctorsCount", { n: totalDoctors.data?.length ?? 0 }), route: "/doctors" },
    { icon: "building", title: t("explore.clinics"), count: t("explore.clinicsCount", { n: totalClinics.data?.length ?? 0 }), route: "/clinics" },
    { icon: "file-heart", title: t("packages.title"), count: t("explore.packagesCount", { n: totalPackages.data?.length ?? 0 }), route: "/packages" },
    { icon: "sparkles", title: t("explore.specialtiesTitle"), count: t("explore.results", { n: specialties.data?.length ?? 0 }), route: "/specialties" },
  ];

  return (
    <Screen scroll={false} padded={false} header={<AppHeader back title={t("explore.searchTitle")} />}>
      <View style={{ paddingHorizontal: spacing.md, gap: spacing.sm + 2 }}>
        <SearchField placeholder={t("explore.searchAll")} value={query} onChangeText={setQuery} autoFocus />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: 40, paddingTop: spacing.sm }}
      >
        {!searching ? (
          <View style={{ gap: 10, marginTop: spacing.xs }}>
            {doors.map((door) => (
              <Card key={door.route} padded={false} style={{ paddingHorizontal: spacing.md }} onPress={() => router.push(door.route as never)}>
                <ListItem icon={door.icon} title={door.title} subtitle={door.count} onPress={() => router.push(door.route as never)} />
              </Card>
            ))}
          </View>
        ) : (
          <>
            {doctors.data?.length ? (
              <>
                <SectionHeader
                  title={t("explore.doctors")}
                  actionLabel={t("common.seeAll")}
                  onAction={() => router.push({ pathname: "/doctors", params: { q } })}
                  style={{ marginTop: spacing.sm }}
                />
                <View style={{ gap: 10 }}>
                  {doctors.data.slice(0, 3).map((d) => (
                    <DoctorCard key={d.id} doctor={d} />
                  ))}
                </View>
              </>
            ) : null}

            {clinics.data?.length ? (
              <>
                <SectionHeader
                  title={t("explore.clinics")}
                  actionLabel={t("common.seeAll")}
                  onAction={() => router.push({ pathname: "/clinics", params: { q } })}
                />
                <View style={{ gap: 10 }}>
                  {clinics.data.slice(0, 3).map((c) => (
                    <ClinicCard key={c.id} clinic={c} wide />
                  ))}
                </View>
              </>
            ) : null}

            {packages.data?.length ? (
              <>
                <SectionHeader
                  title={t("packages.title")}
                  actionLabel={t("common.seeAll")}
                  onAction={() => router.push({ pathname: "/packages", params: { q } })}
                />
                <View style={{ gap: 10 }}>
                  {packages.data.slice(0, 3).map((p) => (
                    <Pressable
                      key={p.id}
                      onPress={() => router.push(`/packages/${p.id}`)}
                      accessibilityRole="button"
                      style={({ pressed }) => ({
                        flexDirection: row,
                        gap: 10,
                        alignItems: "center",
                        backgroundColor: colors.surface,
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: radii.md + 2,
                        padding: 12,
                        opacity: pressed ? 0.75 : 1,
                      })}
                    >
                      <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: colors.accent2, alignItems: "center", justifyContent: "center" }}>
                        <Icon name="file-heart" size={19} color={scheme === "dark" ? colors.text : "#1E3A5F"} />
                      </View>
                      <AppText role="label" weight="bold" style={{ flex: 1 }} numberOfLines={1}>
                        {pickLang(isRTL, p.name, p.name_ar)}
                      </AppText>
                      <Icon name={isRTL ? "chevron-left" : "chevron-right"} size={15} color={colors.textFaint} />
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}

            {nothing ? <EmptyState icon="search" title={t("explore.noResults")} /> : null}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
