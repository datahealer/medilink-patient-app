import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { WebView, type WebViewNavigation } from "react-native-webview";

import { useTheme } from "@/theme";
import { useI18n } from "@/i18n";
import { realPayments } from "@/data/real";
import { AppHeader, AppText, Button, CtaButton, Icon, Screen } from "@/components/ui";

/**
 * Real-mode payment — Thawani hosted checkout in an in-app WebView (BP-5),
 * mirroring production booking/checkout.tsx + payment-success.tsx in one
 * screen. The card page is Thawani's own (we never see card data); our return
 * URLs are intercepted before they load. Success is only declared after the
 * backend's /payments/verify confirms against the Thawani session — "trust the
 * webhook", with verify as the local-network fallback.
 */
type Phase = "creating" | "paying" | "verifying" | "stuck" | "failed";

const VERIFY_EVERY_MS = 3000;
const VERIFY_MAX_ATTEMPTS = 8;

export default function PayScreen() {
  const params = useLocalSearchParams<{ appointment_id?: string }>();
  const appointmentId = String(params.appointment_id ?? "");
  const { colors, spacing } = useTheme();
  const { t } = useI18n();

  const [phase, setPhase] = useState<Phase>("creating");
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string>("");
  const settled = useRef(false);
  const attempts = useRef(0);

  const startCheckout = useCallback(async () => {
    setPhase("creating");
    setErrorText("");
    try {
      const url = await realPayments.createCheckout(appointmentId);
      if (!url) throw new Error(t("booking.payFailed"));
      setCheckoutUrl(url);
      setPhase("paying");
    } catch (e) {
      setErrorText(e instanceof Error ? e.message : String(e));
      setPhase("failed");
    }
  }, [appointmentId, t]);

  useEffect(() => {
    if (appointmentId) void startCheckout();
  }, [appointmentId, startCheckout]);

  const verifyLoop = useCallback(() => {
    if (settled.current) return;
    settled.current = true;
    setPhase("verifying");
    attempts.current = 0;
    const tick = async () => {
      attempts.current += 1;
      try {
        const status = await realPayments.verify(appointmentId);
        if (status === "paid") {
          router.replace(`/booking/success?id=${appointmentId}`);
          return;
        }
      } catch {
        // transient — keep polling
      }
      if (attempts.current < VERIFY_MAX_ATTEMPTS) setTimeout(tick, VERIFY_EVERY_MS);
      else setPhase("stuck");
    };
    void tick();
  }, [appointmentId]);

  const cancelAndBack = useCallback(() => {
    if (settled.current) return;
    settled.current = true;
    // Free the reserved slot immediately (BP-3) instead of waiting out the TTL.
    void realPayments.releaseHold(appointmentId);
    router.back();
  }, [appointmentId]);

  const confirmCancel = useCallback(() => {
    if (settled.current) return;
    Alert.alert(t("booking.payCancelTitle"), t("booking.payCancelBody"), [
      { text: t("booking.payKeep"), style: "cancel" },
      { text: t("booking.payCancelConfirm"), style: "destructive", onPress: cancelAndBack },
    ]);
  }, [t, cancelAndBack]);

  /** Catch our return URLs before the WebView navigates to them. */
  const shouldLoad = useCallback(
    (url: string): boolean => {
      if (url.includes("/payment-success")) {
        verifyLoop();
        return false;
      }
      if (url.includes("/payment-cancel")) {
        cancelAndBack();
        return false;
      }
      return true;
    },
    [verifyLoop, cancelAndBack],
  );

  const centered = (
    icon: React.ComponentProps<typeof Icon>["name"],
    title: string,
    body: string,
    action?: React.ReactNode,
  ) => (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg, gap: 10 }}>
      <Icon name={icon} size={40} color={colors.primary} />
      <AppText role="cardTitle" weight="bold" align="center">
        {title}
      </AppText>
      <AppText role="caption" color={colors.textMuted} align="center">
        {body}
      </AppText>
      {action}
    </View>
  );

  return (
    <Screen
      padded={false}
      header={
        <AppHeader
          title={t("booking.payment")}
          right={
            phase === "paying" ? (
              <Button label={t("common.cancel")} variant="ghost" onPress={confirmCancel} />
            ) : undefined
          }
        />
      }
    >
      <Stack.Screen options={{ gestureEnabled: false }} />

      {phase === "creating"
        ? centered("card", t("booking.payment"), t("booking.paySecured"), <ActivityIndicator color={colors.primary} style={{ marginTop: 8 }} />)
        : null}

      {phase === "paying" && checkoutUrl ? (
        <View style={{ flex: 1 }}>
          <WebView
            source={{ uri: checkoutUrl }}
            originWhitelist={["https://*", "http://*"]}
            javaScriptEnabled
            domStorageEnabled
            androidLayerType="hardware"
            nestedScrollEnabled
            setSupportMultipleWindows={false}
            keyboardDisplayRequiresUserAction={false}
            onShouldStartLoadWithRequest={(req) => shouldLoad(req.url)}
            onNavigationStateChange={(nav: WebViewNavigation) => {
              if (nav.url.includes("/payment-success")) verifyLoop();
              else if (nav.url.includes("/payment-cancel")) cancelAndBack();
            }}
            onRenderProcessGone={cancelAndBack}
            onContentProcessDidTerminate={cancelAndBack}
          />
        </View>
      ) : null}

      {phase === "verifying"
        ? centered(
            "shield",
            t("booking.payVerifying"),
            t("booking.payVerifyHint"),
            <ActivityIndicator color={colors.primary} style={{ marginTop: 8 }} />,
          )
        : null}

      {phase === "stuck"
        ? centered(
            "clock",
            t("booking.payVerifying"),
            t("booking.payStuckHint"),
            <CtaButton
              label={t("booking.payRetry")}
              style={{ alignSelf: "stretch", marginTop: spacing.md }}
              onPress={() => {
                settled.current = false;
                verifyLoop();
              }}
            />,
          )
        : null}

      {phase === "failed"
        ? centered(
            "alert",
            t("booking.payFailed"),
            errorText,
            <View style={{ alignSelf: "stretch", gap: 10, marginTop: spacing.md }}>
              <CtaButton label={t("booking.payRetry")} onPress={() => void startCheckout()} />
              <Button label={t("common.cancel")} variant="outline" onPress={cancelAndBack} />
            </View>,
          )
        : null}
    </Screen>
  );
}
