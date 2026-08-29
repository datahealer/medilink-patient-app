/**
 * Staff (HAMS-side) demo logins — one working account per active facility and
 * per active doctor, all sharing one easy password, so any clinic's reception
 * view or any doctor's schedule can be shown on demand during the demo.
 *
 *   node scripts/seed-staff-accounts.mjs
 *
 * Reality check this encodes: adding a `facilities`/`doctors` row does NOT
 * create a login. Accounts are auth.users + role wiring:
 *   facility admin → profiles{role:facility_admin, facility_id} + facility_admins row
 *   doctor        → profiles{role:doctor, facility_id} + doctors.user_id link
 *
 * Policy:
 *   - Existing accounts on throwaway/test emails (example.com, disposable
 *     domains, keyboard-mash gmails) → password reset to DEMO_STAFF_PASSWORD,
 *     role/status repaired to the working shape.
 *   - Existing accounts that look like a real person's (named gmail/inzint
 *     teammates) → NEVER touched; listed as-is in the output.
 *   - Facilities/doctors with no account → a fresh jai+…@inzint.com alias is
 *     created (all mail routes to the project owner) and wired correctly.
 *
 * Output: scratch JSON printed path — consumed by the spreadsheet builder.
 * Idempotent: lookups by email; re-runs converge.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "../.staff-accounts.json"); // gitignored with .env*

const DEMO_STAFF_PASSWORD = "Demo@2026";

const env = Object.fromEntries(
  readFileSync("/Users/thakur/Workspace/medilink/medilink/Medilink/backend/.env", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^"|"$/g, "")]),
);
const BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const HEADERS = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

async function rest(method, path, body) {
  const res = await fetch(`${BASE}/rest/v1/${path}`, {
    method,
    headers: { ...HEADERS, Prefer: "return=representation" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 250)}`);
  return text ? JSON.parse(text) : null;
}
const get = (p) => rest("GET", p);
const post = (p, b) => rest("POST", p, b);
const patch = (p, b) => rest("PATCH", p, b);

async function adminAuth(method, path, body) {
  const res = await fetch(`${BASE}/auth/v1/${path}`, { method, headers: HEADERS, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  if (!res.ok) throw new Error(`auth ${method} ${path} → ${res.status}: ${text.slice(0, 250)}`);
  return text ? JSON.parse(text) : null;
}

/** Accounts that look like a real person's — never reset, never relink. */
const PROTECTED = /satyam|ammar|abhiraj|vartika|raman|indus|inzintllc|475|alex1|alice|jhon/i;
function isProtected(email) {
  const e = (email ?? "").toLowerCase();
  if (!e) return false;
  if (e.includes("@inzint.com") && !e.startsWith("jai+")) return true;
  return PROTECTED.test(e);
}

const slug = (name) =>
  name
    .toLowerCase()
    .replace(/^dr\.?\s*/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/* --------------------------------- load ---------------------------------- */

const facilities = await get("facilities?select=id,name,name_ar,type,city&status=eq.active&is_verified=eq.true&order=name");
const doctors = await get("doctors?select=id,full_name,specialty,user_id,facility_id&is_active=eq.true&order=full_name&limit=300");
const admins = (await get("facility_admins?select=facility_id,user_id,revoked_at&limit=300")).filter((a) => !a.revoked_at);
const profiles = await get("profiles?select=id,email,role,status,facility_id&limit=1000");
const profById = new Map(profiles.map((p) => [p.id, p]));
const profByEmail = new Map(profiles.map((p) => [p.email?.toLowerCase(), p]));
const facById = new Map(facilities.map((f) => [f.id, f]));
const [superAdmin] = profiles.filter((p) => p.role === "super_admin");

// Upcoming bookings per doctor/facility — the "show me their bookings" flag.
const today = new Date(Date.now() + 4 * 3600_000).toISOString().slice(0, 10);
const upcoming = await get(`appointments?select=doctor_id,facility_id&slot_date=gte.${today}&status=in.(pending,confirmed,checked_in)&limit=1000`);
const upDoc = new Set(upcoming.map((a) => a.doctor_id));
const upFac = new Set(upcoming.map((a) => a.facility_id));

const rows = [];
const log = (...a) => console.log(...a);

async function ensureUser(email, fullName, role) {
  const existing = profByEmail.get(email.toLowerCase());
  if (existing) return existing.id;
  const user = await adminAuth("POST", "admin/users", {
    email,
    password: DEMO_STAFF_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName, role },
  });
  const id = user.id ?? user.user?.id;
  if (!id) throw new Error(`no id for ${email}`);
  profByEmail.set(email.toLowerCase(), { id, email, role });
  return id;
}

/** False when the auth user is gone (orphaned profile row) — caller creates fresh. */
async function tryResetPassword(userId) {
  try {
    await adminAuth("PUT", `admin/users/${userId}`, { password: DEMO_STAFF_PASSWORD });
    return true;
  } catch (e) {
    if (String(e.message).includes("user_not_found")) return false;
    throw e;
  }
}

/* ------------------------------- facilities ------------------------------- */

log(`— Facility admin logins (${facilities.length} active facilities) —`);
for (const f of facilities) {
  const facAdmins = admins.filter((a) => a.facility_id === f.id).map((a) => profById.get(a.user_id)).filter(Boolean);
  const resettable = facAdmins.find((p) => !isProtected(p.email));
  if (resettable && (await tryResetPassword(resettable.id))) {
    await patch(`profiles?id=eq.${resettable.id}`, { role: "facility_admin", status: "active", facility_id: f.id });
    rows.push({ type: "Clinic / Reception", name: f.name, facility: f.name, city: f.city ?? "", email: resettable.email, password: DEMO_STAFF_PASSWORD, action: "password reset (existing test account)", upcoming: upFac.has(f.id) });
    log(`  ↺ ${f.name} → ${resettable.email}`);
  } else {
    const email = `jai+clinic-${slug(f.name)}@inzint.com`;
    const uid = await ensureUser(email, `${f.name} Reception`, "facility_admin");
    await patch(`profiles?id=eq.${uid}`, { role: "facility_admin", status: "active", facility_id: f.id, full_name: `${f.name} Reception` });
    const already = await get(`facility_admins?select=id&facility_id=eq.${f.id}&user_id=eq.${uid}`);
    if (!already.length) {
      await post("facility_admins", {
        facility_id: f.id,
        user_id: uid,
        is_primary: true,
        assigned_by: superAdmin?.id ?? uid,
        permissions: { view_reports: true, access_billing: true, onboard_doctors: true, edit_clinic_profile: true, manage_appointments: true },
      });
    }
    rows.push({ type: "Clinic / Reception", name: f.name, facility: f.name, city: f.city ?? "", email, password: DEMO_STAFF_PASSWORD, action: "account created", upcoming: upFac.has(f.id) });
    log(`  + ${f.name} → ${email}`);
  }
  // Personal accounts stay listed (visible, untouched) so the sheet is complete.
  for (const p of facAdmins.filter((x) => isProtected(x.email))) {
    rows.push({ type: "Clinic / Reception", name: f.name, facility: f.name, city: f.city ?? "", email: p.email, password: "(unchanged — looks like a personal account)", action: "not touched", upcoming: upFac.has(f.id) });
  }
}

/* -------------------------------- doctors --------------------------------- */

log(`\n— Doctor logins (${doctors.length} active doctors) —`);
const usedEmails = new Set();
for (const d of doctors) {
  const fac = facById.get(d.facility_id);
  const facName = fac?.name ?? "";
  const city = fac?.city ?? "";
  const linked = d.user_id ? profById.get(d.user_id) : null;
  if (linked && isProtected(linked.email)) {
    rows.push({ type: "Doctor", name: d.full_name, facility: facName, city, email: linked.email, password: "(unchanged — looks like a personal account)", action: "not touched", upcoming: upDoc.has(d.id) });
    continue;
  }
  if (linked && (await tryResetPassword(linked.id))) {
    await patch(`profiles?id=eq.${linked.id}`, { role: "doctor", status: "active", facility_id: d.facility_id });
    rows.push({ type: "Doctor", name: d.full_name, facility: facName, city, email: linked.email, password: DEMO_STAFF_PASSWORD, action: linked.role === "doctor" ? "password reset (existing test account)" : `password reset + role repaired (was ${linked.role})`, upcoming: upDoc.has(d.id) });
    continue;
  }
  // Reaching here with `linked` set means the auth user was deleted out from
  // under the profile — fall through and mint a fresh, correctly-linked account.
  // No account — create and link.
  let email = `jai+dr-${slug(d.full_name)}@inzint.com`;
  let n = 2;
  while (usedEmails.has(email) || profByEmail.has(email.toLowerCase())) email = `jai+dr-${slug(d.full_name)}-${n++}@inzint.com`;
  usedEmails.add(email);
  const uid = await ensureUser(email, d.full_name, "doctor");
  await patch(`profiles?id=eq.${uid}`, { role: "doctor", status: "active", facility_id: d.facility_id, full_name: d.full_name });
  await patch(`doctors?id=eq.${d.id}`, { user_id: uid });
  rows.push({ type: "Doctor", name: d.full_name, facility: facName, city, email, password: DEMO_STAFF_PASSWORD, action: "account created", upcoming: upDoc.has(d.id) });
  log(`  + ${d.full_name} → ${email}`);
}

writeFileSync(OUT, JSON.stringify(rows, null, 1));
const created = rows.filter((r) => r.action === "account created").length;
const reset = rows.filter((r) => r.action.startsWith("password reset")).length;
const untouched = rows.filter((r) => r.action === "not touched").length;
log(`\nDone: ${rows.length} rows (${created} created, ${reset} reset, ${untouched} personal accounts untouched) → ${OUT}`);
