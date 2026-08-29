/**
 * Environment — Expo inlines `process.env.EXPO_PUBLIC_*` at bundle time from `.env`.
 *
 * DATA_MODE controls the data seam (src/data/index.ts):
 *   - "mock"  (default, and the fallback when .env is absent) — the original
 *     in-memory prototype, zero network.
 *   - "real"  — Supabase + MediLink backend: real discovery, real
 *     `book_appointment_atomic` bookings, real Thawani sandbox payments.
 *
 * The demo account trio powers the sign-in screen's OTP theater in real mode:
 * entering DEMO_PHONE signs in the pre-provisioned test patient via
 * email/password under the hood (no SMS dependency during the demo).
 */
export const env = {
  DATA_MODE: (process.env.EXPO_PUBLIC_DATA_MODE === "real" ? "real" : "mock") as "real" | "mock",
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
  /** MediLink backend origin (payments, queue). LAN IP for a physical phone. */
  API_URL: process.env.EXPO_PUBLIC_API_URL ?? "",
  DEMO_PHONE: (process.env.EXPO_PUBLIC_DEMO_PHONE ?? "").replace(/\D/g, ""),
  DEMO_EMAIL: process.env.EXPO_PUBLIC_DEMO_EMAIL ?? "",
  DEMO_PASSWORD: process.env.EXPO_PUBLIC_DEMO_PASSWORD ?? "",
  /**
   * The one-time code every OTP sheet sends and accepts (4 digits; no SMS
   * provider is wired in demo mode). The sheet auto-fills it after a beat, so
   * the operator always knows the code; typing anything else is refused, which
   * keeps the theater honest if an investor grabs the phone.
   */
  DEMO_OTP: ((process.env.EXPO_PUBLIC_DEMO_OTP ?? "").replace(/\D/g, "") || "1234").slice(0, 4).padEnd(4, "0"),
  /**
   * Mailbox that owns the accounts created ON THE FLY when an unknown phone
   * completes the OTP sheet (guest → booking sign-up). Each phone maps to a
   * deterministic +tag address (local+ml<digits>@domain), so re-entering the
   * same number signs into the same account forever. Defaults to DEMO_EMAIL
   * with any existing +tag stripped.
   */
  DEMO_SIGNUP_EMAIL:
    process.env.EXPO_PUBLIC_DEMO_SIGNUP_EMAIL ??
    (process.env.EXPO_PUBLIC_DEMO_EMAIL ?? "").replace(/\+[^@]*@/, "@"),
  /**
   * Multi-account roster: "phone:email,phone:email,…". Every listed phone
   * unlocks its account through the OTP sheet (all share DEMO_PASSWORD), so
   * the demo can switch between seeded patient personas. Falls back to the
   * single DEMO_PHONE/DEMO_EMAIL pair when unset.
   */
  DEMO_ACCOUNTS: (process.env.EXPO_PUBLIC_DEMO_ACCOUNTS ?? "")
    .split(",")
    .map((pair) => {
      const i = pair.indexOf(":");
      return i < 0
        ? null
        : { phone: pair.slice(0, i).replace(/\D/g, ""), email: pair.slice(i + 1).trim() };
    })
    .filter((a): a is { phone: string; email: string } => !!a && !!a.phone && !!a.email),
};
