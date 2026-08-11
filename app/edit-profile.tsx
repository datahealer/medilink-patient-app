import React, { useEffect, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/theme";
import { useI18n } from "@/i18n";
import { repositories } from "@/data";
import { useQueryish } from "@/data/hooks";
import type { BloodGroup, Gender } from "@/data/types";
import { fontFamilyFor } from "@/theme/typography";
import { AppHeader, AppText, Card, CtaButton, Icon, Screen, SegmentedTabs } from "@/components/ui";

const BLOOD_GROUPS: BloodGroup[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

/** تعديل الملف — edits persist through patient.updateProfile (mock in-session). */
export default function EditProfile() {
  const { colors, spacing, radii, row, isRTL } = useTheme();
  const { t } = useI18n();
  const profile = useQueryish(() => repositories.patient.getProfile(), []);

  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<Gender>("female");
  const [blood, setBlood] = useState<BloodGroup>("unknown");
  const [emergency, setEmergency] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const p = profile.data;
    if (!p) return;
    setNameAr(p.full_name_ar);
    setNameEn(p.full_name);
    setEmail(p.email);
    setDob(p.date_of_birth);
    setGender(p.gender);
    setBlood(p.blood_group);
    setEmergency(p.emergency_contact);
  }, [profile.data]);

  const validDob = /^\d{4}-\d{2}-\d{2}$/.test(dob) && !Number.isNaN(Date.parse(dob)) && Date.parse(dob) < Date.now();
  const canSave = nameAr.trim().length > 1 && nameEn.trim().length > 1 && email.includes("@") && validDob;

  const save = async () => {
    setBusy(true);
    await repositories.patient.updateProfile({
      full_name_ar: nameAr.trim(),
      full_name: nameEn.trim(),
      email: email.trim(),
      date_of_birth: dob,
      gender,
      blood_group: blood,
      emergency_contact: emergency.trim(),
    });
    setBusy(false);
    setSaved(true);
    setTimeout(() => router.back(), 650);
  };

  const inputStyle = {
    height: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.inputBackground,
    paddingHorizontal: 14,
    fontFamily: fontFamilyFor("body", "medium", isRTL),
    fontSize: 14.5,
    color: colors.text,
    textAlign: (isRTL ? "right" : "left") as "right" | "left",
  };

  // Called as a plain function (not <Field/>): a locally-defined component
  // type would remount its TextInput — and dismiss the keyboard — on every
  // keystroke, because the parent re-renders per character.
  const field = ({
    label,
    value,
    onChange,
    keyboard,
    ltr,
    placeholder,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    keyboard?: "email-address" | "numbers-and-punctuation";
    ltr?: boolean;
    placeholder?: string;
  }) => (
    <View key={label} style={{ gap: 7 }}>
      <AppText role="label" color={colors.textMuted}>
        {label}
      </AppText>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        keyboardType={keyboard}
        autoCapitalize="none"
        style={[inputStyle, ltr ? { writingDirection: "ltr" as const } : null]}
      />
    </View>
  );

  return (
    <Screen
      header={<AppHeader back title={t("profile.editProfile")} />}
      footer={
        saved ? (
          <View style={{ flexDirection: row, gap: 8, alignItems: "center", justifyContent: "center", paddingVertical: 14 }}>
            <Icon name="check-circle" size={18} color={colors.success} />
            <AppText role="label" weight="bold" color={colors.success}>
              {t("profile.saved")}
            </AppText>
          </View>
        ) : (
          <CtaButton label={t("common.save")} loading={busy} disabled={!canSave} onPress={save} />
        )
      }
    >
      <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
        {field({ label: t("records.nameAr"), value: nameAr, onChange: setNameAr })}
        {field({ label: t("records.nameEn"), value: nameEn, onChange: setNameEn, ltr: true })}
        {field({ label: t("profile.emailLabel"), value: email, onChange: setEmail, keyboard: "email-address", ltr: true })}
        {field({ label: t("records.dob"), value: dob, onChange: setDob, keyboard: "numbers-and-punctuation", ltr: true, placeholder: "1994-03-12" })}

        <View style={{ gap: 7 }}>
          <AppText role="label" color={colors.textMuted}>
            {t("records.gender")}
          </AppText>
          <SegmentedTabs
            options={[
              { id: "female", label: t("explore.female") },
              { id: "male", label: t("explore.male") },
            ]}
            value={gender}
            onChange={(id) => setGender(id as Gender)}
          />
        </View>

        <View style={{ gap: 7 }}>
          <AppText role="label" color={colors.textMuted}>
            {t("profile.bloodGroup")}
          </AppText>
          <View style={{ flexDirection: row, flexWrap: "wrap", gap: 8 }}>
            {BLOOD_GROUPS.map((bg) => {
              const active = blood === bg;
              return (
                <Pressable
                  key={bg}
                  onPress={() => setBlood(bg)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  style={{
                    minWidth: 52,
                    height: 38,
                    borderRadius: radii.md - 2,
                    borderWidth: 1.5,
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: active ? colors.primary : colors.surface,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: 10,
                  }}
                >
                  <AppText role="label" weight="bold" color={active ? colors.textOnPrimary : colors.text}>
                    {"⁦" + bg + "⁩"}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {field({ label: t("profile.emergency"), value: emergency, onChange: setEmergency })}

        {/* Phone is the sign-in identity — shown, not editable */}
        <Card padded={false} style={{ padding: 12 }}>
          <View style={{ flexDirection: row, gap: 10, alignItems: "center" }}>
            <Icon name="lock" size={16} color={colors.textFaint} />
            <View style={{ flex: 1, gap: 2 }}>
              <AppText role="label" weight="bold" style={{ writingDirection: "ltr" }}>
                {profile.data?.phone ?? ""}
              </AppText>
              <AppText role="tiny" color={colors.textFaint}>
                {t("profile.phoneLocked")}
              </AppText>
            </View>
          </View>
        </Card>
      </View>
    </Screen>
  );
}
