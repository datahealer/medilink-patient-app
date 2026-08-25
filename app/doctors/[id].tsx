import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useTheme } from "@/theme";
import { pickLang, useI18n } from "@/i18n";
import { repositories } from "@/data";
import { useQueryish } from "@/data/hooks";
import { formatOMR, formatShortDate, formatTime } from "@/utils/format";
import { shareWhatsApp } from "@/utils/actions";
import { FavButton } from "@/components/FavButton";
import {
  AppHeader,
  AppText,
  Avatar,
  Badge,
  Card,
  Chip,
  CtaButton,
  Divider,
  HScroll,
  Icon,
  Rating,
  Screen,
  Skeleton,
} from "@/components/ui";

// Specialty display names for the share message (falls back to the slug).
import { SPECIALTIES } from "@/data/mock/seed";
const ABOUT_SPEC = (slug: string) => SPECIALTIES.find((x) => x.id === slug)?.name ?? slug;
const ABOUT_SPEC_AR = (slug: string) => SPECIALTIES.find((x) => x.id === slug)?.name_ar ?? slug;

const LANG_LABELS: Record<string, { en: string; ar: string }> = {
  ar: { en: "Arabic", ar: "العربية" },
  en: { en: "English", ar: "الإنجليزية" },
  hi: { en: "Hindi", ar: "الهندية" },
  ml: { en: "Malayalam", ar: "المالايالامية" },
  ur: { en: "Urdu", ar: "الأردية" },
  fr: { en: "French", ar: "الفرنسية" },
  de: { en: "German", ar: "الألمانية" },
};

export default function DoctorDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing, radii, row, isRTL } = useTheme();
  const i18n = useI18n();
  const { t } = i18n;
  const doctor = useQueryish(() => repositories.doctor.get(id!), [id]);
  const reviews = useQueryish(() => repositories.doctor.reviews(id!), [id]);
  // Everything beyond consultation stays folded — consultation is the headline.
  const [servicesOpen, setServicesOpen] = useState(false);
  // Guests book too (client feedback 2026-08-20) — identity is confirmed just
  // before payment, inside the wizard, not at this button.
  const book = (href: string) => router.push(href as never);

  const d = doctor.data;

  if (!d) {
    return (
      <Screen header={<AppHeader back />}>
        <Skeleton height={200} radius={radii.xl} style={{ marginTop: spacing.md }} />
      </Screen>
    );
  }

  const name = pickLang(isRTL, d.full_name, d.full_name_ar);
  const title = pickLang(isRTL, d.title ?? "", d.title_ar ?? "");
  const facility = pickLang(isRTL, d.facility, d.facility_ar);

  return (
    <Screen
      header={
        <AppHeader
          back
          right={
            <>
            <Pressable
              onPress={() => shareWhatsApp(t("share.doctor", { name, specialty: pickLang(isRTL, ABOUT_SPEC(d.specialty), ABOUT_SPEC_AR(d.specialty)) }))}
              accessibilityRole="button"
              hitSlop={8}
              style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center" }}
            >
              <Icon name="whatsapp" size={19} color="#25D366" fill strokeWidth={0} />
            </Pressable>
            <FavButton kind="doctor" refId={d.id} />
            </>
          }
        />
      }
      footer={<CtaButton label={t("doctor.book")} icon="calendar-plus" onPress={() => book(`/booking/${d.id}`)} />}
    >
      {/* Identity */}
      <View style={{ flexDirection: row, gap: spacing.md, alignItems: "center" }}>
        <Avatar name={name} hue={d.avatarHue} size={84} radius={30} />
        <View style={{ flex: 1, gap: 3 }}>
          <AppText role="h2" weight="bold">
            {name}
          </AppText>
          <AppText role="caption" color={colors.textMuted}>
            {title} · {facility}
          </AppText>
          <View style={{ flexDirection: row, alignItems: "center", gap: 8, marginTop: 2, flexWrap: "wrap" }}>
            <View style={{ flexDirection: row, alignItems: "center", gap: 5 }}>
              <Icon name="shield-check" size={14} color={colors.success} />
              <AppText role="tiny" color={colors.success} weight="bold">
                {t("doctor.verified")}
              </AppText>
            </View>
            {d.tag ? <Badge label={t(`tags.${d.tag.key}` as never, { n: d.tag.n ?? 0 })} tone={d.tag.key === "lastSlots" ? "warning" : "lavender"} /> : null}
          </View>
        </View>
      </View>

      {/* Stats */}
      <View style={{ flexDirection: row, gap: 8, marginTop: spacing.md }}>
        {[
          { icon: "star" as const, value: d.rating.toFixed(1), label: t("doctor.reviews") },
          { icon: "clock" as const, value: t("common.years", { n: d.experience_years }), label: t("doctor.experience") },
          // Career-scale estimate: live review counts are honest (dozens, not
          // hundreds), so reviews alone would read "+18 patients" for a
          // 20-year consultant. Experience carries the bulk of the estimate.
          { icon: "users" as const, value: `+${d.reviews * 3 + d.experience_years * 40}`, label: t("doctor.patients") },
        ].map((s) => (
          <View
            key={s.label}
            style={{
              flex: 1,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radii.md + 2,
              alignItems: "center",
              paddingVertical: 12,
              gap: 3,
            }}
          >
            <Icon name={s.icon} size={17} color={colors.primaryMuted} />
            <AppText role="cardTitle" weight="bold">
              {s.value}
            </AppText>
            <AppText role="tiny" color={colors.textFaint}>
              {s.label}
            </AppText>
          </View>
        ))}
      </View>

      {/* Fees — consultation is the headline; other procedures this doctor
          performs (wound dressing, ear cleaning…) stay behind "+n more". */}
      <Card style={{ marginTop: spacing.md }} padded={false}>
        <View style={{ padding: spacing.md, flexDirection: row, alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: row, gap: 8, alignItems: "center" }}>
            <Icon name="stethoscope" size={17} color={colors.textMuted} />
            <AppText role="label">{t("doctor.fee")}</AppText>
          </View>
          <AppText role="price">{formatOMR(d.fee_omr, i18n)}</AppText>
        </View>
        {d.services?.length ? (
          <>
            {servicesOpen
              ? d.services.map((s) => (
                  <View key={s.id}>
                    <Divider />
                    <View style={{ paddingHorizontal: spacing.md, paddingVertical: 11, flexDirection: row, alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                      <AppText role="label" color={colors.textMuted} style={{ flexShrink: 1 }}>
                        {pickLang(isRTL, s.name, s.name_ar)}
                      </AppText>
                      <AppText role="label" weight="bold">
                        {formatOMR(s.price_omr, i18n)}
                      </AppText>
                    </View>
                  </View>
                ))
              : null}
            <Divider />
            <Pressable
              onPress={() => setServicesOpen((v) => !v)}
              accessibilityRole="button"
              accessibilityState={{ expanded: servicesOpen }}
              style={({ pressed }) => ({
                paddingHorizontal: spacing.md,
                paddingVertical: 11,
                flexDirection: row,
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <AppText role="label" weight="bold" color={colors.primaryMuted}>
                {servicesOpen ? t("doctor.showLess") : t("doctor.moreServices", { n: d.services.length })}
              </AppText>
              <Icon name={servicesOpen ? "chevron-up" : "chevron-down"} size={15} color={colors.primaryMuted} />
            </Pressable>
          </>
        ) : null}
      </Card>

      {/* About */}
      <AppText role="sectionTitle" style={{ marginTop: spacing.lg, marginBottom: 6 }}>
        {t("doctor.about")}
      </AppText>
      <AppText role="body" color={colors.textMuted}>
        {pickLang(isRTL, d.about, d.about_ar)}
      </AppText>

      {/* Languages */}
      <View style={{ flexDirection: row, gap: 8, marginTop: spacing.md, alignItems: "center", flexWrap: "wrap" }}>
        <Icon name="language" size={16} color={colors.textFaint} />
        {d.languages.map((l) => (
          <Badge key={l} label={pickLang(isRTL, LANG_LABELS[l]?.en ?? l, LANG_LABELS[l]?.ar ?? l)} tone="blue" />
        ))}
      </View>

      {/* Today's nearest slots */}
      {d.slots_today?.length ? (
        <>
          <AppText role="sectionTitle" style={{ marginTop: spacing.lg, marginBottom: 8 }}>
            {t("doctor.nextSlots")}
          </AppText>
          <View style={{ flexDirection: row, gap: 8, flexWrap: "wrap" }}>
            {d.slots_today.map((s) => (
              <Chip key={s} label={`${t("common.today")} · ${formatTime(s, i18n)}`} onPress={() => book(`/booking/${d.id}?slot=${s}`)} />
            ))}
          </View>
        </>
      ) : null}

      {/* Reviews */}
      <View style={{ flexDirection: row, justifyContent: "space-between", alignItems: "center", marginTop: spacing.lg, marginBottom: 8 }}>
        <AppText role="sectionTitle">{t("doctor.reviews")}</AppText>
        <Rating value={reviews.data?.summary.average ?? d.rating} count={reviews.data?.summary.total ?? d.reviews} />
      </View>
      <HScroll bleed={spacing.md}>
        {(reviews.data?.reviews ?? []).map((r) => (
          <Card key={r.id} style={{ width: 260 }}>
            <View style={{ flexDirection: row, justifyContent: "space-between", alignItems: "center" }}>
              <AppText role="label" weight="bold">
                {pickLang(isRTL, r.author, r.author_ar)}
              </AppText>
              <Rating value={r.rating} compact />
            </View>
            <AppText role="caption" color={colors.textMuted} style={{ marginTop: 6 }} numberOfLines={3}>
              {pickLang(isRTL, r.comment, r.comment_ar)}
            </AppText>
            <AppText role="tiny" color={colors.textFaint} style={{ marginTop: 6 }}>
              {formatShortDate(r.date, t)}
            </AppText>
          </Card>
        ))}
      </HScroll>
    </Screen>
  );
}
