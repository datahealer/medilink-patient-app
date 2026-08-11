import React, { useCallback } from "react";
import { Pressable, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useTheme } from "@/theme";
import { pickLang, useI18n } from "@/i18n";
import { repositories } from "@/data";
import { useQueryish } from "@/data/hooks";
import type { Clinic, Doctor, FavouriteKind, HealthPackage } from "@/data/types";
import { formatOMR } from "@/utils/format";
import { AppHeader, AppText, Avatar, Button, Card, Divider, EmptyState, Icon, Rating, Screen } from "@/components/ui";

/**
 * المفضلة — everything the user hearted (doctors, clinics, packages),
 * grouped by kind. The heart on each row removes it instantly.
 */
export default function Favourites() {
  const { colors, spacing, radii, row, isRTL, scheme } = useTheme();
  const i18n = useI18n();
  const { t } = i18n;

  const favs = useQueryish(async () => {
    const list = await repositories.favourite.list();
    const ids = (kind: FavouriteKind) => list.filter((f) => f.kind === kind).map((f) => f.refId);
    const [doctors, clinics, packages] = await Promise.all([
      Promise.all(ids("doctor").map((id) => repositories.doctor.get(id))),
      Promise.all(ids("clinic").map((id) => repositories.discovery.getClinic(id))),
      Promise.all(ids("package").map((id) => repositories.discovery.getPackage(id))),
    ]);
    return {
      doctors: doctors.filter(Boolean) as Doctor[],
      clinics: clinics.filter(Boolean) as Clinic[],
      packages: packages.filter(Boolean) as HealthPackage[],
    };
  }, []);

  // Hearts can be toggled off on detail pages — refresh when coming back.
  useFocusEffect(
    useCallback(() => {
      favs.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const remove = async (kind: FavouriteKind, refId: string) => {
    await repositories.favourite.toggle(kind, refId);
    favs.refetch();
  };

  const d = favs.data;
  const empty = d && !d.doctors.length && !d.clinics.length && !d.packages.length;

  const FavRow = ({
    leading,
    title,
    caption,
    extra,
    onPress,
    onRemove,
    last,
  }: {
    leading: React.ReactNode;
    title: string;
    caption: string;
    extra?: React.ReactNode;
    onPress: () => void;
    onRemove: () => void;
    last?: boolean;
  }) => (
    <View>
      <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => ({ flexDirection: row, gap: 12, alignItems: "center", paddingVertical: 12, opacity: pressed ? 0.7 : 1 })}>
        {leading}
        <View style={{ flex: 1, gap: 2 }}>
          <AppText role="cardTitle" weight="bold" numberOfLines={1}>
            {title}
          </AppText>
          <AppText role="caption" color={colors.textMuted} numberOfLines={1}>
            {caption}
          </AppText>
          {extra}
        </View>
        <Pressable
          onPress={onRemove}
          accessibilityRole="button"
          accessibilityLabel={t("common.delete")}
          hitSlop={10}
          style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center" }}
        >
          <Icon name="heart" size={17} color={colors.error} fill strokeWidth={0} />
        </Pressable>
      </Pressable>
      {last ? null : <Divider inset={0} />}
    </View>
  );

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={{ marginTop: spacing.md }}>
      <AppText role="label" color={colors.textMuted} style={{ marginBottom: 8 }}>
        {title}
      </AppText>
      <Card padded={false} style={{ paddingHorizontal: spacing.md }}>
        {children}
      </Card>
    </View>
  );

  return (
    <Screen header={<AppHeader back title={t("records.favourites")} />}>
      {empty ? (
        <EmptyState
          icon="heart"
          title={t("records.favouritesEmpty")}
          body={t("records.favouritesEmptyBody")}
          action={<Button label={t("explore.browseAll")} onPress={() => router.push("/(tabs)/explore")} />}
        />
      ) : null}

      {d?.doctors.length ? (
        <Section title={t("explore.doctors")}>
          {d.doctors.map((doc, i) => (
            <FavRow
              key={doc.id}
              leading={<Avatar name={pickLang(isRTL, doc.full_name, doc.full_name_ar)} hue={doc.avatarHue} size={46} />}
              title={pickLang(isRTL, doc.full_name, doc.full_name_ar)}
              caption={`${pickLang(isRTL, doc.title ?? "", doc.title_ar ?? "")} · ${pickLang(isRTL, doc.facility, doc.facility_ar)}`}
              onPress={() => router.push(`/doctors/${doc.id}`)}
              onRemove={() => remove("doctor", doc.id)}
              last={i === d.doctors.length - 1}
            />
          ))}
        </Section>
      ) : null}

      {d?.clinics.length ? (
        <Section title={t("explore.clinics")}>
          {d.clinics.map((c, i) => (
            <FavRow
              key={c.id}
              leading={<Avatar name={pickLang(isRTL, c.name, c.name_ar)} hue={c.coverHue} size={46} />}
              title={pickLang(isRTL, c.name, c.name_ar)}
              caption={`${pickLang(isRTL, c.area, c.area_ar)}${isRTL ? "، " : ", "}${pickLang(isRTL, c.city, c.city_ar)} · ${t("common.km", { n: c.distance_km })}`}
              extra={<Rating value={c.rating} count={c.reviews} compact />}
              onPress={() => router.push(`/clinics/${c.id}`)}
              onRemove={() => remove("clinic", c.id)}
              last={i === d.clinics.length - 1}
            />
          ))}
        </Section>
      ) : null}

      {d?.packages.length ? (
        <Section title={t("explore.packagesTab")}>
          {d.packages.map((p, i) => (
            <FavRow
              key={p.id}
              leading={
                <View style={{ width: 46, height: 46, borderRadius: radii.md, backgroundColor: colors.accent2, alignItems: "center", justifyContent: "center" }}>
                  <Icon name="file-heart" size={22} color={scheme === "dark" ? colors.text : "#1E3A5F"} />
                </View>
              }
              title={pickLang(isRTL, p.name, p.name_ar)}
              caption={`${formatOMR(p.price_omr, i18n)} · ${t("packages.includes", { n: p.tests_count })}`}
              onPress={() => router.push(`/packages/${p.id}`)}
              onRemove={() => remove("package", p.id)}
              last={i === d.packages.length - 1}
            />
          ))}
        </Section>
      ) : null}
    </Screen>
  );
}
