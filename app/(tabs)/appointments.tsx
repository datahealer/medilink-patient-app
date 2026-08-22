import React, { useCallback, useState } from "react";
import { View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useTheme } from "@/theme";
import { pickLang, useI18n } from "@/i18n";
import { repositories } from "@/data";
import { useQueryish } from "@/data/hooks";
import { useAppStore } from "@/stores/appStore";
import { ViewingAsBanner, useActivePerson } from "@/components/ProfileSwitcher";
import { AppointmentRow, AppText, Button, Chip, EmptyState, Screen, SegmentedTabs, Skeleton } from "@/components/ui";

export default function Appointments() {
  const { spacing, radii, row, isRTL } = useTheme();
  const { t } = useI18n();
  const guest = useAppStore((s) => s.guest);
  const authed = useAppStore((s) => s.authed);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  // One list for the whole household (client feedback 2026-08-20) — off by
  // default, the active profile stays the lens until the holder widens it.
  const [allFamily, setAllFamily] = useState(false);
  // Visits belong to the person whose profile is active.
  const { activePatientId, person } = useActivePerson();
  const family = useQueryish(() => (authed ? repositories.family.list() : Promise.resolve([])), [authed]);
  const list = useQueryish(
    () => repositories.appointment.list(tab, allFamily ? undefined : activePatientId),
    [tab, activePatientId, allFamily],
  );

  useFocusEffect(
    useCallback(() => {
      list.refetch();
      family.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab, activePatientId, allFamily]),
  );
  const doctors = useQueryish(() => repositories.doctor.search(), []);

  return (
    <Screen refreshing={list.isLoading} onRefresh={list.refetch}>
      <AppText role="screenTitle" style={{ marginTop: spacing.sm, marginBottom: spacing.sm }}>
        {t("appointments.title")}
      </AppText>
      {!guest ? <ViewingAsBanner person={person} /> : null}
      <SegmentedTabs
        options={[
          { id: "upcoming", label: t("appointments.upcoming") },
          { id: "past", label: t("appointments.past") },
        ]}
        value={tab}
        onChange={(id) => setTab(id as "upcoming" | "past")}
      />
      {(family.data?.length ?? 0) > 0 ? (
        // A visible pair, not a lone toggle: "whose visits?" answered by two
        // chips — the active person's only, or the whole family. Each chip
        // SETS its state, so escaping "All family" never requires knowing
        // that a selected chip can be tapped again.
        <View style={{ flexDirection: row, gap: 8, marginTop: spacing.sm, flexWrap: "wrap" }}>
          <Chip
            icon="user"
            label={
              activePatientId === "self"
                ? t("appointments.mineOnly")
                : t("appointments.personOnly", {
                    name: pickLang(isRTL, person?.full_name ?? "", person?.full_name_ar ?? "").split(" ")[0],
                  })
            }
            selected={!allFamily}
            onPress={() => setAllFamily(false)}
          />
          <Chip icon="users" label={t("appointments.allFamily")} selected={allFamily} onPress={() => setAllFamily(true)} />
        </View>
      ) : null}
      <View style={{ gap: 10, marginTop: spacing.md }}>
        {guest ? (
          // Nothing is locked for guests anymore — their first booking creates
          // the account, so the door here is booking itself.
          <EmptyState
            icon="calendar-plus"
            title={t("home.guestBody")}
            action={<Button label={t("appointments.findDoctor")} onPress={() => router.push("/doctors")} />}
          />
        ) : list.isLoading ? (
          <>
            <Skeleton height={92} radius={radii.lg} />
            <Skeleton height={92} radius={radii.lg} />
          </>
        ) : list.data?.length ? (
          list.data.map((a) => (
            <AppointmentRow
              key={a.id}
              appointment={a}
              doctor={doctors.data?.find((d) => d.id === a.doctor_id)}
              showPatient={allFamily}
            />
          ))
        ) : (
          <EmptyState
            icon="calendar-plus"
            title={tab === "upcoming" ? t("appointments.emptyUpcoming") : t("appointments.emptyPast")}
            body={tab === "upcoming" ? t("appointments.emptyUpcomingBody") : undefined}
            action={
              tab === "upcoming" ? (
                <Button label={t("appointments.findDoctor")} variant="tonal" onPress={() => router.push("/doctors")} />
              ) : undefined
            }
          />
        )}
      </View>
    </Screen>
  );
}
