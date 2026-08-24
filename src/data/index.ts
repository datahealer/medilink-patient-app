/**
 * Data-layer entry — screens import { repositories } from "@/data" ONLY.
 *
 * EXPO_PUBLIC_DATA_MODE picks the seam:
 *   mock  — the original in-memory prototype (default; zero network, demo-safe)
 *   real  — the live MediLink engine: Supabase reads under RLS,
 *           book_appointment_atomic bookings, Thawani sandbox payments via the
 *           MediLink backend. Composition is a hybrid, exactly like production
 *           mobile/src/data/index.ts: everything the client de-scoped
 *           (packages catalog, AI assistant, favourites persistence, medical
 *           history content) stays mock; every booking-revenue path is real.
 */
import { repositories as mockRepositories } from "./mock";
import { realAuth } from "./real/auth";
import { realRepositories } from "./real";
import { env } from "@/config/env";
import type { Repositories } from "./repositories";

export const isRealData = env.DATA_MODE === "real";

export const repositories: Repositories = isRealData
  ? {
      ...mockRepositories, // ai, favourite stay mock
      ...realRepositories, // patient, family, discovery, doctor, appointment, notification, review
    }
  : mockRepositories;

/**
 * Auth bridge for the sign-in surfaces. In mock mode the OTP is pure theater;
 * in real mode it resolves to a real Supabase session (see real/auth.ts).
 */
export const authBridge = isRealData
  ? realAuth
  : {
      demoSignIn: async (_phone: string) => {},
      signOut: async () => {},
      init: () => {},
    };

export * from "./types";
export type { Repositories, DoctorSearchParams } from "./repositories";
