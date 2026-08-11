import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Locale = "ar" | "en";
export type ThemeMode = "light" | "dark" | "system";

interface AppState {
  /** Arabic-first: the app is born RTL. */
  locale: Locale;
  mode: ThemeMode;
  hasOnboarded: boolean;
  authed: boolean;
  guest: boolean;
  hydrated: boolean;
  setLocale: (locale: Locale) => void;
  setMode: (mode: ThemeMode) => void;
  completeOnboarding: () => void;
  signIn: () => void;
  signOut: () => void;
  continueAsGuest: () => void;
  setHydrated: (v: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      locale: "ar",
      mode: "light",
      hasOnboarded: false,
      authed: false,
      guest: false,
      hydrated: false,
      setLocale: (locale) => set({ locale }),
      setMode: (mode) => set({ mode }),
      completeOnboarding: () => set({ hasOnboarded: true }),
      signIn: () => set({ authed: true, guest: false }),
      signOut: () => set({ authed: false, guest: false }),
      continueAsGuest: () => set({ guest: true, authed: false }),
      setHydrated: (v) => set({ hydrated: v }),
    }),
    {
      name: "medilink.app",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ locale, mode, hasOnboarded, authed, guest }) => ({
        locale,
        mode,
        hasOnboarded,
        authed,
        guest,
      }),
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    },
  ),
);
