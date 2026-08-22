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
  /**
   * Whose file you are looking at: "self" (the account holder) or a family
   * member id. Only the account holder can switch. Deliberately NOT persisted —
   * every launch starts on your own profile, and it can never point at a
   * member id that no longer exists.
   */
  activePatientId: string;
  /**
   * Consents (client feedback 2026-08-20) are asked ONCE, never re-asked:
   * - PDPL data/terms: once per PATIENT (an account holds several patients),
   * - clinic contact (phone/WA/email for booking & service comms): per CLINIC,
   * - promotional content from Medilink: once per ACCOUNT (granted or declined,
   *   either answer ends the asking).
   */
  patientConsents: string[];
  clinicConsents: string[];
  promoConsent: "unset" | "granted" | "declined";
  grantPatientConsent: (patientId: string) => void;
  grantClinicConsent: (clinicId: string) => void;
  decidePromoConsent: (granted: boolean) => void;
  setActivePatient: (id: string) => void;
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
      activePatientId: "self",
      patientConsents: [],
      clinicConsents: [],
      promoConsent: "unset",
      grantPatientConsent: (patientId) =>
        set((s) => (s.patientConsents.includes(patientId) ? s : { patientConsents: [...s.patientConsents, patientId] })),
      grantClinicConsent: (clinicId) =>
        set((s) => (s.clinicConsents.includes(clinicId) ? s : { clinicConsents: [...s.clinicConsents, clinicId] })),
      decidePromoConsent: (granted) => set({ promoConsent: granted ? "granted" : "declined" }),
      setActivePatient: (id) => set({ activePatientId: id }),
      setLocale: (locale) => set({ locale }),
      setMode: (mode) => set({ mode }),
      completeOnboarding: () => set({ hasOnboarded: true }),
      signIn: () => set({ authed: true, guest: false, activePatientId: "self" }),
      signOut: () => set({ authed: false, guest: false, activePatientId: "self" }),
      continueAsGuest: () => set({ guest: true, authed: false }),
      setHydrated: (v) => set({ hydrated: v }),
    }),
    {
      name: "medilink.app",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ locale, mode, hasOnboarded, authed, guest, patientConsents, clinicConsents, promoConsent }) => ({
        locale,
        mode,
        hasOnboarded,
        authed,
        guest,
        // Consents survive restarts — re-asking is exactly what the client flagged.
        patientConsents,
        clinicConsents,
        promoConsent,
      }),
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    },
  ),
);
