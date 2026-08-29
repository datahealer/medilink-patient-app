/**
 * Real-mode auth bridge.
 *
 * The approved sign-in UI is phone → OTP. In real demo mode the OTP sheet is
 * theater over a real Supabase session — the "code" is env.DEMO_OTP (the sheet
 * auto-fills it, and any other code is refused), and completing it resolves to
 * a real account by phone:
 *
 *   • roster phone (DEMO_ACCOUNTS / DEMO_PHONE)   → password sign-in to that
 *     pre-provisioned persona, exactly as before.
 *   • ANY OTHER PHONE → a real account is created ON THE FLY: the backend's
 *     public signup route provisions a confirmed patient (service-role,
 *     `email_confirm: true`, DB trigger creates profiles + patient_profiles),
 *     then password sign-in. The email is DETERMINISTIC from the digits
 *     (local+ml<digits>@domain from DEMO_SIGNUP_EMAIL), so re-entering the
 *     same number on any later run signs straight into the same account —
 *     sign-in is tried first and signup only runs when it refuses.
 *
 * This is what makes the guest → booking flow self-serve in the room: the
 * patient books as a guest, types their own number, "receives" the code, and
 * an account exists by the time the appointment row is written. No SMS or
 * email dependency anywhere. Production swaps this single module for the
 * backend's Twilio Verify flow — the UI doesn't change.
 *
 * The Supabase session is the source of truth; the appStore `authed` flag is
 * synced from it here (restore on launch, and on auth-state changes so an
 * expired/revoked session drops the app back to guest instead of a
 * half-authenticated state).
 */
import { env } from "@/config/env";
import { apiFetch } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { useAppStore } from "@/stores/appStore";
import { clearSessionCaches, waitForSession } from "./queries";

/** The code every OTP sheet expects. Exposed so the sheets can auto-fill it. */
export const DEMO_OTP = env.DEMO_OTP;

/** Deterministic on-the-fly account address for a phone: local+ml<digits>@domain. */
function signupEmailFor(digits: string): string {
  const base = env.DEMO_SIGNUP_EMAIL;
  const at = base.indexOf("@");
  if (at <= 0) return "";
  return `${base.slice(0, at)}+ml${digits}${base.slice(at)}`;
}

/** Supabase "wrong email/password" — the signal that the account doesn't exist yet. */
function isInvalidCredentials(message: string): boolean {
  return /invalid login credentials/i.test(message);
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
  /**
   * Phone digits + the code the OTP sheet collected → a real Supabase session.
   * Roster phones sign in; unknown phones sign UP (account created on the fly)
   * — the patient never sees the difference. `code`, when given, must be the
   * demo OTP; the sheets auto-fill it, so this only trips on a manual typo.
   */
  async demoSignIn(phone: string, code?: string): Promise<void> {
    if (code !== undefined && code.replace(/\D/g, "") !== DEMO_OTP) {
      throw new Error("That code didn't match — try the one we sent.");
    }
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 8) throw new Error("Enter a valid mobile number.");
    if (!env.DEMO_PASSWORD) {
      throw new Error("Demo account is not configured — set EXPO_PUBLIC_DEMO_PASSWORD in .env.");
    }
    // Roster of seeded demo personas; the single-pair env vars remain the fallback.
    const roster = env.DEMO_ACCOUNTS.length
      ? env.DEMO_ACCOUNTS
      : env.DEMO_PHONE && env.DEMO_EMAIL
        ? [{ phone: env.DEMO_PHONE, email: env.DEMO_EMAIL }]
        : [];
    const account = roster.find((a) => a.phone === digits);
    const email = account?.email ?? signupEmailFor(digits);
    if (!email) {
      throw new Error("Sign-up is not configured — set EXPO_PUBLIC_DEMO_SIGNUP_EMAIL in .env.");
    }
    clearSessionCaches();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: env.DEMO_PASSWORD,
    });
    if (error) {
      // A roster account failing is a configuration fault — surface it. An
      // unknown phone failing with bad-credentials just doesn't exist yet:
      // create it and sign in again.
      if (account || !isInvalidCredentials(error.message)) throw new Error(error.message);
      await apiFetch("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          full_name: `Guest ${digits.slice(-4)}`,
          email,
          phone: `+968${digits}`,
          password: env.DEMO_PASSWORD,
          role: "patient",
        }),
      });
      const retry = await supabase.auth.signInWithPassword({ email, password: env.DEMO_PASSWORD });
      if (retry.error) throw new Error(retry.error.message);
    }
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
