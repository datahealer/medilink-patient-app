import React from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/theme";
import { pickLang, useI18n } from "@/i18n";
import { repositories } from "@/data";
import { useQueryish } from "@/data/hooks";
import { useAppStore } from "@/stores/appStore";
import type { NotificationItem } from "@/data/types";
import { AppHeader, AppText, Button, Card, EmptyState, Icon, Screen, type IconName } from "@/components/ui";

const KIND_ICON: Record<NotificationItem["kind"], IconName> = {
  assistant: "sparkle",
  appointment: "calendar",
  queue: "users",
  payment: "receipt",
  facility: "building",
  general: "bell",
};

export default function Notifications() {
  const { colors, spacing, row, isRTL } = useTheme();
  const { t } = useI18n();
  // Reminders and payment receipts belong to a file — a guest has none.
  const authed = useAppStore((s) => s.authed);
  const list = useQueryish(() => (authed ? repositories.notification.list() : Promise.resolve([])), [authed]);

  const groups: { key: "today" | "earlier"; items: NotificationItem[] }[] = [
    { key: "today", items: (list.data ?? []).filter((n) => n.minutes_ago < 60 * 24) },
    { key: "earlier", items: (list.data ?? []).filter((n) => n.minutes_ago >= 60 * 24) },
  ];

  const timeLabel = (mins: number) => {
    if (mins < 60) return t("common.minutes", { n: mins });
    if (mins < 60 * 24) return `${Math.round(mins / 60)} ${isRTL ? "س" : "h"}`;
    return `${Math.round(mins / (60 * 24))} ${isRTL ? "ي" : "d"}`;
  };

  if (!authed) {
    return (
      <Screen header={<AppHeader back title={t("notif.title")} />}>
        <EmptyState
          icon="lock"
          title={t("authWall.title")}
          body={t("authWall.body")}
          action={<Button label={t("common.signIn")} onPress={() => router.push("/auth/sign-in?next=%2Fnotifications" as never)} />}
        />
      </Screen>
    );
  }

  return (
    <Screen
      header={
        <AppHeader
          back
          title={t("notif.title")}
          right={
            <Pressable
              onPress={async () => {
                await repositories.notification.markAllRead();
                list.refetch();
              }}
              hitSlop={8}
              accessibilityRole="button"
            >
              <Icon name="check-circle" size={20} color={colors.primaryMuted} />
            </Pressable>
          }
        />
      }
    >
      {(list.data ?? []).length === 0 && !list.isLoading ? (
        <EmptyState icon="bell" title={t("notif.empty")} />
      ) : (
        groups.map((g) =>
          g.items.length ? (
            <View key={g.key}>
              <AppText role="tiny" weight="bold" color={colors.textFaint} style={{ marginTop: spacing.md, marginBottom: 8 }}>
                {t(`notif.${g.key}` as never)}
              </AppText>
              <View style={{ gap: 8 }}>
                {g.items.map((n) => (
                  <Card
                    key={n.id}
                    padded={false}
                    style={{ padding: 12 }}
                    onPress={() => (n.appointmentId ? router.push(`/appointments/${n.appointmentId}`) : undefined)}
                  >
                    <View style={{ flexDirection: row, gap: 10 }}>
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 14,
                          backgroundColor: n.unread ? colors.accent : colors.surfaceAlt,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Icon name={KIND_ICON[n.kind]} size={18} color={n.unread ? "#2E1A47" : colors.textMuted} />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <View style={{ flexDirection: row, alignItems: "center", gap: 6 }}>
                          <AppText role="label" weight={n.unread ? "bold" : "semibold"} style={{ flex: 1 }} numberOfLines={1}>
                            {pickLang(isRTL, n.title, n.title_ar)}
                          </AppText>
                          <AppText role="tiny" color={colors.textFaint}>
                            {timeLabel(n.minutes_ago)}
                          </AppText>
                          {n.unread ? <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.error }} /> : null}
                        </View>
                        <AppText role="caption" color={colors.textMuted} numberOfLines={2}>
                          {pickLang(isRTL, n.body, n.body_ar)}
                        </AppText>
                      </View>
                    </View>
                  </Card>
                ))}
              </View>
            </View>
          ) : null,
        )
      )}
    </Screen>
  );
}
