import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useTheme } from "@/theme";
import { pickLang, useI18n } from "@/i18n";
import { authBridge, isRealData, repositories } from "@/data";
import { useQueryish } from "@/data/hooks";
import type { FamilyRelation, Gender } from "@/data/types";
import { useBookingStore } from "@/stores/bookingStore";
import { useAppStore } from "@/stores/appStore";
import { consultationTotal, formatDayDate, formatOMR, formatTime, todayISO, toWesternDigits } from "@/utils/format";
import { figuresFor, fontFamilyFor, inputFontSize } from "@/theme/typography";
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
  LoadingNarrator,
  Screen,
  Sheet,
  Skeleton,
  SlotGrid,
  Stepper,
} from "@/components/ui";

/**
 * Booking — one fluid 3-step wizard (visit → time → confirm).
 * No duplicated summary screens; one primary action per step.
 *
 * Guests book the whole way through (client feedback 2026-08-20): nothing asks
 * them to "sign in". Just before payment they give a phone number, who the
 * visit is for, and the patient's age; verifying the OTP signs them up (new
 * number) or in (known number) without ever saying so.
 */

/** Who a guest can book for — the noun pair becomes the family-file name. */
const GUEST_RELATIONS: {
  key: string;
  labelKey: string;
  relation: FamilyRelation;
  gender: Gender;
  name: { en: string; ar: string };
}[] = [
  { key: "wife", labelKey: "booking.relWife", relation: "spouse", gender: "female", name: { en: "My wife", ar: "زوجتي" } },
  { key: "husband", labelKey: "booking.relHusband", relation: "spouse", gender: "male", name: { en: "My husband", ar: "زوجي" } },
  { key: "son", labelKey: "booking.relSon", relation: "child", gender: "male", name: { en: "My son", ar: "ابني" } },
  { key: "daughter", labelKey: "booking.relDaughter", relation: "child", gender: "female", name: { en: "My daughter", ar: "ابنتي" } },
  { key: "father", labelKey: "booking.relFather", relation: "parent", gender: "male", name: { en: "My father", ar: "والدي" } },
  { key: "mother", labelKey: "booking.relMother", relation: "parent", gender: "female", name: { en: "My mother", ar: "والدتي" } },
  { key: "other", labelKey: "booking.relOther", relation: "other", gender: "female", name: { en: "Family member", ar: "أحد أفراد العائلة" } },
];

export default function BookingWizard() {
  const { doctorId, slot, package: packageId } = useLocalSearchParams<{ doctorId: string; slot?: string; package?: string }>();
  const { colors, spacing, radii, row, isRTL } = useTheme();
  const i18n = useI18n();
  const { t } = i18n;
  const draft = useBookingStore();
  const activePatientId = useAppStore((s) => s.activePatientId);
  const authed = useAppStore((s) => s.authed);
  const signIn = useAppStore((s) => s.signIn);
  const patientConsents = useAppStore((s) => s.patientConsents);
  const clinicConsents = useAppStore((s) => s.clinicConsents);
  const promoConsent = useAppStore((s) => s.promoConsent);
  const grantPatientConsent = useAppStore((s) => s.grantPatientConsent);
  const grantClinicConsent = useAppStore((s) => s.grantClinicConsent);
  const decidePromoConsent = useAppStore((s) => s.decidePromoConsent);

  const doctor = useQueryish(() => repositories.doctor.get(doctorId!), [doctorId]);
  // A guest has no file and no family — never load somebody else's people here.
  const familyList = useQueryish(() => (authed ? repositories.family.list() : Promise.resolve([])), [authed]);
  const pkg = useQueryish(
    () => (packageId ? repositories.discovery.getPackage(packageId) : Promise.resolve(null)),
    [packageId],
  );

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  // Real-mode failures (RPC refusals, auth) surface inline — declared with the
  // other hooks: the component early-returns while the doctor loads, and a
  // hook after that return breaks the hooks order (React #310).
  const [flowError, setFlowError] = useState<string | null>(null);

  // Consents — each is shown at most once, ever (see appStore).
  const [pdplChecked, setPdplChecked] = useState(false);
  const [clinicChecked, setClinicChecked] = useState(false);
  const [promoChecked, setPromoChecked] = useState(false);

  // Guest identity, collected just before payment. `guest` is latched at mount
  // so the silent sign-in mid-flow can't reshape the screen underneath them.
  const [guestFlow] = useState(!authed);
  const [relation, setRelation] = useState<string>("self");
  // Prefilled like the sign-in screen (demo nicety) — a placeholder that looks
  // like a phone number reads as "already filled" and stalls the flow.
  const [phone, setPhone] = useState("9123 4567");
  // Booking for a relative creates their family file, and a file needs a real
  // name — the relation ("my wife") only says how they're attached to the account.
  const [patientName, setPatientName] = useState("");
  const [age, setAge] = useState("");
  const [otpOpen, setOtpOpen] = useState(false);
  const [otp, setOtp] = useState(["", "", "", ""]);
  const otpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (doctorId) {
      // Booking defaults to whoever's profile is active — if you're looking at
      // your daughter's file, the visit is for her unless you change it.
      draft.start({ doctorId, patientId: guestFlow ? "self" : activePatientId });
      if (slot) draft.set({ dateISO: todayISO(), slotStart: slot });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId, activePatientId]);

  useEffect(() => {
    if (pkg.data) draft.set({ reason: pickLang(isRTL, pkg.data.name, pkg.data.name_ar), packageId: pkg.data.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pkg.data?.id]);

  // Demo nicety (mirrors sign-in): the OTP "arrives" and fills itself.
  useEffect(() => {
    if (otpOpen) {
      otpTimer.current = setTimeout(() => setOtp(["1", "2", "3", "4"]), 900);
      return () => {
        if (otpTimer.current) clearTimeout(otpTimer.current);
      };
    }
    setOtp(["", "", "", ""]);
  }, [otpOpen]);

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

  /* Which consents does THIS booking still need? A guest booking for a new
     person always needs the patient consent — the file doesn't exist yet. */
  const patientKey = guestFlow && relation !== "self" ? null : draft.patientId;
  const needPdpl = patientKey === null || !patientConsents.includes(patientKey);
  const needClinic = !clinicConsents.includes(d.facility_id);
  const askPromo = promoConsent === "unset";

  const phoneOk = phone.replace(/\D/g, "").length >= 8;
  const ageOk = /^\d{1,3}$/.test(age.trim()) && Number(age) > 0 && Number(age) < 120;
  // The patient's own name is only needed when it isn't the account holder.
  const nameOk = relation === "self" || patientName.trim().length >= 2;
  const consentsOk = (!needPdpl || pdplChecked) && (!needClinic || clinicChecked);
  const canNext =
    step === 0
      ? true
      : step === 1
        ? !!(draft.dateISO && draft.slotStart)
        : consentsOk && (!guestFlow || (phoneOk && nameOk && ageOk));

  /** Create the visit + persist every consent decision, then celebrate. */
  const createAppointment = async (patientId: string) => {
    const created = await repositories.appointment.create({
      doctorId: d.id,
      clinicId: d.facility_id,
      slotDate: draft.dateISO!,
      slotStart: draft.slotStart!,
      patientId,
      reason: draft.reason || null,
      consent: true,
    });
    grantPatientConsent(patientId);
    grantClinicConsent(d.facility_id);
    if (askPromo) decidePromoConsent(promoChecked);
    setBusy(false);
    draft.reset();
    // Real mode: the slot is held pending payment — card checkout confirms it.
    // Mock keeps the original celebrate-immediately behavior.
    if (isRealData && created.payment_status !== "paid") {
      router.replace(`/booking/pay?appointment_id=${created.id}`);
    } else {
      router.replace(`/booking/success?id=${created.id}`);
    }
  };

  const confirm = async () => {
    setBusy(true);
    setFlowError(null);
    try {
      await createAppointment(draft.patientId);
    } catch (e) {
      setBusy(false);
      setFlowError(e instanceof Error ? e.message : String(e));
    }
  };

  /**
   * The OTP checked out: the number either matched an account (signed in) or
   * didn't (signed up) — the patient never sees the difference. Booking for a
   * relative creates their family file on the spot from name + relation + age.
   */
  const verifyAndPay = async () => {
    setBusy(true);
    setFlowError(null);
    try {
      // Real mode: the OTP sheet resolves to a real Supabase session first
      // (demo account behind the theater — see src/data/real/auth.ts).
      await authBridge.demoSignIn(phone);
      signIn();
      let patientId = "self";
      const rel = GUEST_RELATIONS.find((r) => r.key === relation);
      if (rel) {
        // The typed name goes on the file as-is in both language slots — the
        // patient wrote it once, in their script; production transliterates.
        const name = patientName.trim();
        const member = await repositories.family.add({
          full_name: name,
          full_name_ar: name,
          relation: rel.relation,
          gender: rel.gender,
          date_of_birth: `${new Date().getFullYear() - Number(age)}-01-01`,
        });
        patientId = member.id;
      }
      setOtpOpen(false);
      await createAppointment(patientId);
    } catch (e) {
      setBusy(false);
      setFlowError(e instanceof Error ? e.message : String(e));
    }
  };

  const patientIsSelf = guestFlow ? relation === "self" : draft.patientId === "self";
  const patientLabel =
    guestFlow
      ? relation === "self"
        ? t("booking.myself")
        : patientName.trim() || t(GUEST_RELATIONS.find((r) => r.key === relation)!.labelKey as never)
      : draft.patientId === "self"
        ? t("booking.myself")
        : pickLang(
            isRTL,
            familyList.data?.find((m) => m.id === draft.patientId)?.full_name ?? "",
            familyList.data?.find((m) => m.id === draft.patientId)?.full_name_ar ?? "",
          );

  // First-person consent for your own file; booking for a relative asserts
  // the authority to consent on their behalf, naming the patient (the typed
  // name, or the relation until it's typed).
  const pdplText = patientIsSelf ? t("booking.consent") : t("booking.consentFor", { name: patientLabel });

  const inputStyle = {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.inputBackground,
    color: colors.text,
    fontFamily: fontFamilyFor("body", "medium", isRTL),
    ...figuresFor(isRTL),
  } as const;

  const checkboxRow = (checked: boolean, toggle: () => void, label: string) => (
    <Pressable
      onPress={toggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={{ flexDirection: row, gap: 10, alignItems: "flex-start" }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 7,
          borderWidth: 1.8,
          marginTop: 2,
          borderColor: checked ? colors.primary : colors.border,
          backgroundColor: checked ? colors.primary : colors.surface,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {checked ? <Icon name="check" size={14} color={colors.textOnPrimary} strokeWidth={3} /> : null}
      </View>
      <AppText role="caption" color={colors.textMuted} style={{ flex: 1 }}>
        {label}
      </AppText>
    </Pressable>
  );

  return (
    <Screen
      header={<AppHeader back title={t("booking.title")} />}
      footer={
        <CtaButton
          label={step < 2 ? t("common.next") : t("booking.confirmPay")}
          loading={busy}
          disabled={!canNext}
          onPress={() => (step < 2 ? setStep(step + 1) : guestFlow ? setOtpOpen(true) : confirm())}
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
          {/* Patient — family files for members, relations for guests */}
          <View>
            <AppText role="label" color={colors.textMuted} style={{ marginBottom: 8 }}>
              {t("booking.forWhom")}
            </AppText>
            <View style={{ flexDirection: row, gap: 8, flexWrap: "wrap" }}>
              {guestFlow ? (
                <>
                  <Chip label={t("booking.myself")} selected={relation === "self"} onPress={() => setRelation("self")} />
                  {GUEST_RELATIONS.map((r) => (
                    <Chip key={r.key} label={t(r.labelKey as never)} selected={relation === r.key} onPress={() => setRelation(r.key)} />
                  ))}
                </>
              ) : (
                <>
                  <Chip label={t("booking.myself")} selected={draft.patientId === "self"} onPress={() => draft.set({ patientId: "self" })} />
                  {(familyList.data ?? []).map((m) => (
                    <Chip
                      key={m.id}
                      label={pickLang(isRTL, m.full_name.split(" ")[0], m.full_name_ar.split(" ")[0])}
                      selected={draft.patientId === m.id}
                      onPress={() => draft.set({ patientId: m.id })}
                    />
                  ))}
                </>
              )}
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
                ...inputStyle,
                minHeight: 84,
                padding: 14,
                fontSize: inputFontSize(14, isRTL),
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
              slots.isLoading ? (
                // Live availability takes a round-trip — hold the grid's place.
                <View style={{ flexDirection: row, flexWrap: "wrap", gap: 8 }}>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} width={96} height={44} radius={radii.md} />
                  ))}
                </View>
              ) : (slots.data ?? []).length ? (
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
              { label: t("booking.patient"), value: patientLabel },
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

          {/* Guest identity — phone + patient age, verified by OTP on confirm.
              Deliberately never worded as "sign in" or "create an account". */}
          {guestFlow ? (
            <View style={{ gap: spacing.sm }}>
              <View>
                <AppText role="label" color={colors.textMuted} style={{ marginBottom: 8 }}>
                  {t("booking.yourPhone")}
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
                    onChangeText={(v) => setPhone(toWesternDigits(v))}
                    keyboardType="phone-pad"
                    placeholder="9123 4567"
                    placeholderTextColor={colors.textFaint}
                    style={{
                      ...inputStyle,
                      flex: 1,
                      height: 52,
                      paddingHorizontal: 16,
                      fontFamily: fontFamilyFor("body", "bold", false),
                      fontSize: 16,
                      textAlign: isRTL ? "right" : "left",
                    }}
                  />
                </View>
                {/* Say WHY the pay button is disabled — a mute disabled CTA
                    reads as a bug, not as "a field is missing". */}
                <AppText role="tiny" color={phoneOk ? colors.textFaint : colors.error} style={{ marginTop: 6 }}>
                  {phoneOk ? t("booking.phoneNote") : t("booking.phoneInvalid")}
                </AppText>
              </View>
              {relation !== "self" ? (
                <View>
                  <AppText role="label" color={colors.textMuted} style={{ marginBottom: 8 }}>
                    {t("booking.patientName")}
                  </AppText>
                  <TextInput
                    value={patientName}
                    onChangeText={setPatientName}
                    autoCapitalize="words"
                    placeholder={t("booking.namePlaceholder")}
                    placeholderTextColor={colors.textFaint}
                    style={{
                      ...inputStyle,
                      height: 52,
                      paddingHorizontal: 16,
                      fontSize: inputFontSize(15, isRTL),
                      textAlign: isRTL ? "right" : "left",
                    }}
                  />
                  {!nameOk ? (
                    <AppText role="tiny" color={colors.error} style={{ marginTop: 6 }}>
                      {t("booking.nameMissing")}
                    </AppText>
                  ) : null}
                </View>
              ) : null}
              <View>
                <AppText role="label" color={colors.textMuted} style={{ marginBottom: 8 }}>
                  {t("booking.patientAge")}
                </AppText>
                <TextInput
                  value={age}
                  onChangeText={(v) => setAge(toWesternDigits(v).replace(/[^0-9]/g, ""))}
                  keyboardType="number-pad"
                  maxLength={3}
                  placeholder={t("booking.agePlaceholder")}
                  placeholderTextColor={colors.textFaint}
                  style={{
                    ...inputStyle,
                    width: 120,
                    height: 52,
                    paddingHorizontal: 16,
                    fontSize: inputFontSize(15, isRTL),
                    textAlign: isRTL ? "right" : "left",
                  }}
                />
                {!ageOk ? (
                  <AppText role="tiny" color={colors.error} style={{ marginTop: 6 }}>
                    {t("booking.ageMissing")}
                  </AppText>
                ) : null}
              </View>
            </View>
          ) : null}

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

          {/* Consents — each asked ONCE ever: PDPL per patient, clinic contact
              per clinic, Medilink promo per account. Nothing is re-accepted. */}
          <View style={{ gap: 12 }}>
            {needPdpl ? (
              checkboxRow(pdplChecked, () => setPdplChecked((v) => !v), pdplText)
            ) : (
              <View style={{ flexDirection: row, gap: 8, alignItems: "center" }}>
                <Icon name="shield-check" size={15} color={colors.success} />
                <AppText role="tiny" color={colors.textFaint} style={{ flex: 1 }}>
                  {t("booking.consentOnFile")}
                </AppText>
              </View>
            )}
            {needClinic
              ? checkboxRow(clinicChecked, () => setClinicChecked((v) => !v), t("booking.clinicConsent", { name: facility }))
              : null}
            {askPromo ? checkboxRow(promoChecked, () => setPromoChecked((v) => !v), t("booking.promoConsent")) : null}
          </View>

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

          {flowError ? (
            <View style={{ flexDirection: row, gap: 8, alignItems: "center", backgroundColor: colors.errorSurface, borderRadius: radii.md, padding: 12 }}>
              <Icon name="alert" size={16} color={colors.error} />
              <AppText role="caption" color={colors.error} style={{ flex: 1 }}>
                {flowError}
              </AppText>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* OTP — the whole "sign up" is this sheet, and it never says so. */}
      <Sheet visible={otpOpen} onClose={() => (busy ? null : setOtpOpen(false))} title={t("booking.otpTitle")}>
        <AppText role="body" color={colors.textMuted} align="center" style={{ marginBottom: 4 }}>
          {t("auth.otpHint", { phone: `⁦+968 ${phone}⁩` })}
        </AppText>
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
        {flowError ? (
          <AppText role="caption" color={colors.error} align="center" style={{ marginBottom: 8 }}>
            {flowError}
          </AppText>
        ) : null}
        {busy ? (
          <View style={{ marginBottom: 10 }}>
            <LoadingNarrator
              messages={
                relation !== "self"
                  ? [t("loading.confirmingCode"), t("loading.creatingFile"), t("loading.reservingSlot")]
                  : [t("loading.confirmingCode"), t("loading.reservingSlot")]
              }
            />
          </View>
        ) : null}
        <CtaButton label={t("booking.verifyPay")} loading={busy} disabled={!otp[3]} onPress={verifyAndPay} />
        <Pressable onPress={() => setOtp(["1", "2", "3", "4"])} style={{ alignItems: "center", padding: 10 }} accessibilityRole="button">
          <AppText role="label" color={colors.primaryMuted}>
            {t("auth.resend")}
          </AppText>
        </Pressable>
      </Sheet>
    </Screen>
  );
}
