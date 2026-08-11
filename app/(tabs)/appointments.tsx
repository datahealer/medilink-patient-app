import React, { useCallback, useState } from "react";
import { View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useTheme } from "@/theme";
import { useI18n } from "@/i18n";
import { repositories } from "@/data";
import { useQueryish } from "@/data/hooks";
import { useAppStore } from "@/stores/appStore";
import { AppointmentRow, AppText, Button, EmptyState, Screen, SegmentedTabs, Skeleton } from "@/components/ui";

export default function Appointments() {
  const { spacing, radii } = useTheme();
  const { t } = useI18n();
  const guest = useAppStore((s) => s.guest);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const list = useQueryish(() => repositories.appointment.list(tab), [tab]);

  useFocusEffect(
    useCallback(() => {
      list.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab]),
  );
  const doctors = useQueryish(() => repositories.doctor.search(), []);

  return (
    <Screen refreshing={list.isLoading} onRefresh={list.refetch}>
      <AppText role="screenTitle" style={{ marginTop: spacing.sm, marginBottom: spacing.sm }}>
        {t("appointments.title")}
      </AppText>
      <SegmentedTabs
        options={[
          { id: "upcoming", label: t("appointments.upcoming") },
          { id: "past", label: t("appointments.past") },
        ]}
        value={tab}
        onChange={(id) => setTab(id as "upcoming" | "past")}
      />
      <View style={{ gap: 10, marginTop: spacing.md }}>
        {guest ? (
          <EmptyState
            icon="lock"
            title={t("home.guestBody")}
            action={<Button label={t("common.signIn")} onPress={() => router.push("/auth/sign-in")} />}
          />
        ) : list.isLoading ? (
          <>
            <Skeleton height={92} radius={radii.lg} />
            <Skeleton height={92} radius={radii.lg} />
          </>
        ) : list.data?.length ? (
          list.data.map((a) => (
            <AppointmentRow key={a.id} appointment={a} doctor={doctors.data?.find((d) => d.id === a.doctor_id)} />
          ))
        ) : (
          <EmptyState
            icon="calendar-plus"
            title={tab === "upcoming" ? t("appointments.emptyUpcoming") : t("appointments.emptyPast")}
            body={tab === "upcoming" ? t("appointments.emptyUpcomingBody") : undefined}
            action={
              tab === "upcoming" ? (
                <Button label={t("appointments.findDoctor")} variant="tonal" onPress={() => router.push("/(tabs)/explore")} />
              ) : undefined
            }
          />
        )}
      </View>
    </Screen>
  );
}
