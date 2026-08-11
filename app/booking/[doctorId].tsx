import React, { useEffect, useMemo, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useTheme } from "@/theme";
import { pickLang, useI18n } from "@/i18n";
import { repositories } from "@/data";
import { useQueryish } from "@/data/hooks";
import { useBookingStore } from "@/stores/bookingStore";
import { consultationTotal, formatDayDate, formatOMR, formatTime, todayISO } from "@/utils/format";
import { fontFamilyFor } from "@/theme/typography";
import {
  AppHeader,
  AppText,
  Avatar,
  Card,
  Chip,
  CtaButton,
  DayStrip,
  Divider,
  Icon,
  Screen,
  SlotGrid,
  Stepper,
} from "@/components/ui";

/**
 * Booking — one fluid 3-step wizard (visit → time → confirm).
 * No duplicated summary screens; one primary action per step.
 */
export default function BookingWizard() {
  const { doctorId, slot, package: packageId } = useLocalSearchParams<{ doctorId: string; slot?: string; package?: string }>();
  const { colors, spacing, radii, row, isRTL } = useTheme();
  const i18n = useI18n();
  const { t } = i18n;
  const draft = useBookingStore();

  const doctor = useQueryish(() => repositories.doctor.get(doctorId!), [doctorId]);
  const familyList = useQueryish(() => repositories.family.list(), []);
  const pkg = useQueryish(
    () => (packageId ? repositories.discovery.getPackage(packageId) : Promise.resolve(null)),
    [packageId],
  );

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    if (doctorId) {
      draft.start({ doctorId });
      if (slot) draft.set({ dateISO: todayISO(), slotStart: slot });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId]);

  useEffect(() => {
    if (pkg.data) draft.set({ reason: pickLang(isRTL, pkg.data.name, pkg.data.name_ar), packageId: pkg.data.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pkg.data?.id]);

  const slots = useQueryish(
    () =>
      draft.dateISO
        ? repositories.appointment.getSlots({ doctorId: doctorId!, date: draft.dateISO })
        : Promise.resolve([]),
    [doctorId, draft.dateISO],
  );

  const d = doctor.data;
  const fee = useMemo(() => {
    if (!d) return 0;
    if (pkg.data) return pkg.data.price_omr;
    return d.fee_omr;
  }, [d, pkg.data]);
  const money = consultationTotal(fee);

  if (!d) return <Screen header={<AppHeader back title={t("booking.title")} />}>{null}</Screen>;

  const name = pickLang(isRTL, d.full_name, d.full_name_ar);
  const facility = pickLang(isRTL, d.facility, d.facility_ar);

  const canNext = step === 0 ? true : step === 1 ? !!(draft.dateISO && draft.slotStart) : consent;

  const confirm = async () => {
    setBusy(true);
    const created = await repositories.appointment.create({
      doctorId: d.id,
      clinicId: d.facility_id,
      slotDate: draft.dateISO!,
      slotStart: draft.slotStart!,
      patientId: draft.patientId,
      reason: draft.reason || null,
      consent: true,
    });
    setBusy(false);
    draft.reset();
    router.replace(`/booking/success?id=${created.id}`);
  };

  return (
    <Screen
      header={<AppHeader back title={t("booking.title")} />}
      footer={
        <CtaButton
          label={step < 2 ? t("common.next") : t("booking.confirmPay")}
          loading={busy}
          disabled={!canNext}
          onPress={() => (step < 2 ? setStep(step + 1) : confirm())}
        />
      }
    >
      <Stepper labels={[t("booking.step1"), t("booking.step2"), t("booking.step3")]} current={step} />

      {/* Doctor context — always visible, never re-asked */}
      <Card padded={false} style={{ padding: 12 }}>
        <View style={{ flexDirection: row, gap: 10, alignItems: "center" }}>
          <Avatar name={name} hue={d.avatarHue} size={44} />
          <View style={{ flex: 1 }}>
            <AppText role="label" weight="bold" numberOfLines={1}>
              {name}
            </AppText>
            <AppText role="tiny" color={colors.textMuted} numberOfLines={1}>
              {facility}
            </AppText>
          </View>
          <AppText role="price">{formatOMR(fee, i18n)}</AppText>
        </View>
      </Card>

      {step === 0 ? (
        <View style={{ marginTop: spacing.md, gap: spacing.md }}>
          {/* Patient */}
          <View>
            <AppText role="label" color={colors.textMuted} style={{ marginBottom: 8 }}>
              {t("booking.forWhom")}
            </AppText>
            <View style={{ flexDirection: row, gap: 8, flexWrap: "wrap" }}>
              <Chip label={t("booking.myself")} selected={draft.patientId === "self"} onPress={() => draft.set({ patientId: "self" })} />
              {(familyList.data ?? []).map((m) => (
                <Chip
                  key={m.id}
                  label={pickLang(isRTL, m.full_name.split(" ")[0], m.full_name_ar.split(" ")[0])}
                  selected={draft.patientId === m.id}
                  onPress={() => draft.set({ patientId: m.id })}
                />
              ))}
            </View>
          </View>

          {/* Reason */}
          <View>
            <AppText role="label" color={colors.textMuted} style={{ marginBottom: 8 }}>
              {t("booking.reason")}
            </AppText>
            <TextInput
              value={draft.reason}
              onChangeText={(reason) => draft.set({ reason })}
              placeholder={t("booking.reasonPlaceholder")}
              placeholderTextColor={colors.textFaint}
              multiline
              style={{
                minHeight: 84,
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.inputBackground,
                padding: 14,
                fontFamily: fontFamilyFor("body", "medium", isRTL),
                fontSize: 14,
                color: colors.text,
                textAlign: isRTL ? "right" : "left",
                textAlignVertical: "top",
              }}
            />
          </View>
        </View>
      ) : null}

      {step === 1 ? (
        <View style={{ marginTop: spacing.md, gap: spacing.md }}>
          <View>
            <AppText role="label" color={colors.textMuted} style={{ marginBottom: 8 }}>
              {t("booking.chooseDate")}
            </AppText>
            <DayStrip selected={draft.dateISO} onSelect={(iso) => draft.set({ dateISO: iso, slotStart: null })} />
          </View>
          <View>
            <AppText role="label" color={colors.textMuted} style={{ marginBottom: 8 }}>
              {t("booking.chooseTime")}
            </AppText>
            {draft.dateISO ? (
              slots.isLoading ? null : (slots.data ?? []).length ? (
                <SlotGrid slots={slots.data ?? []} selected={draft.slotStart} onSelect={(s) => draft.set({ slotStart: s })} />
              ) : (
                <AppText role="caption" color={colors.textMuted}>
                  {t("booking.noSlots")}
                </AppText>
              )
            ) : null}
          </View>
        </View>
      ) : null}

      {step === 2 ? (
        <View style={{ marginTop: spacing.md, gap: spacing.md }}>
          <Card padded={false} style={{ paddingHorizontal: spacing.md }}>
            {[
              { label: t("booking.patient"), value: draft.patientId === "self" ? t("booking.myself") : pickLang(isRTL, familyList.data?.find((m) => m.id === draft.patientId)?.full_name ?? "", familyList.data?.find((m) => m.id === draft.patientId)?.full_name_ar ?? "") },
              { label: t("booking.when"), value: draft.dateISO ? `${formatDayDate(draft.dateISO, i18n)} · ${formatTime(draft.slotStart!, i18n)}` : "" },
              { label: t("booking.clinic"), value: facility },
            ].map((r2, i) => (
              <View key={r2.label}>
                {i > 0 ? <Divider /> : null}
                <View style={{ flexDirection: row, justifyContent: "space-between", paddingVertical: 12, gap: 12 }}>
                  <AppText role="label" color={colors.textMuted}>
                    {r2.label}
                  </AppText>
                  <AppText role="label" weight="bold" style={{ flexShrink: 1 }} numberOfLines={1}>
                    {r2.value}
                  </AppText>
                </View>
              </View>
            ))}
          </Card>

          {/* Payment — card only; no method choice, no processor name */}
          <View>
            <AppText role="label" color={colors.textMuted} style={{ marginBottom: 8 }}>
              {t("booking.payment")}
            </AppText>
            <View
              style={{
                flexDirection: row,
                gap: 12,
                alignItems: "center",
                borderRadius: radii.md,
                borderWidth: 1.5,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                padding: 14,
              }}
            >
              <Icon name="card" size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <AppText role="label" weight="bold">
                  {t("booking.payCard")}
                </AppText>
                <AppText role="tiny" color={colors.textFaint}>
                  {t("booking.payCardNote")}
                </AppText>
              </View>
              <Icon name="lock" size={16} color={colors.textFaint} />
            </View>
          </View>

          {/* PDPL consent — required before confirming */}
          <Pressable
            onPress={() => setConsent((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: consent }}
            style={{ flexDirection: row, gap: 10, alignItems: "flex-start" }}
          >
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 7,
                borderWidth: 1.8,
                marginTop: 2,
                borderColor: consent ? colors.primary : colors.border,
                backgroundColor: consent ? colors.primary : colors.surface,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {consent ? <Icon name="check" size={14} color={colors.textOnPrimary} strokeWidth={3} /> : null}
            </View>
            <AppText role="caption" color={colors.textMuted} style={{ flex: 1 }}>
              {t("booking.consent")}
            </AppText>
          </Pressable>

          {/* Money — OMR 3dp + VAT 5% */}
          <Card padded={false} style={{ paddingHorizontal: spacing.md }}>
            <View style={{ flexDirection: row, justifyContent: "space-between", paddingVertical: 11 }}>
              <AppText role="label" color={colors.textMuted}>
                {t("booking.feeConsult")}
              </AppText>
              <AppText role="label" weight="bold">
                {formatOMR(money.fee, i18n)}
              </AppText>
            </View>
            <Divider />
            <View style={{ flexDirection: row, justifyContent: "space-between", paddingVertical: 11 }}>
              <AppText role="label" color={colors.textMuted}>
                {t("common.vat")}
              </AppText>
              <AppText role="label" weight="bold">
                {formatOMR(money.vat, i18n)}
              </AppText>
            </View>
            <Divider />
            <View style={{ flexDirection: row, justifyContent: "space-between", paddingVertical: 12 }}>
              <AppText role="cardTitle" weight="bold">
                {t("common.total")}
              </AppText>
              <AppText role="price" color={colors.primaryMuted}>
                {formatOMR(money.total, i18n)}
              </AppText>
            </View>
          </Card>

          <View style={{ flexDirection: row, gap: 8, alignItems: "center" }}>
            <Icon name="clock" size={14} color={colors.textFaint} />
            <AppText role="tiny" color={colors.textFaint} style={{ flex: 1 }}>
              {t("booking.holdNote")}
            </AppText>
          </View>
        </View>
      ) : null}
    </Screen>
  );
}
