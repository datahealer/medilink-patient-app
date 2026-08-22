import React, { useState } from "react";
import { Pressable } from "react-native";
import { useTheme } from "@/theme";
import { repositories } from "@/data";
import { useQueryish } from "@/data/hooks";
import type { FavouriteKind } from "@/data/types";
import { useAuthWall } from "@/components/AuthWall";
import { Icon } from "@/components/ui";

/**
 * Header heart — marks a doctor / clinic / package as favourite.
 * The saved list lives in ملفي ← المفضلة (/records/favourites), so a guest
 * would be writing into a list they have no file to keep: sign-in first.
 */
export function FavButton({ kind, refId }: { kind: FavouriteKind; refId: string }) {
  const { colors } = useTheme();
  const { authed, requireAuth, wall } = useAuthWall();
  const favs = useQueryish(() => (authed ? repositories.favourite.list() : Promise.resolve([])), [kind, refId, authed]);
  const [local, setLocal] = useState<boolean | null>(null);
  const isFav = authed ? local ?? favs.data?.some((f) => f.kind === kind && f.refId === refId) ?? false : false;

  return (
    <>
      <Pressable
        onPress={() => requireAuth(async () => setLocal(await repositories.favourite.toggle(kind, refId)))}
        accessibilityRole="button"
        accessibilityState={{ selected: isFav }}
        hitSlop={8}
        style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center" }}
      >
        <Icon name="heart" size={19} color={isFav ? colors.error : colors.textMuted} fill={isFav} strokeWidth={isFav ? 0 : 1.7} />
      </Pressable>
      {wall}
    </>
  );
}
