import React from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/theme";
import { useI18n } from "@/i18n";
import { repositories } from "@/data";
import { useQueryish } from "@/data/hooks";
import { AppHeader, Screen, SpecialtyTile } from "@/components/ui";

/** All specialties — tap one to see its doctors. */
export default function SpecialtiesScreen() {
  const { spacing } = useTheme();
  const { t } = useI18n();
  const specialties = useQueryish(() => repositories.discovery.listSpecialties(), []);

  return (
    <Screen header={<AppHeader back title={t("explore.specialtiesTitle")} />}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: spacing.lg, marginTop: spacing.md }}>
        {(specialties.data ?? []).map((s, i) => (
          <SpecialtyTile
            key={s.id}
            specialty={s}
            index={i}
            onPress={() => router.push({ pathname: "/doctors", params: { specialty: s.id } })}
          />
        ))}
      </View>
    </Screen>
  );
}
