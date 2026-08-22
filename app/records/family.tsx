import React, { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/theme";
import { pickLang, useI18n } from "@/i18n";
import { repositories } from "@/data";
import { useQueryish } from "@/data/hooks";
import { useAppStore } from "@/stores/appStore";
import type { FamilyMember, FamilyRelation, Gender } from "@/data/types";
import { ageFrom } from "@/utils/format";
import { figuresFor, fontFamilyFor, inputFontSize } from "@/theme/typography";
import {
  AppHeader,
  AppText,
  Avatar,
  Badge,
  Button,
  Card,
  Chip,
  CtaButton,
  DateField,
  Icon,
  Screen,
  SegmentedTabs,
  Sheet,
} from "@/components/ui";

const RELATIONS: FamilyRelation[] = ["spouse", "child", "parent", "sibling", "other"];

const relationKey: Record<string, string> = {
  spouse: "records.relationSpouse",
  child: "records.relationChild",
  parent: "records.relationParent",
  sibling: "records.relationSibling",
  other: "records.relationOther",
};

export default function Family() {
  const { colors, spacing, radii, row, isRTL } = useTheme();
  const { t } = useI18n();
  const familyList = useQueryish(() => repositories.family.list(), []);
  const activePatientId = useAppStore((s) => s.activePatientId);
  const setActivePatient = useAppStore((s) => s.setActivePatient);

  const [addOpen, setAddOpen] = useState(false);
  const [removing, setRemoving] = useState<FamilyMember | null>(null);
  const [busy, setBusy] = useState(false);

  // Add-member form
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [relation, setRelation] = useState<FamilyRelation>("child");
  const [gender, setGender] = useState<Gender>("female");
  const [dob, setDob] = useState<string | null>(null);

  const canAdd = nameAr.trim().length > 1 && nameEn.trim().length > 1 && !!dob;

  const resetForm = () => {
    setNameAr("");
    setNameEn("");
    setRelation("child");
    setGender("female");
    setDob(null);
  };

  const add = async () => {
    setBusy(true);
    await repositories.family.add({
      full_name: nameEn.trim(),
      full_name_ar: nameAr.trim(),
      relation,
      gender,
      date_of_birth: dob!,
    });
    await familyList.refetch();
    setBusy(false);
    setAddOpen(false);
    resetForm();
  };

  const remove = async () => {
    if (!removing) return;
    setBusy(true);
    // Never leave the app viewing a profile that no longer exists.
    if (activePatientId === removing.id) setActivePatient("self");
    await repositories.family.remove(removing.id);
    await familyList.refetch();
    setBusy(false);
    setRemoving(null);
  };

  const inputStyle = {
    height: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.inputBackground,
    paddingHorizontal: 14,
    fontFamily: fontFamilyFor("body", "medium", isRTL),
    ...figuresFor(isRTL),
    fontSize: inputFontSize(14.5, isRTL),
    color: colors.text,
    textAlign: (isRTL ? "right" : "left") as "right" | "left",
  };

  return (
    <Screen header={<AppHeader back title={t("records.family")} />}>
      <View style={{ gap: 10, marginTop: spacing.sm }}>
        {(familyList.data ?? []).map((m, i) => (
          <Card key={m.id}>
            <View style={{ flexDirection: row, gap: 12, alignItems: "center" }}>
              <Avatar name={pickLang(isRTL, m.full_name, m.full_name_ar)} hue={200 + i * 40} size={48} />
              <View style={{ flex: 1 }}>
                <AppText role="cardTitle" weight="bold" numberOfLines={1}>
                  {pickLang(isRTL, m.full_name, m.full_name_ar)}
                </AppText>
                <AppText role="caption" color={colors.textMuted}>
                  {t(relationKey[m.relation] as never)} · {t("records.memberAge", { n: ageFrom(m.date_of_birth) })}
                </AppText>
              </View>
              {/* Distinct hues per gender at equal weight — one shared colour
                  carried no meaning, and a dark chip would over-emphasise it */}
              <Badge
                label={m.gender === "female" ? t("explore.female") : t("explore.male")}
                tone={m.gender === "female" ? "lavender" : "blue"}
              />
              <Pressable
                onPress={() => setRemoving(m)}
                accessibilityRole="button"
                accessibilityLabel={t("common.delete")}
                hitSlop={8}
                style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.errorSurface, alignItems: "center", justifyContent: "center" }}
              >
                <Icon name="trash" size={16} color={colors.error} />
              </Pressable>
            </View>
            {/* Reading a member's file is a switch, not a separate screen */}
            <Pressable
              onPress={() => {
                setActivePatient(m.id);
                router.push("/(tabs)/records");
              }}
              accessibilityRole="button"
              style={{ flexDirection: row, gap: 8, alignItems: "center", marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border }}
            >
              <Icon name="file-heart" size={15} color={colors.primaryMuted} />
              <AppText role="label" weight="bold" color={colors.primaryMuted} style={{ flex: 1 }}>
                {t("profiles.openFile")}
              </AppText>
              <Icon name={isRTL ? "chevron-left" : "chevron-right"} size={15} color={colors.textFaint} />
            </Pressable>
          </Card>
        ))}
        <Button label={t("records.addMember")} variant="tonal" icon="plus" onPress={() => setAddOpen(true)} />
        <AppText role="tiny" color={colors.textFaint} align="center">
          {t("profiles.onlyHolder")}
        </AppText>
      </View>

      {/* Add member */}
      <Sheet visible={addOpen} onClose={() => setAddOpen(false)} title={t("records.addMember")}>
        <View style={{ gap: 14 }}>
          <View style={{ gap: 7 }}>
            <AppText role="label" color={colors.textMuted}>
              {t("records.nameAr")}
            </AppText>
            <TextInput value={nameAr} onChangeText={setNameAr} style={inputStyle} placeholderTextColor={colors.textFaint} />
          </View>
          <View style={{ gap: 7 }}>
            <AppText role="label" color={colors.textMuted}>
              {t("records.nameEn")}
            </AppText>
            <TextInput value={nameEn} onChangeText={setNameEn} autoCapitalize="words" style={[inputStyle, { writingDirection: "ltr" }]} placeholderTextColor={colors.textFaint} />
          </View>
          <View style={{ gap: 7 }}>
            <AppText role="label" color={colors.textMuted}>
              {t("records.relation")}
            </AppText>
            <View style={{ flexDirection: row, gap: 8, flexWrap: "wrap" }}>
              {RELATIONS.map((r2) => (
                <Chip key={r2} label={t(relationKey[r2] as never)} selected={relation === r2} onPress={() => setRelation(r2)} />
              ))}
            </View>
          </View>
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
          {/* Calendar, not a typed date */}
          <DateField label={t("records.dob")} value={dob} onChange={setDob} />
          <CtaButton label={t("common.add")} disabled={!canAdd} loading={busy} onPress={add} />
        </View>
      </Sheet>

      {/* Remove member — confirm first */}
      <Sheet
        visible={!!removing}
        onClose={() => setRemoving(null)}
        title={t("records.removeMemberTitle", { name: removing ? pickLang(isRTL, removing.full_name, removing.full_name_ar) : "" })}
      >
        <AppText role="body" color={colors.textMuted} align="center" style={{ marginBottom: 18 }}>
          {t("records.removeMemberBody")}
        </AppText>
        <View style={{ gap: 10 }}>
          <Button label={t("common.delete")} variant="danger" loading={busy} onPress={remove} />
          <Button label={t("common.cancel")} variant="outline" onPress={() => setRemoving(null)} />
        </View>
      </Sheet>
    </Screen>
  );
}
