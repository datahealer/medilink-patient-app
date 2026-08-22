import React, { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useTheme } from "@/theme";
import { pickLang, useI18n } from "@/i18n";
import { repositories } from "@/data";
import { useQueryish } from "@/data/hooks";
import { consultationTotal, formatDayDate, formatOMR, formatTime } from "@/utils/format";
import { figuresFor, fontFamilyFor, inputFontSize } from "@/theme/typography";
import { openDirections } from "@/utils/actions";
import {
  AppHeader,
  AppText,
  Avatar,
  Badge,
  Button,
  Card,
  CtaButton,
  DayStrip,
  Divider,
  Icon,
  Screen,
  Sheet,
  Skeleton,
  SlotGrid,
  statusTone,
} from "@/components/ui";

export default function AppointmentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing, radii, row, isRTL } = useTheme();
  const i18n = useI18n();
  const { t } = i18n;
  const appt = useQueryish(() => repositories.appointment.get(id!), [id]);
  const doctor = useQueryish(
    () => (appt.data ? repositories.doctor.get(appt.data.doctor_id) : Promise.resolve(null)),
    [appt.data?.doctor_id],
  );
  const clinic = useQueryish(
    () => (appt.data ? repositories.discovery.getClinic(appt.data.clinic_id) : Promise.resolve(null)),
    [appt.data?.clinic_id],
  );

  const [cancelOpen, setCancelOpen] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);
  const [reschedOpen, setReschedOpen] = useState(false);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [rated, setRated] = useState(false);
  const [reschedDate, setReschedDate] = useState<string | null>(null);
  const [reschedSlot, setReschedSlot] = useState<string | null>(null);

  const reschedSlots = useQueryish(
    () =>
      reschedDate && appt.data
        ? repositories.appointment.getSlots({ doctorId: appt.data.doctor_id, date: reschedDate })
        : Promise.resolve([]),
    [reschedDate, appt.data?.doctor_id],
  );

  const a = appt.data;
  const d = doctor.data;
  if (!a || !d) {
    return (
      <Screen header={<AppHeader back />}>
        <Skeleton height={220} radius={radii.xl} style={{ marginTop: spacing.md }} />
      </Screen>
    );
  }

  const st = statusTone(a.status);
  const money = consultationTotal(a.fee_omr);
  const isUpcoming = ["pending", "confirmed", "checked_in"].includes(a.status);
  const unpaid = a.payment_status === "unpaid" && a.status === "pending";
  const name = pickLang(isRTL, d.full_name, d.full_name_ar);

  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    await fn();
    await appt.refetch();
    setBusy(false);
  };

  return (
    <Screen header={<AppHeader back title={t("appointments.title")} />}>
      {/* Status + reference */}
      <View style={{ flexDirection: row, justifyContent: "space-between", alignItems: "center", marginTop: spacing.sm }}>
        <Badge label={t(st.key as never)} tone={st.tone} />
        <AppText role="tiny" color={colors.textFaint}>
          {t("appointments.reference")} · {a.reference_number}
        </AppText>
      </View>

      {/* Unpaid nudge — the one thing to do next */}
      {unpaid ? (
        <View
          style={{
            flexDirection: row,
            gap: 10,
            alignItems: "center",
            backgroundColor: colors.warningSurface,
            borderRadius: radii.md,
            padding: 12,
            marginTop: spacing.sm + 2,
          }}
        >
          <Icon name="alert" size={18} color={colors.warning} />
          <AppText role="label" color={colors.warning} style={{ flex: 1 }}>
            {t("appointments.completePayment")}
          </AppText>
        </View>
      ) : null}

      {/* Who & where */}
      <Card style={{ marginTop: spacing.md }}>
        <Pressable onPress={() => router.push(`/doctors/${d.id}`)} accessibilityRole="button" style={{ flexDirection: row, gap: 12, alignItems: "center" }}>
          <Avatar name={name} hue={d.avatarHue} size={52} />
          <View style={{ flex: 1 }}>
            <AppText role="cardTitle" weight="bold">
              {name}
            </AppText>
            <AppText role="caption" color={colors.textMuted}>
              {pickLang(isRTL, d.title ?? "", d.title_ar ?? "")} · {pickLang(isRTL, d.facility, d.facility_ar)}
            </AppText>
          </View>
          <Icon name={isRTL ? "chevron-left" : "chevron-right"} size={16} color={colors.textFaint} />
        </Pressable>
        <Divider inset={0} />
        <View style={{ gap: 10, marginTop: 12 }}>
          <InfoRow icon="calendar" text={`${formatDayDate(a.slot_date, i18n)} · ${formatTime(a.slot_start, i18n)}`} />
          <InfoRow icon="map-pin" text={clinic.data ? pickLang(isRTL, `${clinic.data.name} — ${clinic.data.area}`, `${clinic.data.name_ar} — ${clinic.data.area_ar}`) : ""} />
          <InfoRow icon="user" text={pickLang(isRTL, a.patient_name, a.patient_name_ar)} />
          {a.reason_for_visit ? <InfoRow icon="pen" text={a.reason_for_visit} /> : null}
        </View>
      </Card>

      {/* Queue state when checked in */}
      {a.status === "checked_in" ? (
        <Card style={{ marginTop: spacing.sm + 2, backgroundColor: colors.infoSurface, borderColor: "transparent" }}>
          <View style={{ flexDirection: row, gap: 12, alignItems: "center" }}>
            <View style={{ width: 52, height: 52, borderRadius: 26, borderWidth: 3, borderColor: colors.info, alignItems: "center", justifyContent: "center" }}>
              <AppText role="h2" weight="bold" color={colors.info}>
                {a.queue_ahead ?? 3}
              </AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText role="cardTitle" weight="bold" color={colors.info}>
                {t("appointments.peopleAhead", { n: a.queue_ahead ?? 3 })}
              </AppText>
              <AppText role="caption" color={colors.info}>
                {t("appointments.estWait", { n: (a.queue_ahead ?? 3) * 15 })} · {t("appointments.checkedInMsg")}
              </AppText>
            </View>
          </View>
        </Card>
      ) : null}

      {/* Payment summary */}
      <Card padded={false} style={{ marginTop: spacing.md, paddingHorizontal: spacing.md }}>
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
        <View style={{ flexDirection: row, justifyContent: "space-between", paddingVertical: 12, alignItems: "center" }}>
          <AppText role="cardTitle" weight="bold">
            {t("common.total")}
          </AppText>
          <View style={{ flexDirection: row, gap: 8, alignItems: "center" }}>
            <AppText role="price">{formatOMR(money.total, i18n)}</AppText>
            <Badge label={a.payment_status === "paid" ? "✓" : t("appointments.statusPending")} tone={a.payment_status === "paid" ? "success" : "warning"} />
          </View>
        </View>
      </Card>

      {/* Actions — state-appropriate, one primary */}
      <View style={{ gap: 10, marginTop: spacing.md }}>
        {unpaid ? (
          <CtaButton label={t("appointments.payNow")} icon="card" loading={busy} onPress={() => act(() => repositories.appointment.pay(a.id))} />
        ) : null}
        {a.status === "confirmed" ? (
          <CtaButton label={t("appointments.checkInAction")} icon="check-circle" loading={busy} onPress={() => act(() => repositories.appointment.checkIn(a.id))} />
        ) : null}
        {a.status === "completed" && !rated ? <CtaButton label={t("appointments.rate")} icon="star" onPress={() => setRateOpen(true)} /> : null}
        {a.status === "completed" || a.status === "cancelled" ? (
          <Button label={t("appointments.rebook")} variant="tonal" icon="refresh" onPress={() => router.push(`/booking/${d.id}`)} />
        ) : null}
        {isUpcoming ? (
          <View style={{ flexDirection: row, gap: 10 }}>
            {clinic.data ? (
              <Button
                label={t("appointments.directions")}
                variant="outline"
                icon="navigation"
                style={{ flex: 1 }}
                onPress={() => openDirections(clinic.data!.latitude, clinic.data!.longitude)}
              />
            ) : null}
            <Button label={t("appointments.reschedule")} variant="outline" icon="calendar" style={{ flex: 1 }} onPress={() => setReschedOpen(true)} />
          </View>
        ) : null}
        {isUpcoming ? <Button label={t("appointments.cancelVisit")} variant="danger" onPress={() => setCancelOpen(true)} /> : null}
      </View>

      {/* Cancel confirmation */}
      <Sheet visible={cancelOpen} onClose={() => setCancelOpen(false)} title={t("appointments.cancelTitle")}>
        <AppText role="body" color={colors.textMuted} align="center" style={{ marginBottom: 18 }}>
          {t("appointments.cancelBody")}
        </AppText>
        <View style={{ gap: 10 }}>
          <Button label={t("appointments.keepIt")} variant="primary" onPress={() => setCancelOpen(false)} />
          <Button
            label={t("appointments.confirmCancel")}
            variant="danger"
            loading={busy}
            onPress={async () => {
              await act(() => repositories.appointment.cancel(a.id));
              setCancelOpen(false);
            }}
          />
        </View>
      </Sheet>

      {/* Reschedule */}
      <Sheet visible={reschedOpen} onClose={() => setReschedOpen(false)} title={t("appointments.reschedule")}>
        <DayStrip selected={reschedDate} onSelect={(iso) => { setReschedDate(iso); setReschedSlot(null); }} />
        <View style={{ minHeight: 120, marginTop: 12 }}>
          {reschedDate ? (
            (reschedSlots.data ?? []).length ? (
              <SlotGrid slots={reschedSlots.data ?? []} selected={reschedSlot} onSelect={setReschedSlot} />
            ) : reschedSlots.isLoading ? null : (
              <AppText role="caption" color={colors.textMuted} align="center">
                {t("booking.noSlots")}
              </AppText>
            )
          ) : (
            <AppText role="caption" color={colors.textMuted} align="center">
              {t("booking.chooseDate")}
            </AppText>
          )}
        </View>
        <CtaButton
          label={t("common.confirm")}
          disabled={!reschedDate || !reschedSlot}
          loading={busy}
          style={{ marginTop: 14 }}
          onPress={async () => {
            await act(() => repositories.appointment.reschedule(a.id, { date: reschedDate!, start: reschedSlot! }));
            setReschedOpen(false);
          }}
        />
      </Sheet>

      {/* Rate */}
      <Sheet visible={rateOpen} onClose={() => setRateOpen(false)} title={t("appointments.rateTitle")}>
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 10, marginVertical: 14 }}>
          {[1, 2, 3, 4, 5].map((s) => (
            <Pressable key={s} onPress={() => setStars(s)} hitSlop={6} accessibilityRole="button">
              <Icon name="star" size={36} color={s <= stars ? "#E8A33D" : colors.border} fill={s <= stars} strokeWidth={s <= stars ? 0 : 1.6} />
            </Pressable>
          ))}
        </View>
        <TextInput
          value={comment}
          onChangeText={setComment}
          placeholder={t("appointments.ratePlaceholder")}
          placeholderTextColor={colors.textFaint}
          multiline
          style={{
            minHeight: 80,
            borderRadius: radii.md,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.inputBackground,
            padding: 14,
            fontFamily: fontFamilyFor("body", "medium", isRTL),
            ...figuresFor(isRTL),
            fontSize: inputFontSize(14, isRTL),
            color: colors.text,
            textAlign: isRTL ? "right" : "left",
            textAlignVertical: "top",
          }}
        />
        <CtaButton
          label={t("appointments.rateSubmit")}
          loading={busy}
          style={{ marginTop: 14 }}
          onPress={async () => {
            setBusy(true);
            await repositories.review.submit({ doctorId: d.id, rating: stars, comment });
            setBusy(false);
            setRated(true);
            setRateOpen(false);
          }}
        />
      </Sheet>

      {rated ? (
        <View style={{ flexDirection: row, gap: 8, alignItems: "center", justifyContent: "center", marginTop: spacing.md }}>
          <Icon name="check-circle" size={16} color={colors.success} />
          <AppText role="label" color={colors.success}>
            {t("appointments.rateThanks")}
          </AppText>
        </View>
      ) : null}
    </Screen>
  );
}

function InfoRow({ icon, text }: { icon: React.ComponentProps<typeof Icon>["name"]; text: string }) {
  const { colors, row } = useTheme();
  return (
    <View style={{ flexDirection: row, gap: 10, alignItems: "center" }}>
      <Icon name={icon} size={16} color={colors.textFaint} />
      <AppText role="label" style={{ flex: 1 }} numberOfLines={2}>
        {text}
      </AppText>
    </View>
  );
}
