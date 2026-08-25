/**
 * Real-mode auth bridge.
 *
 * The approved sign-in UI is phone → OTP. In real demo mode the OTP sheet is
 * theater over a real Supabase session: entering the configured DEMO_PHONE
 * signs in the pre-provisioned test patient with email/password under the
 * hood (no SMS dependency live in the room). Any other number is refused with
 * a friendly "invite-only pilot" message. Production swaps this single module
 * for the backend's Twilio Verify flow — the UI doesn't change.
 *
 * The Supabase session is the source of truth; the appStore `authed` flag is
 * synced from it here (restore on launch, and on auth-state changes so an
 * expired/revoked session drops the app back to guest instead of a
 * half-authenticated state).
 */
import { env } from "@/config/env";
import { supabase } from "@/lib/supabase";
import { useAppStore } from "@/stores/appStore";
import { clearSessionCaches, waitForSession } from "./queries";

export class DemoPhoneOnlyError extends Error {
  readonly code = "DEMO_PHONE_ONLY" as const;
  constructor() {
    super("This build is an invite-only pilot — sign in with the demo number.");
    this.name = "DemoPhoneOnlyError";
  }
}

/** Patient-only gate — a HAMS staff account must never enter the patient app. */
async function sessionIsPatient(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return false;
  const { data: row, error } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  // No row / read error → treat as patient (fail open; RLS remains the real boundary).
  if (error || !row) return true;
  if (row.role && row.role !== "patient") {
    await supabase.auth.signOut().catch(() => {});
    return false;
  }
  return true;
}

export const realAuth = {
  /** Phone digits the OTP sheet accepted → a real Supabase session. */
  async demoSignIn(phone: string): Promise<void> {
    const digits = phone.replace(/\D/g, "");
    // Roster of seeded demo personas; the single-pair env vars remain the fallback.
    const roster = env.DEMO_ACCOUNTS.length
      ? env.DEMO_ACCOUNTS
      : env.DEMO_PHONE && env.DEMO_EMAIL
        ? [{ phone: env.DEMO_PHONE, email: env.DEMO_EMAIL }]
        : [];
    const account = roster.find((a) => a.phone === digits);
    if (!account) throw new DemoPhoneOnlyError();
    if (!env.DEMO_PASSWORD) {
      throw new Error("Demo account is not configured — set EXPO_PUBLIC_DEMO_PASSWORD in .env.");
    }
    clearSessionCaches();
    const { error } = await supabase.auth.signInWithPassword({
      email: account.email,
      password: env.DEMO_PASSWORD,
    });
    if (error) throw new Error(error.message);
    if (!(await sessionIsPatient())) throw new Error("This account is not a patient account.");
  },

  async signOut(): Promise<void> {
    clearSessionCaches();
    await supabase.auth.signOut().catch(() => {});
  },

  /**
   * Reconcile the persisted appStore flag with the real session once per
   * launch, then keep them in sync on token expiry / revocation.
   */
  init(): void {
    void (async () => {
      // The persisted session restores from storage asynchronously — deciding
      // "signed out" before it lands would bounce a signed-in user to the
      // sign-in wall on every cold start.
      await waitForSession();
      const store = useAppStore.getState();
      const ok = await sessionIsPatient();
      if (ok && !store.authed) store.signIn();
      if (!ok && store.authed) store.signOut();
    })();
    supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        clearSessionCaches();
        const store = useAppStore.getState();
        if (store.authed) store.signOut();
      }
    });
  },
};
