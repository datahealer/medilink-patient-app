import React, { useState } from "react";
import { Image, Pressable, View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/theme";
import { useI18n } from "@/i18n";
import { useAppStore } from "@/stores/appStore";
import { AppText, CtaButton, Icon, LinkDots, Orbs, type IconName } from "@/components/ui";
import { Screen } from "@/components/ui";

const SLIDES: { icon: IconName; titleKey: string; bodyKey: string }[] = [
  { icon: "map-pin", titleKey: "onboarding.s1Title", bodyKey: "onboarding.s1Body" },
  { icon: "calendar-check", titleKey: "onboarding.s2Title", bodyKey: "onboarding.s2Body" },
  { icon: "file-heart", titleKey: "onboarding.s3Title", bodyKey: "onboarding.s3Body" },
];

export default function Onboarding() {
  const { colors, spacing, radii, isRTL, row } = useTheme();
  const { t, locale, setLocale } = useI18n();
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const continueAsGuest = useAppStore((s) => s.continueAsGuest);
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const cardWidth = width - spacing.md * 2;

  const finish = (guest?: boolean) => {
    completeOnboarding();
    if (guest) {
      continueAsGuest();
      router.replace("/(tabs)");
    } else {
      router.replace("/auth/sign-in");
    }
  };

  return (
    <Screen scroll={false} padded={false}>
      {/* Language-first: the very first choice a user makes */}
      <View style={{ flexDirection: row, justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
        <View style={{ flexDirection: row, backgroundColor: colors.surfaceAlt, borderRadius: radii.pill, padding: 3 }}>
          {(["ar", "en"] as const).map((l) => (
            <Pressable
              key={l}
              onPress={() => setLocale(l)}
              accessibilityRole="button"
              style={{
                paddingHorizontal: 16,
                height: 33,
                borderRadius: radii.pill,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: locale === l ? colors.surface : "transparent",
              }}
            >
              <AppText role="label" weight={locale === l ? "bold" : "medium"} color={locale === l ? colors.text : colors.textMuted}>
                {l === "ar" ? "العربية" : "English"}
              </AppText>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={() => finish(true)} hitSlop={8} accessibilityRole="button">
          <AppText role="label" color={colors.textMuted}>
            {t("common.skip")}
          </AppText>
        </Pressable>
      </View>

      {/* Brand wordmark */}
      <View style={{ alignItems: "center", marginTop: spacing.lg }}>
        <Image
          source={isRTL ? require("../assets/brand/me-wordmark-ar.png") : require("../assets/brand/me-wordmark.png")}
          style={{ height: 34, width: 150, resizeMode: "contain", tintColor: colors.primary }}
        />
        <AppText role="caption" color={colors.textMuted} style={{ marginTop: 6 }}>
          {t("common.tagline")}
        </AppText>
      </View>

      {/* Slides — state-driven (a paged list misbehaves under manual RTL on some hosts) */}
      <View style={{ paddingHorizontal: spacing.md, marginTop: spacing.xl }}>
        <LinearGradient
          key={page}
          colors={[colors.heroFrom, colors.heroTo]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: cardWidth, borderRadius: radii.xl, padding: spacing.lg, minHeight: 330, justifyContent: "flex-end", overflow: "hidden" }}
        >
          <Orbs color="#DFC8E7" opacity={0.14} />
          <LinkDots color="#DFC8E7" opacity={0.1} />
          <View
            style={{
              width: 78,
              height: 78,
              borderRadius: 26,
              backgroundColor: "rgba(223,200,231,0.18)",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: spacing.lg,
            }}
          >
            <Icon name={SLIDES[page].icon} size={38} color="#DFC8E7" strokeWidth={1.4} />
          </View>
          <AppText role="screenTitle" color="#F9F4FA" style={{ marginBottom: 8 }}>
            {t(SLIDES[page].titleKey as never)}
          </AppText>
          <AppText role="body" color="#DFC8E7">
            {t(SLIDES[page].bodyKey as never)}
          </AppText>
        </LinearGradient>
      </View>

      {/* Dots */}
      <View style={{ flexDirection: row, justifyContent: "center", gap: 6, marginTop: spacing.lg }}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={{
              width: i === page ? 22 : 7,
              height: 7,
              borderRadius: 4,
              backgroundColor: i === page ? colors.primary : colors.border,
            }}
          />
        ))}
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm + 2 }}>
        <CtaButton
          label={page < SLIDES.length - 1 ? t("common.next") : t("onboarding.getStarted")}
          icon={page < SLIDES.length - 1 ? undefined : isRTL ? "arrow-left" : "arrow-right"}
          onPress={() => {
            if (page < SLIDES.length - 1) setPage(page + 1);
            else finish();
          }}
        />
        <Pressable onPress={() => finish(true)} accessibilityRole="button" style={{ alignItems: "center", padding: 8 }}>
          <AppText role="label" color={colors.primaryMuted}>
            {t("onboarding.continueGuest")}
          </AppText>
        </Pressable>
      </View>
    </Screen>
  );
}
