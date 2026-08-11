import React from "react";
import { Linking, Pressable, View } from "react-native";
import { openDirections, shareWhatsApp } from "@/utils/actions";
import { FavButton } from "@/components/FavButton";
import { router, useLocalSearchParams } from "expo-router";
import { useTheme } from "@/theme";
import { pickLang, useI18n } from "@/i18n";
import { repositories } from "@/data";
import { useQueryish } from "@/data/hooks";
import { formatOMR } from "@/utils/format";
import {
  AppHeader,
  AppText,
  Badge,
  Card,
  ClinicCover,
  Divider,
  DoctorCard,
  Icon,
  Rating,
  Screen,
  SectionHeader,
  Skeleton,
} from "@/components/ui";

export default function ClinicDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing, radii, row, isRTL } = useTheme();
  const i18n = useI18n();
  const { t } = i18n;
  const clinic = useQueryish(() => repositories.discovery.getClinic(id!), [id]);
  const doctors = useQueryish(() => repositories.doctor.search({ clinicId: id! }), [id]);

  const c = clinic.data;
  if (!c) {
    return (
      <Screen header={<AppHeader back />}>
        <Skeleton height={220} radius={radii.xl} style={{ marginTop: spacing.md }} />
      </Screen>
    );
  }

  const name = pickLang(isRTL, c.name, c.name_ar);
  const now = new Date();
  const todayHours = c.working_hours.find((h) => h.dow.includes(now.getDay()));
  const is247 = todayHours?.open === "00:00" && todayHours?.close === "23:59";
  const openNow =
    !!todayHours?.open &&
    (is247 ||
      (now.getHours() * 60 + now.getMinutes() >= toMin(todayHours.open) &&
        now.getHours() * 60 + now.getMinutes() < toMin(todayHours.close!)));

  const bookService = (specialty?: string) => {
    const match =
      (specialty && doctors.data?.find((d) => d.specialty === specialty)) || doctors.data?.[0];
    if (match) router.push(`/booking/${match.id}`);
  };

  return (
    <Screen
      header={
        <AppHeader
          back
          title={name}
          right={
            <>
            <Pressable
              onPress={() => shareWhatsApp(t("share.clinic", { name, area: pickLang(isRTL, c.area, c.area_ar) }))}
              accessibilityRole="button"
              hitSlop={8}
              style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center" }}
            >
              <Icon name="whatsapp" size={19} color="#25D366" fill strokeWidth={0} />
            </Pressable>
            <FavButton kind="clinic" refId={c.id} />
            </>
          }
        />
      }
    >
      <View style={{ borderRadius: radii.xl, overflow: "hidden", marginTop: spacing.sm }}>
        <ClinicCover hue={c.coverHue} type={c.type} height={120} />
      </View>

      <View style={{ flexDirection: row, alignItems: "center", gap: 8, marginTop: spacing.md }}>
        <AppText role="h2" weight="bold" style={{ flexShrink: 1 }}>
          {name}
        </AppText>
        {c.is_verified ? <Icon name="shield-check" size={17} color={colors.success} /> : null}
        <View style={{ flex: 1 }} />
        {openNow ? <Badge label={t("clinic.openNow")} tone="success" /> : <Badge label={t("common.closed")} tone="error" />}
      </View>
      <View style={{ flexDirection: row, alignItems: "center", gap: 10, marginTop: 4 }}>
        <Rating value={c.rating} count={c.reviews} compact />
        <View style={{ flexDirection: row, alignItems: "center", gap: 3 }}>
          <Icon name="map-pin" size={13} color={colors.textFaint} />
          <AppText role="caption" color={colors.textMuted}>
            {pickLang(isRTL, `${c.area}, ${c.city}`, `${c.area_ar}، ${c.city_ar}`)} · {t("common.km", { n: c.distance_km })}
          </AppText>
        </View>
      </View>
      <AppText role="caption" color={colors.textMuted} style={{ marginTop: 8 }}>
        {pickLang(isRTL, c.description, c.description_ar)}
      </AppText>

      {/* Contact actions */}
      <View style={{ flexDirection: row, gap: 8, marginTop: spacing.md }}>
        <ActionPill icon="phone" label={t("common.call")} onPress={() => Linking.openURL(`tel:${c.phone.replace(/\s/g, "")}`)} />
        <ActionPill
          icon="navigation"
          label={t("common.directions")}
          onPress={() => openDirections(c.latitude, c.longitude)}
        />
      </View>

      {/* Services & prices — the competitor's core, done cleanly */}
      <SectionHeader title={t("clinic.services")} />
      <Card padded={false} style={{ paddingHorizontal: spacing.md }}>
        {c.services.map((s, i) => (
          <View key={s.id}>
            {i > 0 ? <Divider /> : null}
            <View style={{ flexDirection: row, alignItems: "center", paddingVertical: 13, gap: 10 }}>
              <View style={{ flex: 1 }}>
                <AppText role="label" weight="bold">
                  {pickLang(isRTL, s.name, s.name_ar)}
                </AppText>
                <AppText role="tiny" color={colors.textFaint} style={{ marginTop: 2 }}>
                  {t("clinic.from", { price: formatOMR(s.price_from_omr, i18n) })}
                </AppText>
              </View>
              <Pressable
                onPress={() => bookService(s.specialty)}
                accessibilityRole="button"
                style={({ pressed }) => ({
                  backgroundColor: colors.accent,
                  borderRadius: radii.sm + 2,
                  paddingHorizontal: 14,
                  height: 32,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <AppText role="tiny" weight="bold" color="#2E1A47">
                  {t("clinic.bookService")}
                </AppText>
              </Pressable>
            </View>
          </View>
        ))}
      </Card>

      {/* Hours */}
      <SectionHeader title={t("clinic.hours")} />
      <Card padded={false} style={{ paddingHorizontal: spacing.md }}>
        {c.working_hours.map((h, i) => (
          <View key={i}>
            {i > 0 ? <Divider /> : null}
            <View style={{ flexDirection: row, justifyContent: "space-between", paddingVertical: 11 }}>
              <AppText role="label" color={colors.textMuted}>
                {h.dow.map((dd) => t(`common.dowS${dd}` as never)).join(isRTL ? "، " : ", ")}
              </AppText>
              <AppText role="label" weight="bold" color={h.open ? colors.text : colors.error}>
                {h.open ? (h.open === "00:00" && h.close === "23:59" ? "24/7" : `${h.open} – ${h.close}`) : t("clinic.closedDay")}
              </AppText>
            </View>
          </View>
        ))}
      </Card>

      {/* Doctors */}
      <SectionHeader title={t("clinic.doctors")} />
      <View style={{ gap: 10 }}>
        {(doctors.data ?? []).map((d) => (
          <DoctorCard key={d.id} doctor={d} />
        ))}
      </View>

      {/* Insurance */}
      <SectionHeader title={t("clinic.insurances")} />
      <View style={{ flexDirection: row, flexWrap: "wrap", gap: 8, marginBottom: spacing.md }}>
        {c.accepted_insurances.map((ins) => (
          <Badge key={ins} label={ins} tone="blue" />
        ))}
      </View>
    </Screen>
  );
}

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function ActionPill({ icon, label, onPress }: { icon: "phone" | "navigation"; label: string; onPress: () => void }) {
  const { colors, radii, row } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flex: 1,
        flexDirection: row,
        gap: 8,
        height: 44,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Icon name={icon} size={17} color={colors.primaryMuted} />
      <AppText role="label" weight="bold">
        {label}
      </AppText>
    </Pressable>
  );
}
