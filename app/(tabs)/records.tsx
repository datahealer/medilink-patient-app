import React, { useCallback } from "react";
import { View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useTheme } from "@/theme";
import { pickLang, useI18n } from "@/i18n";
import { repositories } from "@/data";
import { useQueryish } from "@/data/hooks";
import { useAppStore } from "@/stores/appStore";
import { ageFrom } from "@/utils/format";
import { AppText, Avatar, Button, Card, Divider, EmptyState, ListItem, Screen } from "@/components/ui";

/**
 * ملفي — the health file hub. One screen, seven doors, zero duplication:
 * labs, prescriptions, documents, history, family, insurance, account.
 */
export default function Records() {
  const { colors, spacing, row, isRTL } = useTheme();
  const { t } = useI18n();
  const guest = useAppStore((s) => s.guest);
  const profile = useQueryish(() => repositories.patient.getProfile(), []);
  const familyList = useQueryish(() => repositories.family.list(), []);
  const favs = useQueryish(() => repositories.favourite.list(), []);

  // Counts & the identity card change on other screens (edit profile,
  // add/remove family, heart toggles) — refresh when the tab regains focus.
  useFocusEffect(
    useCallback(() => {
      profile.refetch();
      familyList.refetch();
      favs.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  if (guest) {
    return (
      <Screen>
        <AppText role="screenTitle" style={{ marginTop: spacing.sm }}>
          {t("records.title")}
        </AppText>
        <EmptyState
          icon="lock"
          title={t("home.guestBody")}
          action={<Button label={t("common.signIn")} onPress={() => router.push("/auth/sign-in")} />}
        />
      </Screen>
    );
  }

  const p = profile.data;

  return (
    <Screen>
      <AppText role="screenTitle" style={{ marginTop: spacing.sm, marginBottom: spacing.md }}>
        {t("records.title")}
      </AppText>

      {/* Patient identity card */}
      {p ? (
        <Card onPress={() => router.push("/profile")}>
          <View style={{ flexDirection: row, gap: 12, alignItems: "center" }}>
            <Avatar name={pickLang(isRTL, p.full_name, p.full_name_ar)} hue={p.avatarHue} size={54} />
            <View style={{ flex: 1 }}>
              <AppText role="cardTitle" weight="bold">
                {pickLang(isRTL, p.full_name, p.full_name_ar)}
              </AppText>
              <AppText role="caption" color={colors.textMuted}>
                {t("profile.bloodGroup")} {"\u2066" + p.blood_group + "\u2069"} · {t("profile.age")} {ageFrom(p.date_of_birth)} · {pickLang(isRTL, p.address, p.address_ar)}
              </AppText>
            </View>
          </View>
        </Card>
      ) : null}

      <Card padded={false} style={{ marginTop: spacing.md, paddingHorizontal: spacing.md }}>
        <ListItem icon="heart-pulse" title={t("records.history")} onPress={() => router.push("/records/history")} />
        <Divider inset={54} />
        <ListItem
          icon="users"
          title={t("records.family")}
          subtitle={`${familyList.data?.length ?? 0}`}
          onPress={() => router.push("/records/family")}
        />
        <Divider inset={54} />
        <ListItem
          icon="heart"
          title={t("records.favourites")}
          subtitle={`${favs.data?.length ?? 0}`}
          onPress={() => router.push("/records/favourites")}
        />
        <Divider inset={54} />
        <ListItem
          icon="shield-check"
          iconTone="blue"
          title={t("records.insurance")}
          subtitle={t("records.insuranceNote")}
          onPress={() => router.push("/records/insurance")}
        />
      </Card>

      <Card padded={false} style={{ marginTop: spacing.md, paddingHorizontal: spacing.md }}>
        <ListItem icon="settings" iconTone="plain" title={t("records.profile")} onPress={() => router.push("/profile")} />
      </Card>
    </Screen>
  );
}
