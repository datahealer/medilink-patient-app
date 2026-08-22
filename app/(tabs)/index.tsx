import React, { useCallback, useState } from "react";
import { Pressable, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/theme";
import { pickLang, useI18n } from "@/i18n";
import { useAppStore } from "@/stores/appStore";
import { repositories } from "@/data";
import { useQueryish } from "@/data/hooks";
import { daysUntil, formatShortDate, formatTime } from "@/utils/format";
import { ProfileSwitcher, ViewingAsBanner, personName, useActivePerson } from "@/components/ProfileSwitcher";
import {
  AppText,
  Avatar,
  Badge,
  Button,
  Card,
  ClinicCard,
  CtaButton,
  DoctorCard,
  Icon,
  Orbs,
  PackageCard,
  HScroll,
  Screen,
  SearchField,
  SectionHeader,
  Skeleton,
  SpecialtyTile,
  useSpecialtyGrid,
} from "@/components/ui";

/** Services shown on the home grid — 4×2 on a standard phone, 5+3 on a 16 Pro Max. */
const SERVICE_TILES = 8;

export default function Home() {
  const { colors, spacing, radii, row, isRTL } = useTheme();
  const grid = useSpecialtyGrid(SERVICE_TILES);
  const i18n = useI18n();
  const { t } = i18n;
  const guest = useAppStore((s) => s.guest);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  // Home reflects whichever profile is active — the account holder's by default.
  const { activePatientId, person } = useActivePerson();
  // A guest has no file to read from: never fetch (or show) somebody's visits.
  const upcoming = useQueryish(
    () => (guest ? Promise.resolve([]) : repositories.appointment.list("upcoming", activePatientId)),
    [activePatientId, guest],
  );
  const specialties = useQueryish(() => repositories.discovery.listSpecialties(), []);
  const packages = useQueryish(() => repositories.discovery.searchPackages(""), []);
  const clinics = useQueryish(() => repositories.discovery.featuredClinics(), []);
  const topDoctors = useQueryish(() => repositories.doctor.top(), []);
  const unread = useQueryish(() => repositories.notification.unreadCount(), []);

  const hour = new Date().getHours();
  const greetingKey = hour < 12 ? "home.greetingMorning" : hour < 17 ? "home.greetingAfternoon" : "home.greetingEvening";
  const firstName = person ? personName(person, isRTL).split(" ")[0] : "";

  const next = upcoming.data?.[0];
  const nextDoctor = useQueryish(
    () => (next ? repositories.doctor.get(next.doctor_id) : Promise.resolve(null)),
    [next?.doctor_id],
  );
  const refetchAll = () => {
    upcoming.refetch();
    unread.refetch();
  };

  // Reflect cross-screen mutations (payments, cancellations, profile switches).
  useFocusEffect(
    useCallback(() => {
      upcoming.refetch();
      unread.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activePatientId]),
  );

  return (
    <Screen refreshing={upcoming.isLoading} onRefresh={refetchAll}>
      {/* Header: identity + notifications. The logo lives in onboarding/auth — the home is about the PATIENT. */}
      <View style={{ flexDirection: row, alignItems: "center", gap: 12, marginTop: spacing.sm }}>
        <Pressable
          onPress={() => (guest ? router.push("/profile") : setSwitcherOpen(true))}
          accessibilityRole="button"
          accessibilityLabel={guest ? t("profile.title") : t("profiles.switch")}
        >
          <Avatar
            name={guest ? (isRTL ? "ز" : "G") : person ? personName(person, isRTL) : ""}
            hue={person?.avatarHue ?? 275}
            size={44}
          />
        </Pressable>
        <View style={{ flex: 1 }}>
          <AppText role="caption" color={colors.textMuted}>
            {t(greetingKey as never)}
          </AppText>
          <View style={{ flexDirection: row, alignItems: "center", gap: 5 }}>
            <AppText role="h2" weight="bold" numberOfLines={1} style={{ flexShrink: 1 }}>
              {guest ? t("home.guestHello") : firstName || " "}
            </AppText>
            {!guest ? <Icon name="chevron-down" size={15} color={colors.textFaint} /> : null}
          </View>
        </View>
        <Pressable
          onPress={() => router.push("/notifications")}
          accessibilityRole="button"
          accessibilityLabel={t("notif.title")}
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="bell" size={20} color={colors.text} />
          {(unread.data ?? 0) > 0 ? (
            <View
              style={{
                position: "absolute",
                top: 9,
                end: 10,
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: colors.error,
                borderWidth: 1.5,
                borderColor: colors.surface,
              }}
            />
          ) : null}
        </Pressable>
      </View>

      {/* Viewing a family member's file — one tap back to your own */}
      <ViewingAsBanner person={person} />

      {/* THE single search entry point (a launcher, not a second input) */}
      <View style={{ marginTop: spacing.md }}>
        <SearchField placeholder={t("home.searchPrompt")} onPressLauncher={() => router.push("/search")} />
      </View>

      {/* State first: the next visit — or, for a guest, the invitation to book.
          Booking is open to guests; sign-in stays a quiet secondary door. */}
      {guest ? (
        <Card style={{ marginTop: spacing.md }}>
          <AppText role="cardTitle" weight="bold">
            {t("home.guestBody")}
          </AppText>
          <View style={{ flexDirection: row, gap: 8, marginTop: 12 }}>
            <Button label={t("home.bookFirst")} variant="primary" style={{ flex: 1 }} onPress={() => router.push("/doctors")} />
            <Button label={t("common.signIn")} variant="outline" onPress={() => router.push("/auth/sign-in")} />
          </View>
        </Card>
      ) : upcoming.isLoading ? (
        <Skeleton height={150} radius={radii.xl} style={{ marginTop: spacing.md }} />
      ) : next && nextDoctor.data ? (
        <LinearGradient
          colors={[colors.heroFrom, colors.heroTo]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: radii.xl, padding: spacing.md + 2, marginTop: spacing.md, overflow: "hidden" }}
        >
          <Orbs color="#DFC8E7" opacity={0.13} />
          <View style={{ flexDirection: row, justifyContent: "space-between", alignItems: "center" }}>
            <AppText role="tiny" weight="bold" color="#DFC8E7">
              {t("home.nextAppointment")}
            </AppText>
            <Badge
              label={
                daysUntil(next.slot_date) === 0
                  ? t("home.upcomingToday")
                  : daysUntil(next.slot_date) === 1
                    ? t("home.upcomingTomorrow")
                    : t("home.upcomingIn", { n: daysUntil(next.slot_date) })
              }
              tone="lavender"
            />
          </View>
          <View style={{ flexDirection: row, gap: 12, alignItems: "center", marginTop: spacing.md }}>
            <Avatar name={pickLang(isRTL, nextDoctor.data.full_name, nextDoctor.data.full_name_ar)} hue={nextDoctor.data.avatarHue} size={50} />
            <View style={{ flex: 1 }}>
              <AppText role="cardTitle" weight="bold" color="#F9F4FA" numberOfLines={1}>
                {pickLang(isRTL, nextDoctor.data.full_name, nextDoctor.data.full_name_ar)}
              </AppText>
              <AppText role="caption" color="#C9B8D6" numberOfLines={1}>
                {pickLang(isRTL, nextDoctor.data.facility, nextDoctor.data.facility_ar)}
              </AppText>
            </View>
          </View>
          <View style={{ flexDirection: row, gap: 8, marginTop: spacing.md, alignItems: "center", flexWrap: "wrap" }}>
            <View style={{ flexDirection: row, gap: 6, alignItems: "center", backgroundColor: "rgba(249,244,250,0.12)", borderRadius: radii.sm + 2, paddingHorizontal: 10, height: 32 }}>
              <Icon name="calendar" size={14} color="#DFC8E7" />
              <AppText role="tiny" weight="bold" color="#F9F4FA">
                {formatShortDate(next.slot_date, t)}
              </AppText>
            </View>
            <View style={{ flexDirection: row, gap: 6, alignItems: "center", backgroundColor: "rgba(249,244,250,0.12)", borderRadius: radii.sm + 2, paddingHorizontal: 10, height: 32 }}>
              <Icon name="clock" size={14} color="#DFC8E7" />
              <AppText role="tiny" weight="bold" color="#F9F4FA">
                {formatTime(next.slot_start, i18n)}
              </AppText>
            </View>
            <View style={{ flex: 1 }} />
            <Button label={t("home.details")} variant="tonal" small onPress={() => router.push(`/appointments/${next.id}`)} />
          </View>
        </LinearGradient>
      ) : (
        <Card style={{ marginTop: spacing.md }}>
          <View style={{ flexDirection: row, gap: 12, alignItems: "center" }}>
            <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
              <Icon name="calendar-plus" size={22} color="#2E1A47" />
            </View>
            <View style={{ flex: 1 }}>
              <AppText role="cardTitle" weight="bold">
                {t("home.emptyUpcoming")}
              </AppText>
            </View>
          </View>
          <CtaButton label={t("home.bookFirst")} onPress={() => router.push("/doctors")} style={{ marginTop: 14 }} />
        </Card>
      )}

      {/* Services */}
      <SectionHeader title={t("home.services")} actionLabel={t("common.seeAll")} onAction={() => router.push("/specialties")} />
      <View style={{ flexDirection: row, flexWrap: "wrap", columnGap: grid.gap, rowGap: spacing.md }}>
        {(specialties.data ?? []).slice(0, SERVICE_TILES).map((s, i) => (
          <SpecialtyTile
            key={s.id}
            specialty={s}
            index={i}
            width={grid.tileWidth}
            onPress={() => router.push(`/services/${s.id}`)}
          />
        ))}
      </View>

      {/* Packages */}
      <SectionHeader title={t("home.packages")} actionLabel={t("common.seeAll")} onAction={() => router.push("/packages")} />
      <HScroll bleed={spacing.md}>
        {(packages.data ?? []).slice(0, 5).map((p) => (
          <PackageCard key={p.id} pkg={p} />
        ))}
      </HScroll>

      {/* Nearby clinics */}
      <SectionHeader title={t("home.nearby")} actionLabel={t("common.seeAll")} onAction={() => router.push("/clinics")} />
      <HScroll bleed={spacing.md}>
        {(clinics.data ?? []).map((c) => (
          <ClinicCard key={c.id} clinic={c} />
        ))}
      </HScroll>

      {/* Doctors — a general section now; "highly rated" is a filter, not the whole list */}
      <SectionHeader title={t("home.topDoctors")} actionLabel={t("common.seeAll")} onAction={() => router.push("/doctors")} />
      <HScroll bleed={spacing.md}>
        {(topDoctors.data ?? []).slice(0, 4).map((doctor) => (
          <DoctorCard key={doctor.id} doctor={doctor} compact />
        ))}
      </HScroll>

      <ProfileSwitcher
        visible={switcherOpen}
        onClose={() => setSwitcherOpen(false)}
        onManageFamily={() => router.push("/records/family")}
      />
    </Screen>
  );
}
