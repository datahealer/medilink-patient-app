import React, { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { useTheme } from "@/theme";
import { pickLang, useI18n } from "@/i18n";
import { repositories } from "@/data";
import { useQueryish } from "@/data/hooks";
import type { FamilyMember, FamilyRelation, Gender } from "@/data/types";
import { ageFrom } from "@/utils/format";
import { fontFamilyFor } from "@/theme/typography";
import { AppHeader, AppText, Avatar, Badge, Button, Card, Chip, CtaButton, Icon, Screen, SegmentedTabs, Sheet } from "@/components/ui";

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

  const [addOpen, setAddOpen] = useState(false);
  const [removing, setRemoving] = useState<FamilyMember | null>(null);
  const [busy, setBusy] = useState(false);

  // Add-member form
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [relation, setRelation] = useState<FamilyRelation>("child");
  const [gender, setGender] = useState<Gender>("female");
  const [dob, setDob] = useState("");

  const validDob = /^\d{4}-\d{2}-\d{2}$/.test(dob) && !Number.isNaN(Date.parse(dob)) && Date.parse(dob) < Date.now();
  const canAdd = nameAr.trim().length > 1 && nameEn.trim().length > 1 && validDob;

  const resetForm = () => {
    setNameAr("");
    setNameEn("");
    setRelation("child");
    setGender("female");
    setDob("");
  };

  const add = async () => {
    setBusy(true);
    await repositories.family.add({
      full_name: nameEn.trim(),
      full_name_ar: nameAr.trim(),
      relation,
      gender,
      date_of_birth: dob,
    });
    await familyList.refetch();
    setBusy(false);
    setAddOpen(false);
    resetForm();
  };

  const remove = async () => {
    if (!removing) return;
    setBusy(true);
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
    fontSize: 14.5,
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
                <AppText role="cardTitle" weight="bold">
                  {pickLang(isRTL, m.full_name, m.full_name_ar)}
                </AppText>
                <AppText role="caption" color={colors.textMuted}>
                  {t(relationKey[m.relation] as never)} · {t("records.memberAge", { n: ageFrom(m.date_of_birth) })}
                </AppText>
              </View>
              <Badge label={m.gender === "female" ? t("explore.female") : t("explore.male")} tone="blue" />
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
          </Card>
        ))}
        <Button label={t("records.addMember")} variant="tonal" icon="plus" onPress={() => setAddOpen(true)} />
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
          <View style={{ flexDirection: row, gap: 10 }}>
            <View style={{ flex: 1, gap: 7 }}>
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
            <View style={{ flex: 1, gap: 7 }}>
              <AppText role="label" color={colors.textMuted}>
                {t("records.dob")}
              </AppText>
              <TextInput
                value={dob}
                onChangeText={setDob}
                placeholder="2015-08-20"
                keyboardType="numbers-and-punctuation"
                style={[inputStyle, { writingDirection: "ltr" }]}
                placeholderTextColor={colors.textFaint}
              />
            </View>
          </View>
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
