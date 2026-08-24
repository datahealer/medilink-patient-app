import React, { useEffect, useRef, useState } from "react";
import { Image, Pressable, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/theme";
import { useI18n } from "@/i18n";
import { authBridge } from "@/data";
import { useAppStore } from "@/stores/appStore";
import { fontFamilyFor } from "@/theme/typography";
import { AppHeader, AppText, CtaButton, Icon, Orbs, Screen } from "@/components/ui";

export default function SignIn() {
  // `next` comes from the sign-in wall — resume whatever the guest was doing.
  const { next } = useLocalSearchParams<{ next?: string }>();
  const { colors, spacing, radii, isRTL, row } = useTheme();
  const { t } = useI18n();
  const signIn = useAppStore((s) => s.signIn);
  const continueAsGuest = useAppStore((s) => s.continueAsGuest);
  const [phone, setPhone] = useState("9123 4567");
  const [stage, setStage] = useState<"phone" | "otp">("phone");
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [busy, setBusy] = useState(false);
  const otpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Demo nicety: the OTP "arrives" and fills itself.
  useEffect(() => {
    if (stage === "otp") {
      otpTimer.current = setTimeout(() => setOtp(["1", "2", "3", "4"]), 900);
      return () => {
        if (otpTimer.current) clearTimeout(otpTimer.current);
      };
    }
  }, [stage]);

  const [error, setError] = useState<string | null>(null);

  const complete = async () => {
    setBusy(true);
    setError(null);
    try {
      // Mock: theater. Real: a live Supabase session (demo account behind the
      // OTP sheet — see src/data/real/auth.ts).
      await authBridge.demoSignIn(phone);
      signIn();
      router.replace(next ? (decodeURIComponent(next) as never) : "/(tabs)");
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Screen padded={false} scroll header={router.canGoBack() ? <AppHeader back /> : undefined}>
      {/* Brand hero */}
      <LinearGradient
        colors={[colors.heroFrom, colors.heroTo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          margin: spacing.md,
          borderRadius: radii.xl,
          padding: spacing.lg,
          paddingVertical: spacing.xl,
          overflow: "hidden",
          alignItems: "center",
        }}
      >
        <Orbs color="#DFC8E7" opacity={0.15} />
        <Image
          source={isRTL ? require("../../assets/brand/me-wordmark-ar.png") : require("../../assets/brand/me-wordmark.png")}
          style={{ height: 40, width: 170, resizeMode: "contain", tintColor: "#F9F4FA" }}
        />
        <AppText role="caption" color="#DFC8E7" style={{ marginTop: 8 }} align="center">
          {t("common.tagline")}
        </AppText>
      </LinearGradient>

      <View style={{ paddingHorizontal: spacing.md, gap: spacing.sm }}>
        <AppText role="screenTitle">{t("auth.signInTitle")}</AppText>
        <AppText role="body" color={colors.textMuted}>
          {stage === "phone" ? t("auth.signInBody") : t("auth.otpHint", { phone: `⁦+968 ${phone}⁩` })}
        </AppText>

        {stage === "phone" ? (
          <>
            <AppText role="label" color={colors.textMuted} style={{ marginTop: spacing.md }}>
              {t("auth.phoneLabel")}
            </AppText>
            <View style={{ flexDirection: row, gap: 8 }}>
              <View
                style={{
                  height: 52,
                  paddingHorizontal: 14,
                  borderRadius: radii.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.inputBackground,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <AppText role="cardTitle" weight="bold" style={{ writingDirection: "ltr" }}>
                  +968
                </AppText>
              </View>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                style={{
                  flex: 1,
                  height: 52,
                  borderRadius: radii.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.inputBackground,
                  paddingHorizontal: 16,
                  fontFamily: fontFamilyFor("body", "bold", false),
                  fontSize: 16,
                  color: colors.text,
                  textAlign: isRTL ? "right" : "left",
                }}
              />
            </View>
            <CtaButton label={t("common.next")} onPress={() => setStage("otp")} style={{ marginTop: spacing.md }} />
          </>
        ) : (
          <>
            {/* OTP cells stay LTR even in Arabic (numerals are LTR) */}
            <View style={{ flexDirection: "row", gap: 10, justifyContent: "center", marginVertical: spacing.lg }}>
              {otp.map((digit, i) => (
                <View
                  key={i}
                  style={{
                    width: 56,
                    height: 60,
                    borderRadius: radii.md,
                    borderWidth: 1.5,
                    borderColor: digit ? colors.primary : colors.border,
                    backgroundColor: colors.inputBackground,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <AppText role="h2" weight="bold">
                    {digit}
                  </AppText>
                </View>
              ))}
            </View>
            {error ? (
              <AppText role="caption" color={colors.error} align="center" style={{ marginBottom: 8 }}>
                {error}
              </AppText>
            ) : null}
            <CtaButton label={t("auth.verify")} loading={busy} disabled={!otp[3]} onPress={() => void complete()} />
            <Pressable onPress={() => setOtp(["1", "2", "3", "4"])} style={{ alignItems: "center", padding: 10 }} accessibilityRole="button">
              <AppText role="label" color={colors.primaryMuted}>
                {t("auth.resend")}
              </AppText>
            </Pressable>
          </>
        )}

        <View style={{ flexDirection: row, alignItems: "center", gap: 8, marginTop: spacing.md, justifyContent: "center" }}>
          <Icon name="lock" size={14} color={colors.textFaint} />
          <AppText role="tiny" color={colors.textFaint}>
            {t("auth.secureNote")}
          </AppText>
        </View>

        <Pressable
          onPress={() => {
            continueAsGuest();
            router.replace("/(tabs)");
          }}
          accessibilityRole="button"
          style={{ alignItems: "center", padding: 12, marginTop: spacing.sm }}
        >
          <AppText role="label" color={colors.primaryMuted}>
            {t("onboarding.continueGuest")}
          </AppText>
        </Pressable>
      </View>
    </Screen>
  );
}
