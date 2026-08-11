import React from "react";
import { View } from "react-native";
import { Redirect } from "expo-router";
import { useAppStore } from "@/stores/appStore";

export default function Entry() {
  const hydrated = useAppStore((s) => s.hydrated);
  const hasOnboarded = useAppStore((s) => s.hasOnboarded);
  const authed = useAppStore((s) => s.authed);
  const guest = useAppStore((s) => s.guest);

  if (!hydrated) return <View style={{ flex: 1, backgroundColor: "#2E1A47" }} />;
  if (!hasOnboarded) return <Redirect href="/onboarding" />;
  if (!authed && !guest) return <Redirect href="/auth/sign-in" />;
  return <Redirect href="/(tabs)" />;
}
