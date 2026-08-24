import React from "react";
import { Pressable, useWindowDimensions, View } from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/theme";
import { useI18n, pickLang } from "@/i18n";
import { formatOMR, formatShortDate, formatTime } from "@/utils/format";
import type { Appointment, Clinic, Doctor, HealthPackage, Specialty } from "@/data/types";
import { AppText } from "./AppText";
import { Avatar, ClinicCover } from "./Avatar";
import { Icon, type IconName } from "./Icon";
import { Badge, Card, Rating } from "./primitives";

/* ------------------------------ SpecialtyTile ---------------------------- */
const TILE_TONES = ["#EFE3F5", "#E2ECF8", "#F4EEF9", "#EAF2E9"] as const;
const TILE_MIN_WIDTH = 72;
const TILE_GAP = 8;

/**
 * Column maths for the specialty grid. Tiles never shrink past TILE_MIN_WIDTH,
 * so the wider hardware earns another column (five on a 16 Pro Max, four on a
 * standard phone) instead of leaving a dead gutter down the side. Columns are
 * a fixed width and the row fills from the start, so a short trailing row
 * stays aligned under the one above it.
 */
export function useSpecialtyGrid(count?: number) {
  const { width } = useWindowDimensions();
  const { spacing } = useTheme();
  const usable = width - spacing.md * 2;
  let columns = Math.max(4, Math.floor((usable + TILE_GAP) / (TILE_MIN_WIDTH + TILE_GAP)));
  if (count) columns = Math.min(columns, count);
  return { columns, tileWidth: Math.floor((usable - TILE_GAP * (columns - 1)) / columns), gap: TILE_GAP };
}

export function SpecialtyTile({
  specialty,
  index,
  width = 76,
  onPress,
}: {
  specialty: Specialty;
  index: number;
  /** Column width from useSpecialtyGrid — the tile owns its own centring. */
  width?: number;
  onPress: () => void;
}) {
  const { colors, isRTL, scheme } = useTheme();
  const tone = TILE_TONES[index % TILE_TONES.length];
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => ({ width, alignItems: "center", gap: 6, opacity: pressed ? 0.7 : 1 })}>
      <View
        style={{
          width: 58,
          height: 58,
          borderRadius: 20,
          backgroundColor: scheme === "dark" ? colors.surfaceAlt : tone,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name={specialty.icon as IconName} size={26} color={scheme === "dark" ? colors.text : "#2E1A47"} strokeWidth={1.5} />
      </View>
      <AppText role="tiny" align="center" color={colors.textMuted} numberOfLines={2} style={{ width }}>
        {pickLang(isRTL, specialty.name, specialty.name_ar)}
      </AppText>
    </Pressable>
  );
}

/* -------------------------------- DoctorCard ----------------------------- */
export function DoctorCard({ doctor, compact }: { doctor: Doctor; compact?: boolean }) {
  const { colors, row, isRTL, spacing } = useTheme();
  const i18n = useI18n();
  const { t } = i18n;
  const name = pickLang(isRTL, doctor.full_name, doctor.full_name_ar);
  const title = pickLang(isRTL, doctor.title ?? "", doctor.title_ar ?? "");
  const facility = pickLang(isRTL, doctor.facility, doctor.facility_ar);

  return (
    <Card onPress={() => router.push(`/doctors/${doctor.id}`)} style={compact ? { width: 270 } : undefined}>
      <View style={{ flexDirection: row, gap: spacing.md - 2 }}>
        <Avatar name={name} hue={doctor.avatarHue} size={56} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText role="cardTitle" weight="bold" numberOfLines={1}>
            {name}
          </AppText>
          <AppText role="caption" color={colors.textMuted} numberOfLines={1}>
            {title} · {facility}
          </AppText>
          <View style={{ flexDirection: row, alignItems: "center", gap: 8, marginTop: 3, flexWrap: "wrap" }}>
            <Rating value={doctor.rating} count={doctor.reviews} compact />
            {doctor.tag ? (
              <Badge label={t(`tags.${doctor.tag.key}` as never, { n: doctor.tag.n ?? 0 })} tone={doctor.tag.key === "lastSlots" ? "warning" : "lavender"} />
            ) : doctor.available_today ? (
              <Badge label={t("explore.availableToday")} tone="success" />
            ) : null}
          </View>
        </View>
      </View>
      <View
        style={{
          flexDirection: row,
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: spacing.sm + 4,
          paddingTop: spacing.sm + 2,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <AppText role="caption" color={colors.textMuted}>
          {t("doctor.fee")}
        </AppText>
        <AppText role="price" color={colors.text}>
          {formatOMR(doctor.fee_omr, i18n)}
        </AppText>
      </View>
    </Card>
  );
}

/* -------------------------------- ClinicCard ----------------------------- */
/** `specialty` keeps the reason you're looking at this clinic — the detail screen scopes to it. */
export function ClinicCard({ clinic, wide, specialty }: { clinic: Clinic; wide?: boolean; specialty?: string | null }) {
  const { colors, row, isRTL, spacing } = useTheme();
  const { t } = useI18n();
  const name = pickLang(isRTL, clinic.name, clinic.name_ar);
  const area = pickLang(isRTL, `${clinic.area}, ${clinic.city}`, `${clinic.area_ar}، ${clinic.city_ar}`);
  const href = specialty ? `/clinics/${clinic.id}?specialty=${specialty}` : `/clinics/${clinic.id}`;
  return (
    <Card onPress={() => router.push(href)} padded={false} style={wide ? undefined : { width: 250 }}>
      <ClinicCover hue={clinic.coverHue} type={clinic.type} height={74}>
        {clinic.tag ? (
          <View style={{ position: "absolute", top: 8, start: 10 }}>
            <Badge label={t(`tags.${clinic.tag.key}` as never, { n: clinic.tag.n ?? 0 })} tone="violet" />
          </View>
        ) : null}
      </ClinicCover>
      <View style={{ padding: spacing.md - 2, gap: 3 }}>
        <View style={{ flexDirection: row, alignItems: "center", gap: 6 }}>
          <AppText role="cardTitle" weight="bold" numberOfLines={1} style={{ flexShrink: 1 }}>
            {name}
          </AppText>
          {clinic.is_verified ? <Icon name="shield-check" size={15} color={colors.success} /> : null}
        </View>
        <View style={{ flexDirection: row, alignItems: "center", gap: 4 }}>
          <Icon name="map-pin" size={13} color={colors.textFaint} />
          <AppText role="caption" color={colors.textMuted} numberOfLines={1} style={{ flexShrink: 1 }}>
            {clinic.distance_km != null ? `${area} · ${t("common.km", { n: clinic.distance_km })}` : area}
          </AppText>
        </View>
        <View style={{ flexDirection: row, alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
          <Rating value={clinic.rating} count={clinic.reviews} compact />
          <AppText role="tiny" color={colors.textFaint}>
            {t("explore.doctorsCount", { n: clinic.doctors_count })}
          </AppText>
        </View>
      </View>
    </Card>
  );
}

/* ----------------------------- AppointmentCard --------------------------- */
export function statusTone(status: Appointment["status"]): { tone: "success" | "warning" | "error" | "blue" | "lavender"; key: string } {
  switch (status) {
    case "confirmed":
      return { tone: "success", key: "appointments.statusConfirmed" };
    case "pending":
      return { tone: "warning", key: "appointments.statusPending" };
    case "checked_in":
      return { tone: "blue", key: "appointments.statusCheckedIn" };
    case "completed":
      return { tone: "lavender", key: "appointments.statusCompleted" };
    case "no_show":
      return { tone: "error", key: "appointments.statusNoShow" };
    default:
      return { tone: "error", key: "appointments.statusCancelled" };
  }
}

export function AppointmentRow({
  appointment,
  doctor,
  showPatient,
}: {
  appointment: Appointment;
  doctor: Doctor | undefined;
  /** Household view: say whose visit each row is. */
  showPatient?: boolean;
}) {
  const { colors, row, isRTL, spacing } = useTheme();
  const i18n = useI18n();
  const { t } = i18n;
  const name = doctor ? pickLang(isRTL, doctor.full_name, doctor.full_name_ar) : "";
  const st = statusTone(appointment.status);
  return (
    <Card onPress={() => router.push(`/appointments/${appointment.id}`)}>
      <View style={{ flexDirection: row, gap: spacing.md - 2, alignItems: "center" }}>
        <Avatar name={name} hue={doctor?.avatarHue ?? 260} size={48} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText role="cardTitle" weight="bold" numberOfLines={1}>
            {name}
          </AppText>
          <View style={{ flexDirection: row, alignItems: "center", gap: 5 }}>
            <Icon name="calendar" size={13} color={colors.textFaint} />
            <AppText role="caption" color={colors.textMuted}>
              {formatShortDate(appointment.slot_date, t)} · {formatTime(appointment.slot_start, i18n)}
            </AppText>
          </View>
          {showPatient ? (
            <View style={{ flexDirection: row, alignItems: "center", gap: 5 }}>
              <Icon name="user" size={12} color={colors.textFaint} />
              <AppText role="tiny" color={colors.textFaint} numberOfLines={1}>
                {t("appointments.forPatient", { name: pickLang(isRTL, appointment.patient_name, appointment.patient_name_ar) })}
              </AppText>
            </View>
          ) : null}
        </View>
        <Badge label={t(st.key as never)} tone={st.tone} />
      </View>
    </Card>
  );
}

/* ------------------------------- PackageCard ----------------------------- */
export function PackageCard({ pkg, clinicName }: { pkg: HealthPackage; clinicName?: string }) {
  const { colors, row, isRTL, spacing, radii, scheme } = useTheme();
  const i18n = useI18n();
  const { t } = i18n;
  return (
    <Card onPress={() => router.push(`/packages/${pkg.id}`)} padded={false} style={{ width: 240 }}>
      <View style={{ padding: spacing.md - 2, gap: 6 }}>
        <View style={{ flexDirection: row, justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: radii.md,
              backgroundColor: colors.accent2,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="file-heart" size={21} color={scheme === "dark" ? colors.text : "#1E3A5F"} />
          </View>
          {pkg.tag ? <Badge label={t(`tags.${pkg.tag.key}` as never, { n: pkg.tag.n ?? 0 })} tone={pkg.tag.key === "discount" ? "error" : "violet"} /> : null}
        </View>
        <AppText role="cardTitle" weight="bold" numberOfLines={2}>
          {pickLang(isRTL, pkg.name, pkg.name_ar)}
        </AppText>
        <AppText role="tiny" color={colors.textMuted} numberOfLines={1}>
          {t("packages.includes", { n: pkg.tests_count })}{clinicName ? ` · ${clinicName}` : ""}
        </AppText>
        <View style={{ flexDirection: row, alignItems: "center", gap: 8, marginTop: 2 }}>
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
