import "react-native-url-polyfill/auto";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { env } from "@/config/env";

/**
 * Supabase client against the live shared MediLink/HAMS project — same anon key
 * and RLS the production mobile app uses. Session persists in AsyncStorage
 * (the production app uses SecureStore; AsyncStorage keeps this repo
 * dependency-light and Expo-Go-safe for the demo).
 *
 * Untyped (no generated Database generic): the query layer in
 * src/data/real/queries.ts is copied from `@medilink/shared` and already
 * validated against the real schema — the generics would need the monorepo's
 * codegen file, which this standalone repo deliberately doesn't vendor.
 */
export const supabase: SupabaseClient = createClient(env.SUPABASE_URL || "http://localhost", env.SUPABASE_ANON_KEY || "anon", {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Only auto-refresh tokens while foregrounded (official RN pattern).
AppState.addEventListener("change", (state) => {
  if (state === "active") supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

/**
 * Current access token for backend REST calls. Proactively refresh when close
 * to expiry — a stale bearer gets a 401 from the backend even though direct
 * Supabase queries would have silently refreshed (same fix as production).
 */
export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) return null;
  const expiresAtMs = (session.expires_at ?? 0) * 1000;
  if (!expiresAtMs || expiresAtMs - Date.now() < 60_000) {
    const { data: refreshed, error } = await supabase.auth.refreshSession();
    if (!error && refreshed.session?.access_token) return refreshed.session.access_token;
  }
  return session.access_token ?? null;
}
