import React, { useCallback, useState } from "react";
import { Pressable, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useTheme } from "@/theme";
import { pickLang, useI18n } from "@/i18n";
import { repositories } from "@/data";
import { useQueryish } from "@/data/hooks";
import { useAppStore } from "@/stores/appStore";
import { ProfileSwitcher, personName, useActivePerson } from "@/components/ProfileSwitcher";
import { ageFrom } from "@/utils/format";
import { AppText, Avatar, Badge, Button, Card, Divider, EmptyState, Icon, ListItem, Screen, Skeleton } from "@/components/ui";

const RELATION_KEY: Record<string, string> = {
  self: "profiles.accountHolder",
  spouse: "records.relationSpouse",
  child: "records.relationChild",
  parent: "records.relationParent",
  sibling: "records.relationSibling",
  other: "records.relationOther",
};

/**
 * Profile — everything personal in one place: the active person's health
 * records first, then the account. The identity card doubles as the profile
 * switcher, so reading a family member's file is one tap from here.
 */
export default function ProfileTab() {
  const { colors, spacing, radii, row, isRTL } = useTheme();
  const { t } = useI18n();
  const guest = useAppStore((s) => s.guest);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const { activePatientId, person, isLoading: personLoading, refetch: refetchPerson } = useActivePerson();
  const familyList = useQueryish(() => repositories.family.list(), []);
  const favs = useQueryish(() => repositories.favourite.list(), []);
  const people = useQueryish(() => repositories.patient.listPeople(), []);

  useFocusEffect(
    useCallback(() => {
      refetchPerson();
      familyList.refetch();
      favs.refetch();
      people.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activePatientId]),
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

  const viewingMember = !!person && !person.is_account_holder;

  return (
    <Screen>
      <AppText role="screenTitle" style={{ marginTop: spacing.sm, marginBottom: spacing.md }}>
        {t("records.title")}
      </AppText>

      {/* Identity + profile switcher — hold the shape while it loads */}
      {personLoading ? (
        <Skeleton height={86} radius={radii.lg} />
      ) : person ? (
        <Card onPress={() => setSwitcherOpen(true)}>
          <View style={{ flexDirection: row, gap: 12, alignItems: "center" }}>
            <Avatar name={personName(person, isRTL)} hue={person.avatarHue} size={54} />
            <View style={{ flex: 1, gap: 3 }}>
              <View style={{ flexDirection: row, gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <AppText role="cardTitle" weight="bold" numberOfLines={1} style={{ flexShrink: 1 }}>
                  {personName(person, isRTL)}
                </AppText>
                <Badge label={t(RELATION_KEY[person.relation] as never)} tone={person.is_account_holder ? "lavender" : "blue"} />
              </View>
              <AppText role="caption" color={colors.textMuted} numberOfLines={1}>
                {person.blood_group ? `${t("profile.bloodGroup")} ${"⁦" + person.blood_group + "⁩"} · ` : ""}
                {t("records.memberAge", { n: ageFrom(person.date_of_birth) })}
              </AppText>
            </View>
          </View>
          <View style={{ flexDirection: row, alignItems: "center", gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
            <Icon name="users" size={15} color={colors.primaryMuted} />
            <AppText role="label" weight="bold" color={colors.primaryMuted} style={{ flex: 1 }}>
              {t("profiles.switch")}
            </AppText>
            <AppText role="tiny" color={colors.textFaint}>
              {t("explore.results", { n: people.data?.length ?? 1 })}
            </AppText>
            <Icon name={isRTL ? "chevron-left" : "chevron-right"} size={15} color={colors.textFaint} />
          </View>
        </Card>
      ) : null}

      {/* Health records — of whoever is active */}
      <AppText role="label" color={colors.textMuted} style={{ marginTop: spacing.md, marginBottom: 8 }}>
        {t("records.healthGroup")}
      </AppText>
      <Card padded={false} style={{ paddingHorizontal: spacing.md }}>
        <ListItem icon="heart-pulse" title={t("records.history")} onPress={() => router.push("/records/history")} />
        <Divider inset={54} />
        <ListItem
          icon="shield-check"
          iconTone="blue"
          title={t("records.insurance")}
          subtitle={t("records.insuranceNote")}
          onPress={() => router.push("/records/insurance")}
        />
      </Card>

      {/* Account — always the account holder's, never a member's */}
      <AppText role="label" color={colors.textMuted} style={{ marginTop: spacing.md, marginBottom: 8 }}>
        {t("records.accountGroup")}
      </AppText>
      <Card padded={false} style={{ paddingHorizontal: spacing.md }}>
        <ListItem
          icon="users"
          title={t("records.family")}
          subtitle={familyList.isLoading ? "…" : `${familyList.data?.length ?? 0}`}
          onPress={() => router.push("/records/family")}
        />
        <Divider inset={54} />
        <ListItem
          icon="heart"
          title={t("records.favourites")}
          subtitle={favs.isLoading ? "…" : `${favs.data?.length ?? 0}`}
          onPress={() => router.push("/records/favourites")}
        />
        <Divider inset={54} />
        <ListItem icon="settings" iconTone="plain" title={t("records.profile")} onPress={() => router.push("/profile")} />
      </Card>

      {viewingMember ? (
        <Pressable
          onPress={() => useAppStore.getState().setActivePatient("self")}
          accessibilityRole="button"
          style={{ flexDirection: row, gap: 8, alignItems: "center", justifyContent: "center", marginTop: spacing.md }}
        >
          <Icon name={isRTL ? "arrow-right" : "arrow-left"} size={15} color={colors.primaryMuted} />
          <AppText role="label" weight="bold" color={colors.primaryMuted}>
            {t("profiles.backToMine")}
          </AppText>
        </Pressable>
      ) : null}

      <ProfileSwitcher
        visible={switcherOpen}
        onClose={() => setSwitcherOpen(false)}
        onManageFamily={() => router.push("/records/family")}
      />
    </Screen>
  );
}
