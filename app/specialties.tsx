import React from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/theme";
import { useI18n } from "@/i18n";
import { repositories } from "@/data";
import { useQueryish } from "@/data/hooks";
import { AppHeader, Screen, SpecialtyTile, useSpecialtyGrid } from "@/components/ui";

/** All specialties — tap one to see the doctors AND clinics offering it. */
export default function SpecialtiesScreen() {
  const { spacing, row } = useTheme();
  const { t } = useI18n();
  const specialties = useQueryish(() => repositories.discovery.listSpecialties(), []);
  const grid = useSpecialtyGrid();

  return (
    <Screen header={<AppHeader back title={t("explore.specialtiesTitle")} />}>
      <View style={{ flexDirection: row, flexWrap: "wrap", columnGap: grid.gap, rowGap: spacing.lg, marginTop: spacing.md }}>
        {(specialties.data ?? []).map((s, i) => (
          <SpecialtyTile
            key={s.id}
            specialty={s}
            index={i}
            width={grid.tileWidth}
            onPress={() => router.push(`/services/${s.id}`)}
          />
        ))}
      </View>
    </Screen>
  );
}
