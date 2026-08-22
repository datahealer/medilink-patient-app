import React, { useState } from "react";
import { View } from "react-native";
import { router, usePathname } from "expo-router";
import { useTheme } from "@/theme";
import { useI18n } from "@/i18n";
import { useAppStore } from "@/stores/appStore";
import { AppText, Button, CtaButton, Icon, Sheet } from "@/components/ui";

/**
 * The sign-in wall. A guest may browse the whole catalogue, but anything that
 * reads or writes a patient file — booking a visit, saving a favourite —
 * stops here first. Guests must never reach a screen that loads family
 * members or writes into the account holder's records.
 *
 *   const { requireAuth, wall } = useAuthWall();
 *   <CtaButton onPress={() => requireAuth(() => router.push(href), href)} />
 *   {wall}
 *
 * `resumeHref` is where sign-in lands the patient afterwards; it defaults to
 * the screen they're on, so the wall never costs them their place.
 */
export function useAuthWall() {
  const authed = useAppStore((s) => s.authed);
  const path = usePathname();
  const { colors, spacing, row } = useTheme();
  const { t } = useI18n();
  const [pending, setPending] = useState<string | null>(null);

  const requireAuth = (action: () => void, resumeHref?: string) => {
    if (authed) {
      action();
      return;
    }
    setPending(resumeHref ?? path ?? "");
  };

  const wall = (
    <Sheet visible={pending !== null} onClose={() => setPending(null)} title={t("authWall.title")}>
      <View style={{ flexDirection: row, gap: 10, alignItems: "flex-start", marginBottom: spacing.md }}>
        <Icon name="lock" size={18} color={colors.primaryMuted} />
        <AppText role="body" color={colors.textMuted} style={{ flex: 1 }}>
          {t("authWall.body")}
        </AppText>
      </View>
      <View style={{ gap: 10 }}>
        <CtaButton
          label={t("common.signIn")}
          onPress={() => {
            const resume = pending;
            setPending(null);
            router.push(resume ? `/auth/sign-in?next=${encodeURIComponent(resume)}` : "/auth/sign-in");
          }}
        />
        <Button label={t("authWall.notNow")} variant="outline" onPress={() => setPending(null)} />
      </View>
    </Sheet>
  );

  return { authed, requireAuth, wall };
}
