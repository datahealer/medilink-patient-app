import React, { useRef, useState } from "react";
import { FlatList, Image, Pressable, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/theme";
import { pickLang, useI18n } from "@/i18n";
import { repositories } from "@/data";
import { useQueryish } from "@/data/hooks";
import type { AiSuggestion, Doctor } from "@/data/types";
import { figuresFor, fontFamilyFor, inputFontSize } from "@/theme/typography";
import { AppText, Avatar, Badge, Icon, Rating, Screen, Skeleton } from "@/components/ui";
import { formatOMR } from "@/utils/format";

interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  text: string;
  urgency?: AiSuggestion["urgency"];
  doctorIds?: string[];
}

export default function MeAssistant() {
  const { colors, spacing, radii, row, isRTL } = useTheme();
  const i18n = useI18n();
  const { t } = i18n;
  const profile = useQueryish(() => repositories.patient.getProfile(), []);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const listRef = useRef<FlatList>(null);

  const firstName = profile.data ? pickLang(isRTL, profile.data.full_name, profile.data.full_name_ar).split(" ")[0] : "";

  const send = async (text: string) => {
    const clean = text.trim();
    if (!clean || thinking) return;
    setInput("");
    setMessages((m) => [...m, { id: `u-${Date.now()}`, role: "user", text: clean }]);
    setThinking(true);
    const res = await repositories.ai.ask(clean);
    setThinking(false);
    setMessages((m) => [
      ...m,
      {
        id: `a-${Date.now()}`,
        role: "assistant",
        text: pickLang(isRTL, res.reply, res.reply_ar),
        urgency: res.urgency,
        doctorIds: res.doctorIds,
      },
    ]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  };

  const urgencyBadge = (u: AiSuggestion["urgency"]) => {
    if (!u) return null;
    const map = { self: { tone: "success" as const, key: "me.urgencySelf" }, doctor: { tone: "warning" as const, key: "me.urgencyDoctor" }, emergency: { tone: "error" as const, key: "me.urgencyEmergency" } };
    const m = map[u];
    return <Badge label={t(m.key as never)} tone={m.tone} />;
  };

  return (
    <Screen scroll={false} padded={false}>
      {/* Compact identity header */}
      <View style={{ flexDirection: row, alignItems: "center", gap: 10, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}>
        <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: "#2E1A47", alignItems: "center", justifyContent: "center" }}>
          <Image source={require("../../assets/brand/me-mark.png")} style={{ width: 22, height: 22, resizeMode: "contain" }} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText role="cardTitle" weight="bold">
            {t("me.title")}
          </AppText>
          <AppText role="tiny" color={colors.textMuted} numberOfLines={1}>
            {t("me.disclaimer")}
          </AppText>
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.md, gap: 10, flexGrow: 1 }}
        ListEmptyComponent={
          <View style={{ flex: 1, justifyContent: "center", gap: spacing.md }}>
            <View style={{ alignItems: "center", gap: 8, marginBottom: spacing.md }}>
              <View style={{ width: 84, height: 84, borderRadius: 30, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
                <Icon name="sparkle" size={38} color="#2E1A47" strokeWidth={1.4} />
              </View>
              <AppText role="h2" weight="bold" align="center">
                {t("me.hello", { name: firstName })}
              </AppText>
              <AppText role="body" color={colors.textMuted} align="center" style={{ maxWidth: 300 }}>
                {t("me.intro")}
              </AppText>
            </View>
            {[t("me.suggestion1"), t("me.suggestion2"), t("me.suggestion3")].map((s) => (
              <Pressable
                key={s}
                onPress={() => send(s)}
                accessibilityRole="button"
                style={({ pressed }) => ({
                  flexDirection: row,
                  alignItems: "center",
                  gap: 10,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: radii.md + 2,
                  paddingHorizontal: 14,
                  paddingVertical: 13,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Icon name="sparkles" size={16} color={colors.primaryMuted} />
                <AppText role="label" style={{ flex: 1 }}>
                  {s}
                </AppText>
                <Icon name={isRTL ? "arrow-left" : "arrow-right"} size={15} color={colors.textFaint} />
              </Pressable>
            ))}
          </View>
        }
        renderItem={({ item }) =>
          item.role === "user" ? (
            <View
              style={{
                alignSelf: isRTL ? "flex-start" : "flex-end",
                backgroundColor: colors.primary,
                borderRadius: radii.lg,
                borderBottomRightRadius: isRTL ? radii.lg : 6,
                borderBottomLeftRadius: isRTL ? 6 : radii.lg,
                paddingHorizontal: 14,
                paddingVertical: 10,
                maxWidth: "82%",
              }}
            >
              <AppText role="body" color={colors.textOnPrimary}>
                {item.text}
              </AppText>
            </View>
          ) : (
            <View style={{ alignSelf: isRTL ? "flex-end" : "flex-start", maxWidth: "94%", gap: 8 }}>
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: radii.lg,
                  borderTopLeftRadius: isRTL ? radii.lg : 6,
                  borderTopRightRadius: isRTL ? 6 : radii.lg,
                  padding: 14,
                  gap: 8,
                }}
              >
                {urgencyBadge(item.urgency ?? null)}
                <AppText role="body">{item.text}</AppText>
              </View>
              {item.doctorIds?.length ? (
                <View style={{ gap: 8 }}>
                  <AppText role="tiny" weight="bold" color={colors.textFaint}>
                    {t("me.suggestedDoctors")}
                  </AppText>
                  {item.doctorIds.map((docId: string) => (
                    <MiniDoctor key={docId} id={docId} />
                  ))}
                </View>
              ) : null}
            </View>
          )
        }
        ListFooterComponent={
          thinking ? (
            <View style={{ flexDirection: row, gap: 8, alignItems: "center", padding: 6 }}>
              <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
                <Icon name="sparkle" size={16} color="#2E1A47" />
              </View>
              <AppText role="caption" color={colors.textMuted}>
                {t("me.thinking")}
              </AppText>
            </View>
          ) : null
        }
      />

      {/* Composer */}
      <View
        style={{
          flexDirection: row,
          gap: 8,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.background,
        }}
      >
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={t("me.placeholder")}
          placeholderTextColor={colors.textFaint}
          onSubmitEditing={() => send(input)}
          returnKeyType="send"
          style={{
            flex: 1,
            height: 46,
            borderRadius: radii.pill,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.inputBackground,
            paddingHorizontal: 18,
            fontFamily: fontFamilyFor("body", "medium", isRTL),
            ...figuresFor(isRTL),
            fontSize: inputFontSize(14.5, isRTL),
            color: colors.text,
            textAlign: isRTL ? "right" : "left",
          }}
        />
        <Pressable
          onPress={() => send(input)}
          accessibilityRole="button"
          accessibilityLabel={t("me.placeholder")}
          style={({ pressed }) => ({
            width: 46,
            height: 46,
            borderRadius: 23,
            backgroundColor: input.trim() ? colors.primary : colors.surfaceAlt,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.8 : 1,
            transform: [{ scaleX: isRTL ? -1 : 1 }],
          })}
        >
          <Icon name="send" size={19} color={input.trim() ? colors.textOnPrimary : colors.textFaint} />
        </Pressable>
      </View>
    </Screen>
  );
}

function MiniDoctor({ id }: { id: string }) {
  const { colors, radii, row, isRTL } = useTheme();
  const i18n = useI18n();
  const { t } = i18n;
  const doctor = useQueryish(() => repositories.doctor.get(id), [id]);
  const d: Doctor | null = doctor.data;
  // Hold the row's place while the doctor loads — popping in unannounced is
  // exactly the "content appears from nowhere" jank this screen shouldn't have.
  if (!d) return doctor.isLoading ? <Skeleton height={64} radius={radii.md + 2} /> : null;
  const name = pickLang(isRTL, d.full_name, d.full_name_ar);
  return (
    <Pressable
      onPress={() => router.push(`/doctors/${d.id}`)}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flexDirection: row,
        alignItems: "center",
        gap: 10,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radii.md + 2,
        padding: 10,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <Avatar name={name} hue={d.avatarHue} size={42} />
      <View style={{ flex: 1 }}>
        <AppText role="label" weight="bold" numberOfLines={1}>
          {name}
        </AppText>
        <View style={{ flexDirection: row, gap: 8, alignItems: "center" }}>
          <Rating value={d.rating} compact />
          <AppText role="tiny" color={colors.textMuted}>
            {formatOMR(d.fee_omr, i18n)}
          </AppText>
        </View>
      </View>
      <View style={{ backgroundColor: colors.accent, borderRadius: radii.sm + 2, paddingHorizontal: 12, height: 32, alignItems: "center", justifyContent: "center" }}>
        <AppText role="tiny" weight="bold" color="#2E1A47">
          {t("me.bookNow")}
        </AppText>
      </View>
    </Pressable>
  );
}
