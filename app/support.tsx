import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { useTheme } from "@/theme";
import { useI18n } from "@/i18n";
import { chatWhatsApp, openMail, openTel } from "@/utils/actions";
import { AppHeader, AppText, Card, Divider, Icon, Screen, type IconName } from "@/components/ui";

const CALL_NUMBER = "80071111";
const WA_NUMBER = "+968 7111 0000";
const EMAIL = "care@medilink.om";

/** المساعدة والدعم — contact channels + the questions patients actually ask. */
export default function Support() {
  const { colors, spacing, row, isRTL } = useTheme();
  const { t } = useI18n();
  const [open, setOpen] = useState<number | null>(0);

  const contacts: { icon: IconName; fill?: boolean; color?: string; title: string; subtitle: string; onPress: () => void }[] = [
    { icon: "phone", title: t("support.callUs"), subtitle: "⁦" + CALL_NUMBER + "⁩", onPress: () => openTel(CALL_NUMBER) },
    { icon: "whatsapp", fill: true, color: "#25D366", title: t("support.whatsapp"), subtitle: "⁦" + WA_NUMBER + "⁩", onPress: () => chatWhatsApp(WA_NUMBER) },
    { icon: "mail", title: t("support.email"), subtitle: EMAIL, onPress: () => openMail(EMAIL) },
  ];

  const faqs = [1, 2, 3, 4, 5].map((n) => ({
    q: t(`support.q${n}` as never),
    a: t(`support.a${n}` as never),
  }));

  return (
    <Screen header={<AppHeader back title={t("profile.help")} />}>
      {/* Contact channels */}
      <AppText role="label" color={colors.textMuted} style={{ marginTop: spacing.sm, marginBottom: 8 }}>
        {t("support.contact")}
      </AppText>
      <Card padded={false} style={{ paddingHorizontal: spacing.md }}>
        {contacts.map((c, i) => (
          <View key={c.icon}>
            {i > 0 ? <Divider inset={54} /> : null}
            <Pressable
              onPress={c.onPress}
              accessibilityRole="button"
              style={({ pressed }) => ({ flexDirection: row, alignItems: "center", gap: spacing.md - 2, paddingVertical: 12, opacity: pressed ? 0.7 : 1 })}
            >
              <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
                <Icon name={c.icon} size={19} color={c.color ?? colors.primaryMuted} fill={c.fill} strokeWidth={c.fill ? 0 : 1.7} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText role="cardTitle" numberOfLines={1}>
                  {c.title}
                </AppText>
                <AppText role="caption" color={colors.textMuted} numberOfLines={1}>
                  {c.subtitle}
                </AppText>
              </View>
              <Icon name={isRTL ? "chevron-left" : "chevron-right"} size={17} color={colors.textFaint} />
            </Pressable>
          </View>
        ))}
      </Card>
      <View style={{ flexDirection: row, gap: 7, alignItems: "center", marginTop: 8 }}>
        <Icon name="clock" size={13} color={colors.textFaint} />
        <AppText role="tiny" color={colors.textFaint}>
          {t("support.hours")}
        </AppText>
      </View>

      {/* FAQ accordion */}
      <AppText role="label" color={colors.textMuted} style={{ marginTop: spacing.lg, marginBottom: 8 }}>
        {t("support.faq")}
      </AppText>
      <Card padded={false} style={{ paddingHorizontal: spacing.md }}>
        {faqs.map((f, i) => {
          const expanded = open === i;
          return (
            <View key={f.q}>
              {i > 0 ? <Divider inset={0} /> : null}
              <Pressable
                onPress={() => setOpen(expanded ? null : i)}
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                style={{ flexDirection: row, alignItems: "center", gap: 10, paddingVertical: 13 }}
              >
                <AppText role="label" weight="bold" style={{ flex: 1 }}>
                  {f.q}
                </AppText>
                <Icon name={expanded ? "chevron-up" : "chevron-down"} size={16} color={colors.textFaint} />
              </Pressable>
              {expanded ? (
                <AppText role="caption" color={colors.textMuted} style={{ paddingBottom: 13, lineHeight: 20 }}>
                  {f.a}
                </AppText>
              ) : null}
            </View>
          );
        })}
      </Card>

      {/* Emergency note */}
      <View style={{ flexDirection: row, gap: 8, alignItems: "center", marginTop: spacing.md }}>
        <Icon name="alert" size={15} color={colors.error} />
        <AppText role="caption" color={colors.error} style={{ flex: 1 }}>
          {t("support.emergency")}
        </AppText>
      </View>
    </Screen>
  );
}
