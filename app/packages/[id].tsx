import React from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/theme";
import { pickLang, useI18n } from "@/i18n";
import { repositories } from "@/data";
import { useQueryish } from "@/data/hooks";
import { formatOMR } from "@/utils/format";
import { Pressable } from "react-native";
import { shareWhatsApp } from "@/utils/actions";
import { FavButton } from "@/components/FavButton";
import { formatOMR as fmtOMR } from "@/utils/format";
import { AppHeader, AppText, Badge, Card, CtaButton, Icon, LinkDots, ListItem, Screen, Skeleton } from "@/components/ui";

export default function PackageDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing, radii, row, isRTL } = useTheme();
  const i18n = useI18n();
  const { t } = i18n;
  const pkg = useQueryish(() => repositories.discovery.getPackage(id!), [id]);
  const clinic = useQueryish(
    () => (pkg.data ? repositories.discovery.getClinic(pkg.data.clinic_id) : Promise.resolve(null)),
    [pkg.data?.clinic_id],
  );
  const doctors = useQueryish(
    () => (pkg.data ? repositories.doctor.search({ clinicId: pkg.data.clinic_id }) : Promise.resolve([])),
    [pkg.data?.clinic_id],
  );

  const p = pkg.data;
  if (!p) {
    return (
      <Screen header={<AppHeader back />}>
        <Skeleton height={200} radius={radii.xl} style={{ marginTop: spacing.md }} />
      </Screen>
    );
  }

  const book = () => {
    const doctor = doctors.data?.[0];
    if (doctor) router.push(`/booking/${doctor.id}?package=${p.id}`);
  };

  return (
    <Screen
      header={
        <AppHeader
          back
          title={t("packages.title")}
          right={
            <>
            <Pressable
              onPress={() => shareWhatsApp(t("share.package", { name: pickLang(isRTL, p.name, p.name_ar), price: fmtOMR(p.price_omr, i18n) }))}
              accessibilityRole="button"
              hitSlop={8}
              style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center" }}
            >
              <Icon name="whatsapp" size={19} color="#25D366" fill strokeWidth={0} />
            </Pressable>
            <FavButton kind="package" refId={p.id} />
            </>
          }
        />
      }
      footer={<CtaButton label={t("packages.bookPackage")} icon="calendar-plus" onPress={book} />}
    >
      <LinearGradient
        colors={[colors.heroFrom, colors.heroTo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: radii.xl, padding: spacing.lg, overflow: "hidden", marginTop: spacing.sm }}
      >
        <LinkDots color="#DFC8E7" opacity={0.12} />
        {p.tag ? <Badge label={t(`tags.${p.tag.key}` as never, { n: p.tag.n ?? 0 })} tone="lavender" /> : null}
        <AppText role="screenTitle" color="#F9F4FA" style={{ marginTop: 8 }}>
          {pickLang(isRTL, p.name, p.name_ar)}
        </AppText>
        <View style={{ flexDirection: row, alignItems: "flex-end", gap: 10, marginTop: 10 }}>
          <AppText role="display" color="#F9F4FA" serif={!isRTL}>
            {formatOMR(p.price_omr, i18n)}
          </AppText>
          {p.old_price_omr ? (
            <AppText role="body" color="#C9B8D6" style={{ textDecorationLine: "line-through", marginBottom: 8 }}>
              {formatOMR(p.old_price_omr, i18n)}
            </AppText>
          ) : null}
        </View>
        <View style={{ flexDirection: row, gap: 14, marginTop: 10 }}>
          <View style={{ flexDirection: row, gap: 5, alignItems: "center" }}>
            <Icon name="flask" size={14} color="#DFC8E7" />
            <AppText role="tiny" color="#DFC8E7">
              {t("packages.includes", { n: p.tests_count })}
            </AppText>
          </View>
          <View style={{ flexDirection: row, gap: 5, alignItems: "center" }}>
            <Icon name="clock" size={14} color="#DFC8E7" />
            <AppText role="tiny" color="#DFC8E7">
              {t("packages.validity", { n: p.hours_to_results })}
            </AppText>
          </View>
        </View>
      </LinearGradient>

      <AppText role="sectionTitle" style={{ marginTop: spacing.lg, marginBottom: 8 }}>
        {t("packages.whatsIncluded")}
      </AppText>
      <Card padded={false} style={{ paddingHorizontal: spacing.md, paddingVertical: 4 }}>
        {p.includes.map((item) => (
          <View key={item.en} style={{ flexDirection: row, alignItems: "center", gap: 10, paddingVertical: 10 }}>
            <Icon name="check-circle" size={18} color={colors.success} />
            <AppText role="label" style={{ flex: 1 }}>
              {pickLang(isRTL, item.en, item.ar)}
            </AppText>
          </View>
        ))}
      </Card>

      {clinic.data ? (
        <>
          <AppText role="sectionTitle" style={{ marginTop: spacing.lg, marginBottom: 4 }}>
            {t("booking.clinic")}
          </AppText>
          <Card padded={false} style={{ paddingHorizontal: spacing.md }}>
            <ListItem
              icon="building"
              title={pickLang(isRTL, clinic.data.name, clinic.data.name_ar)}
              subtitle={pickLang(isRTL, clinic.data.area, clinic.data.area_ar)}
              onPress={() => router.push(`/clinics/${clinic.data!.id}`)}
            />
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
