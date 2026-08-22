import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { openDirections, shareWhatsApp } from "@/utils/actions";
import { FavButton } from "@/components/FavButton";
import { router, useLocalSearchParams } from "expo-router";
import { useTheme } from "@/theme";
import { pickLang, useI18n } from "@/i18n";
import { repositories } from "@/data";
import { useQueryish } from "@/data/hooks";
import type { ClinicService, Doctor } from "@/data/types";
import { formatOMR } from "@/utils/format";
import {
  AppHeader,
  AppText,
  Avatar,
  Badge,
  Card,
  ClinicCover,
  Divider,
  DoctorCard,
  Icon,
  Rating,
  Screen,
  SectionHeader,
  Sheet,
  Skeleton,
} from "@/components/ui";

export default function ClinicDetail() {
  // `specialty` is the reason the patient is here (they tapped a service, or a
  // clinic in a specialty-scoped list). Keeping it stops this screen from
  // dumping every doctor in the building on somebody who came for one thing.
  const { id, specialty } = useLocalSearchParams<{ id: string; specialty?: string }>();
  const { colors, spacing, radii, row, isRTL } = useTheme();
  const i18n = useI18n();
  const { t } = i18n;
  const clinic = useQueryish(() => repositories.discovery.getClinic(id!), [id]);
  const doctors = useQueryish(() => repositories.doctor.search({ clinicId: id! }), [id]);
  const specialties = useQueryish(() => repositories.discovery.listSpecialties(), []);
  const [showAllDoctors, setShowAllDoctors] = useState(false);
  const [picking, setPicking] = useState<{ service: string; doctors: Doctor[] } | null>(null);

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

  const allDoctors = doctors.data ?? [];
  const specialtyName = (slug?: string) => {
    const s = specialties.data?.find((x) => x.id === slug);
    return s ? pickLang(isRTL, s.name, s.name_ar) : "";
  };
  const scopedDoctors = specialty ? allDoctors.filter((d) => d.specialty === specialty) : allDoctors;
  const shownDoctors = specialty && !showAllDoctors ? scopedDoctors : allDoctors;

  /**
   * Never guess. One doctor performs the service → straight to booking; several
   * → the patient picks. Silently defaulting to the first doctor in the list is
   * how somebody books a pediatric visit with a cardiologist.
   * Guests book too — identity is confirmed just before payment, in the wizard.
   */
  const bookService = (service: ClinicService) => {
    const matches = service.specialty ? allDoctors.filter((d) => d.specialty === service.specialty) : allDoctors;
    const options = matches.length ? matches : allDoctors;
    const name = pickLang(isRTL, service.name, service.name_ar);
    if (options.length === 1) {
      router.push(`/booking/${options[0].id}` as never);
      return;
    }
    if (options.length) setPicking({ service: name, doctors: options });
  };

  const bookWith = (doctor: Doctor) => {
    setPicking(null);
    router.push(`/booking/${doctor.id}` as never);
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

      {/* Directions only — no phone numbers on clinic pages (client feedback
          2026-08-20): every journey stays inside the app's booking flow. */}
      <View style={{ flexDirection: row, gap: 8, marginTop: spacing.md }}>
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
                onPress={() => bookService(s)}
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

      {/* Doctors — scoped to why the patient came, with a way out */}
      <SectionHeader
        title={
          specialty && !showAllDoctors
            ? t("clinic.doctorsIn", { name: specialtyName(specialty), n: scopedDoctors.length })
            : t("clinic.doctors")
        }
        actionLabel={
          specialty
            ? showAllDoctors
              ? t("clinic.onlySpecialty", { name: specialtyName(specialty) })
              : t("clinic.allDoctors", { n: allDoctors.length })
            : undefined
        }
        onAction={specialty ? () => setShowAllDoctors((v) => !v) : undefined}
      />
      <View style={{ gap: 10 }}>
        {shownDoctors.map((d) => (
          <DoctorCard key={d.id} doctor={d} />
        ))}
      </View>

      {/* Which doctor performs the service you tapped */}
      <Sheet
        visible={!!picking}
        onClose={() => setPicking(null)}
        title={picking ? t("clinic.pickDoctor", { service: picking.service }) : ""}
      >
        <View style={{ gap: 8 }}>
          {(picking?.doctors ?? []).map((d) => {
            const dName = pickLang(isRTL, d.full_name, d.full_name_ar);
            return (
              <Pressable
                key={d.id}
                onPress={() => bookWith(d)}
                accessibilityRole="button"
                style={({ pressed }) => ({
                  flexDirection: row,
                  alignItems: "center",
                  gap: 12,
                  padding: 10,
                  borderRadius: radii.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Avatar name={dName} hue={d.avatarHue} size={42} />
                <View style={{ flex: 1 }}>
                  <AppText role="label" weight="bold" numberOfLines={1}>
                    {dName}
                  </AppText>
                  <AppText role="tiny" color={colors.textMuted} numberOfLines={1}>
                    {pickLang(isRTL, d.title ?? "", d.title_ar ?? "")} · {t("common.years", { n: d.experience_years })}
                  </AppText>
                </View>
                {/* label, not price: the display size would squeeze out the doctor's title */}
                <AppText role="label" weight="bold">
                  {formatOMR(d.fee_omr, i18n)}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </Sheet>
    </Screen>
  );
}

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function ActionPill({ icon, label, onPress }: { icon: "navigation"; label: string; onPress: () => void }) {
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
