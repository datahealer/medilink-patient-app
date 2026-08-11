import React, { useEffect } from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { I18nProvider, useI18n } from "@/i18n";
import { ThemeProvider } from "@/theme";
import { BRAND_FONT_FILES } from "@/theme/typography";

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootStack() {
  const { isRTL } = useI18n();
  return (
    <Stack
      screenOptions={{
        headerShown: false, // every screen draws its own header (manual RTL)
        animation: isRTL ? "slide_from_left" : "slide_from_right",
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" options={{ animation: "fade" }} />
      <Stack.Screen name="booking/success" options={{ gestureEnabled: false, animation: "fade" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts(BRAND_FONT_FILES);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: "#2E1A47" }} />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <I18nProvider>
          <ThemeProvider>
            <RootStack />
          </ThemeProvider>
        </I18nProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
