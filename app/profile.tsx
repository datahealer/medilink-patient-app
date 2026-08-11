import React, { useCallback, useState } from "react";
import { View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useTheme } from "@/theme";
import { pickLang, useI18n } from "@/i18n";
import { repositories } from "@/data";
import { useQueryish } from "@/data/hooks";
import { useAppStore } from "@/stores/appStore";
import { ageFrom } from "@/utils/format";
import {
  AppHeader,
  AppText,
  Avatar,
  Button,
  Card,
  Divider,
  ListItem,
  Screen,
  SegmentedTabs,
  Sheet,
} from "@/components/ui";

export default function Profile() {
  const { colors, spacing, row, isRTL } = useTheme();
  const { t, locale, setLocale } = useI18n();
  const mode = useAppStore((s) => s.mode);
  const setMode = useAppStore((s) => s.setMode);
  const signOut = useAppStore((s) => s.signOut);
  const authed = useAppStore((s) => s.authed);
  const profile = useQueryish(() => repositories.patient.getProfile(), []);
  const [confirmOut, setConfirmOut] = useState(false);

  // Coming back from تعديل الملف — show the fresh values.
  useFocusEffect(
    useCallback(() => {
      profile.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const p = profile.data;

  return (
    <Screen header={<AppHeader back title={t("profile.title")} />}>
      {p && authed ? (
        <Card style={{ marginTop: spacing.sm }}>
          <View style={{ flexDirection: row, gap: 14, alignItems: "center" }}>
            <Avatar name={pickLang(isRTL, p.full_name, p.full_name_ar)} hue={p.avatarHue} size={62} />
            <View style={{ flex: 1 }}>
              <AppText role="h2" weight="bold">
                {pickLang(isRTL, p.full_name, p.full_name_ar)}
              </AppText>
              <AppText role="caption" color={colors.textMuted}>
                {p.phone} · {p.email}
              </AppText>
            </View>
          </View>
          <View style={{ flexDirection: row, gap: 8, marginTop: 14 }}>
            {[
              { label: t("profile.bloodGroup"), value: p.blood_group },
              { label: t("profile.age"), value: String(ageFrom(p.date_of_birth)) },
              { label: t("profile.civil"), value: `•••• ${p.civil_number.slice(-4)}` },
            ].map((s) => (
              <View key={s.label} style={{ flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: 14, alignItems: "center", paddingVertical: 10, gap: 2 }}>
                <AppText role="cardTitle" weight="bold">
                  {s.value}
                </AppText>
                <AppText role="tiny" color={colors.textFaint}>
                  {s.label}
                </AppText>
              </View>
            ))}
          </View>
        </Card>
      ) : (
        <Card style={{ marginTop: spacing.sm }}>
          <AppText role="cardTitle" weight="bold">
            {t("home.guestBody")}
          </AppText>
          <Button label={t("common.signIn")} style={{ marginTop: 12 }} onPress={() => router.push("/auth/sign-in")} />
        </Card>
      )}

      {/* Language — the star setting; flips the whole app instantly */}
      <Card style={{ marginTop: spacing.md }}>
        <AppText role="label" weight="bold" style={{ marginBottom: 4 }}>
          {t("profile.language")}
        </AppText>
        <AppText role="tiny" color={colors.textFaint} style={{ marginBottom: 10 }}>
          {t("profile.languageNote")}
        </AppText>
        <SegmentedTabs
          options={[
            { id: "ar", label: "العربية" },
            { id: "en", label: "English" },
          ]}
          value={locale}
          onChange={(id) => setLocale(id as "ar" | "en")}
        />
      </Card>

      <Card style={{ marginTop: spacing.sm + 2 }}>
        <AppText role="label" weight="bold" style={{ marginBottom: 10 }}>
          {t("profile.theme")}
        </AppText>
        <SegmentedTabs
          options={[
            { id: "light", label: t("profile.themeLight") },
            { id: "dark", label: t("profile.themeDark") },
            { id: "system", label: t("profile.themeSystem") },
          ]}
          value={mode}
          onChange={(id) => setMode(id as never)}
        />
      </Card>

      <Card padded={false} style={{ marginTop: spacing.md, paddingHorizontal: spacing.md }}>
        {authed ? (
          <>
            <ListItem icon="pen" title={t("profile.editProfile")} onPress={() => router.push("/edit-profile")} />
            <Divider inset={54} />
          </>
        ) : null}
        <ListItem icon="bell" iconTone="blue" title={t("profile.notifications")} onPress={() => router.push("/notifications")} />
        <Divider inset={54} />
        <ListItem icon="phone" title={t("profile.help")} subtitle="80071111 · care@medilink.om" onPress={() => router.push("/support")} />
      </Card>

      {authed ? (
        <Card padded={false} style={{ marginTop: spacing.md, paddingHorizontal: spacing.md }}>
          <ListItem icon="logout" title={t("profile.signOut")} danger onPress={() => setConfirmOut(true)} trailing={<View />} />
        </Card>
      ) : null}

      <AppText role="tiny" color={colors.textFaint} align="center" style={{ marginTop: spacing.lg }}>
        {t("common.appName")} · {t("profile.version")}
      </AppText>

      <Sheet visible={confirmOut} onClose={() => setConfirmOut(false)} title={t("profile.signOutConfirm")}>
        <View style={{ gap: 10 }}>
          <Button
            label={t("profile.signOut")}
            variant="danger"
            onPress={() => {
              setConfirmOut(false);
              signOut();
              router.replace("/auth/sign-in");
            }}
          />
          <Button label={t("common.cancel")} variant="outline" onPress={() => setConfirmOut(false)} />
        </View>
      </Sheet>
    </Screen>
  );
}
