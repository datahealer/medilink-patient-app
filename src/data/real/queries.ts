/**
 * Live-DB queries — copy-adapted from `@medilink/shared` (`shared/src/api/*`)
 * so this standalone repo needs no workspace link. Each function preserves the
 * production query shape exactly (selects, filters, RPC names and args); only
 * the typed `DB` generic is dropped. See docs/PORTING.md for the mapping table.
 */
import { supabase } from "@/lib/supabase";

const norm = (s: string | null | undefined) => (s ?? "").trim().replace(/\s+/g, " ");

/* ------------------------------- profile -------------------------------- */

/**
 * Cold-start race: screens fire user-scoped queries the moment they mount,
 * which can be BEFORE the persisted session finishes restoring from storage —
 * getUser() then answers "not authenticated" once, the query errors, and the
 * identity renders blank until something refetches. Wait briefly for the
 * session to land before deciding the caller is signed out.
 */
export async function waitForSession(timeoutMs = 4000): Promise<void> {
  const { data } = await supabase.auth.getSession();
  if (data.session) return;
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      sub.data.subscription.unsubscribe();
      resolve();
    }, timeoutMs);
    const sub = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        clearTimeout(timer);
        sub.data.subscription.unsubscribe();
        resolve();
      }
    });
  });
}

export async function getCurrentUserId(): Promise<string> {
  await waitForSession();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("Not authenticated");
  return data.user.id;
}

let patientProfileIdCache: string | null = null;

export async function getMyPatientProfileId(): Promise<string> {
  if (patientProfileIdCache) return patientProfileIdCache;
  const userId = await getCurrentUserId();
  const { data, error } = await supabase.from("patient_profiles").select("id").eq("user_id", userId).single();
  if (error) throw error;
  patientProfileIdCache = data.id as string;
  return patientProfileIdCache;
}

export function clearSessionCaches() {
  patientProfileIdCache = null;
  profileCache = null;
}

export interface MyProfileRow {
  account: { id: string; full_name: string | null; full_name_ar: string | null; phone: string | null } | null;
  patient: {
    id: string;
    date_of_birth: string | null;
    gender: string | null;
    blood_group: string | null;
    address: unknown;
    emergency_contact: unknown;
    civil_number: string | null;
  } | null;
}

let profileCache: MyProfileRow | null = null;

export async function getMyProfile(fresh = false): Promise<MyProfileRow> {
  if (profileCache && !fresh) return profileCache;
  const userId = await getCurrentUserId();
  const [{ data: account, error: accErr }, { data: patient, error: patErr }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, full_name_ar, phone").eq("id", userId).maybeSingle(),
    supabase
      .from("patient_profiles")
      .select("id, date_of_birth, gender, blood_group, address, emergency_contact, civil_number")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
  if (accErr) throw accErr;
  if (patErr) throw patErr;
  profileCache = { account, patient } as MyProfileRow;
  return profileCache;
}

export async function updateMyProfile(patch: {
  full_name?: string;
  date_of_birth?: string | null;
  gender?: string | null;
  blood_group?: string | null;
  address?: unknown;
  emergency_contact?: unknown;
  civil_number?: string | null;
}): Promise<void> {
  const userId = await getCurrentUserId();
  if (patch.full_name !== undefined) {
    const { error } = await supabase.from("profiles").update({ full_name: norm(patch.full_name) }).eq("id", userId);
    if (error) throw error;
  }
  const patientPatch: Record<string, unknown> = {};
  for (const k of ["date_of_birth", "gender", "blood_group", "address", "emergency_contact", "civil_number"] as const) {
    if (patch[k] !== undefined) patientPatch[k] = patch[k];
  }
  if (Object.keys(patientPatch).length) {
    const { error } = await supabase.from("patient_profiles").update(patientPatch).eq("user_id", userId);
    if (error) throw error;
  }
  profileCache = null;
}

/* ------------------------------- doctors -------------------------------- */

// NB: no `gender` here — the column ships in the pending 20260825000000
// migration; until it is applied the mapper infers gender from the first name.
const DOCTOR_LIST_SELECT =
  "id, full_name, full_name_ar, full_name_ar_status, specialty, years_experience, fees, avg_rating, review_count, profile_photo_url, facility_id, branch_id, status, languages, facilities(name, name_ar, name_ar_status)";

export interface DoctorRow {
  id: string;
  full_name: string | null;
  full_name_ar?: string | null;
  full_name_ar_status?: string | null;
  specialty: string | null;
  years_experience: number | null;
  fees: unknown;
  avg_rating: number | string | null;
  review_count?: number | null;
  profile_photo_url: string | null;
  facility_id: string | null;
  gender?: string | null;
  languages?: string[] | null;
  about?: string | null;
  bio?: string | null;
  facilities?: { name: string | null; name_ar?: string | null; name_ar_status?: string | null } | { name: string | null; name_ar?: string | null; name_ar_status?: string | null }[] | null;
}

/** Active doctors, best-rated first. `is_active` filtered in the query on purpose (see shared/api/doctors.ts). */
export async function searchDoctors(q: { facilityId?: string; term?: string; limit?: number } = {}): Promise<DoctorRow[]> {
  let query = supabase
    .from("doctors")
    .select(DOCTOR_LIST_SELECT)
    .eq("is_active", true)
    .order("avg_rating", { ascending: false, nullsFirst: false });
  if (q.facilityId) query = query.eq("facility_id", q.facilityId);
  const term = norm(q.term);
  if (term) query = query.ilike("full_name", `%${term}%`);
  query = query.range(0, (q.limit ?? 100) - 1);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as DoctorRow[];
}

export async function getDoctor(id: string): Promise<DoctorRow | null> {
  const { data, error } = await supabase
    .from("doctors")
    .select("*, facilities(name, name_ar, name_ar_status)")
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return (data as DoctorRow | null) ?? null;
}

/** BP-1 — doctor ids with a real bookable slot on `date`. Best-effort for guests. */
export async function listDoctorsAvailableToday(date: string): Promise<Set<string>> {
  const { data, error } = await supabase.rpc("doctors_available_today", { p_date: date });
  if (error) throw error;
  const rows = (data ?? []) as { doctor_id: string }[];
  return new Set(rows.map((r) => r.doctor_id).filter(Boolean));
}

/* ------------------------------ facilities ------------------------------- */

// working_hours + description included: getClinic() serves the pool-cached row
// straight to the details screen, so the list select must carry everything the
// detail view renders (an empty hours card and a false "closed" badge otherwise).
const FACILITY_LIST_SELECT =
  "id, name, name_ar, name_ar_status, type, address, description, services, rating, review_count, is_verified, cover_photo_url, phone, working_hours, doctors!inner(id)";

const FACILITY_DETAIL_SELECT =
  "id, name, name_ar, name_ar_status, type, custom_type, description, address, phone, email, website, logo_url, cover_photo_url, working_hours, services, rating, review_count, status, is_verified";

export interface FacilityRow {
  id: string;
  name: string | null;
  name_ar?: string | null;
  name_ar_status?: string | null;
  type: string | null;
  custom_type?: string | null;
  description?: string | null;
  address: unknown;
  services?: string[] | null;
  rating: number | string | null;
  review_count?: number | null;
  is_verified?: boolean | null;
  cover_photo_url?: string | null;
  phone?: string | null;
  working_hours?: unknown;
  doctors?: { id: string }[] | null;
}

export async function listFacilities(opts: { limit?: number } = {}): Promise<FacilityRow[]> {
  const { data, error } = await supabase
    .from("facilities")
    .select(FACILITY_LIST_SELECT)
    .eq("status", "active")
    .eq("is_verified", true)
    .order("rating", { ascending: false, nullsFirst: false })
    .range(0, (opts.limit ?? 30) - 1);
  if (error) throw error;
  return (data ?? []) as FacilityRow[];
}

export async function getFacility(id: string): Promise<FacilityRow | null> {
  const { data, error } = await supabase
    .from("facilities")
    .select(FACILITY_DETAIL_SELECT)
    .eq("id", id)
    .eq("status", "active")
    .eq("is_verified", true)
    .maybeSingle();
  if (error) throw error;
  return (data as FacilityRow | null) ?? null;
}

export interface NearbyRow {
  id: string;
  latitude: number | null;
  longitude: number | null;
  distance_km: number | null;
}

/** get_nearby_facilities RPC — used for map pins + clinic coordinates. */
export async function nearbyFacilities(lat: number, lng: number, radiusM: number): Promise<NearbyRow[]> {
  const { data, error } = await supabase.rpc("get_nearby_facilities", {
    p_lat: lat,
    p_lng: lng,
    p_radius_m: radiusM,
  });
  if (error) throw error;
  return (data ?? []) as NearbyRow[];
}

/* -------------------------------- family --------------------------------- */

export interface FamilyRow {
  id: string;
  full_name: string;
  relation: string;
  date_of_birth: string | null;
  gender: string | null;
}

export async function listFamily(): Promise<FamilyRow[]> {
  const patientId = await getMyPatientProfileId();
  const { data, error } = await supabase
    .from("family_members")
    .select("id, full_name, relation, date_of_birth, gender")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as FamilyRow[];
}

export async function addFamilyMember(member: {
  full_name: string;
  relation: string;
  date_of_birth?: string | null;
  gender?: string | null;
}): Promise<FamilyRow> {
  const patientId = await getMyPatientProfileId();
  const full_name = norm(member.full_name);
  if (full_name.length < 2) throw new Error("Full name must be at least 2 characters.");
  const { data, error } = await supabase
    .from("family_members")
    .insert({
      patient_id: patientId,
      full_name,
      relation: member.relation,
      date_of_birth: member.date_of_birth ?? null,
      gender: member.gender ?? null,
    })
    .select("id, full_name, relation, date_of_birth, gender")
    .single();
  if (error) throw error;
  return data as FamilyRow;
}

export async function deleteFamilyMember(id: string): Promise<void> {
  const patientId = await getMyPatientProfileId();
  const { error } = await supabase.from("family_members").delete().eq("id", id).eq("patient_id", patientId);
  if (error) throw error;
}

/* ----------------------------- appointments ------------------------------ */

const APPT_SELECT =
  "*, doctor:doctor_id ( id, full_name, full_name_ar, full_name_ar_status, specialty, fees ), " +
  "facility:facility_id ( id, name, name_ar, name_ar_status, address ), " +
  "family_member:for_family_member_id ( full_name ), " +
  "payments ( id, status, amount, currency )";

export interface ApptRow {
  id: string;
  reference_number: string | null;
  doctor_id: string | null;
  facility_id: string | null;
  for_family_member_id: string | null;
  slot_date: string | null;
  slot_start: string | null;
  slot_end: string | null;
  type: string | null;
  status: string | null;
  payment_status: string | null;
  reason_for_visit: string | null;
  doctor: { id: string; full_name: string | null; full_name_ar: string | null; full_name_ar_status: string | null; specialty: string | null; fees: unknown } | null;
  facility: { id: string; name: string | null; name_ar: string | null; name_ar_status: string | null; address: unknown } | null;
  family_member: { full_name: string | null } | null;
  payments?: { id: string; status: string | null; amount: number | null; currency: string | null }[] | null;
}

/** Oman-calendar today (UTC+4, no DST) — mirrors the DB's `oman_today()`. */
export function omanTodayISO(): string {
  const now = new Date(Date.now() + 4 * 3600_000);
  return now.toISOString().slice(0, 10);
}

const ENDED = ["completed", "cancelled", "no_show"];

export async function listMyAppointments(tab: "upcoming" | "past"): Promise<ApptRow[]> {
  const patientId = await getMyPatientProfileId();
  let query = supabase
    .from("appointments")
    .select(APPT_SELECT)
    .eq("patient_id", patientId)
    .order("slot_date", { ascending: tab === "upcoming" });
  if (tab === "upcoming") {
    query = query.gte("slot_date", omanTodayISO()).not("status", "in", `(${ENDED.join(",")})`);
  }
  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as unknown as ApptRow[];
  if (tab === "upcoming") return rows;
  // "past" = everything not upcoming: ended visits (any date) + earlier dates.
  const today = omanTodayISO();
  return rows.filter((r) => ENDED.includes(r.status ?? "") || (r.slot_date ?? "") < today);
}

export async function getAppointment(id: string): Promise<ApptRow | null> {
  const patientId = await getMyPatientProfileId();
  const { data, error } = await supabase
    .from("appointments")
    .select(APPT_SELECT)
    .eq("id", id)
    .eq("patient_id", patientId)
    .maybeSingle();
  if (error) throw error;
  return (data as ApptRow | null) ?? null;
}

export interface SlotRow {
  slot_start?: string;
  slot_end?: string;
  start?: string;
  end?: string;
  slot_type?: string;
}

/** Availability truth — the `get_available_slots` RPC (weekly template minus taken/held). */
export async function getAvailableSlots(doctorId: string, date: string): Promise<{ start: string; end?: string }[]> {
  const { data, error } = await supabase.rpc("get_available_slots", {
    p_doctor_id: doctorId,
    p_date: date,
    p_include_walkin: false,
  });
  if (error) throw error;
  const rows = (data ?? []) as SlotRow[];
  return rows
    .map((r) => ({
      start: String(r.slot_start ?? r.start ?? "").slice(0, 5),
      end: r.slot_end ?? r.end ? String(r.slot_end ?? r.end).slice(0, 5) : undefined,
    }))
    .filter((s) => s.start !== "");
}

/** `{ success:false, error }` is a business refusal, not a throw — honour both shapes. */
function unwrapRpc(res: unknown, fallbackError: string): Record<string, unknown> {
  const r = (res ?? {}) as Record<string, unknown>;
  if (r.success === false) throw new Error(String(r.error ?? fallbackError));
  return r;
}

export async function bookAppointment(input: {
  doctorId: string;
  facilityId: string;
  slotDate: string;
  slotStart: string;
  forFamilyMemberId?: string;
  reason?: string | null;
}): Promise<{ id: string; reference: string | null }> {
  const patientId = await getMyPatientProfileId();
  const reason = norm(input.reason ?? "");
  const { data, error } = await supabase.rpc("book_appointment_atomic", {
    p_patient_id: patientId,
    p_doctor_id: input.doctorId,
    p_facility_id: input.facilityId,
    p_slot_date: input.slotDate,
    p_slot_start: input.slotStart,
    p_type: "in_person",
    p_is_emergency: false,
    p_for_family_member_id: input.forFamilyMemberId,
    p_reason: reason || undefined,
  });
  if (error) throw error;
  const r = unwrapRpc(data, "BOOKING_FAILED");
  const id = String(r.appointment_id ?? r.id ?? "");
  if (!id) throw new Error("Booking did not return an appointment id");
  return { id, reference: (r.reference_number ?? r.reference ?? null) as string | null };
}

/**
 * Denormalized display identity on the appointment row. `book_appointment_atomic`
 * has no name parameter, so rows it creates carry patient_name NULL — and the
 * HAMS doctor list can't join other patients' profiles under RLS, so it renders
 * a literal "Patient". Patients may update their own rows (RLS-verified), so we
 * stamp the person the visit is FOR right after booking. Best-effort.
 */
export async function stampAppointmentContact(id: string, name: string, phone: string | null): Promise<void> {
  try {
    await supabase.from("appointments").update({ patient_name: name, patient_phone: phone }).eq("id", id);
  } catch {
    // display-only denormalization — never fail the booking over it
  }
}

export async function cancelAppointment(id: string, reason?: string): Promise<void> {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase.rpc("cancel_appointment_safe", {
    p_id: id,
    p_user_id: userId,
    p_reason: reason,
    p_skip_cutoff: false,
  });
  if (error) throw error;
  unwrapRpc(data, "CANCEL_FAILED");
}

export async function rescheduleAppointment(id: string, slot: { date: string; start: string; end: string }): Promise<void> {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase.rpc("reschedule_appointment_atomic", {
    p_id: id,
    p_user_id: userId,
    p_new_date: slot.date,
    p_new_start: slot.start,
    p_new_end: slot.end,
    p_skip_cutoff: false,
  });
  if (error) throw error;
  unwrapRpc(data, "RESCHEDULE_FAILED");
}

export async function checkInAppointment(id: string): Promise<void> {
  const profile = await getMyProfile();
  const { data, error } = await supabase.rpc("checkin_my_appointment", {
    p_id: id,
    p_patient_name: profile.account?.full_name ?? "",
    p_patient_phone: profile.account?.phone ?? "",
  });
  if (error) throw error;
  unwrapRpc(data, "CHECKIN_FAILED");
}

/** BP-3 — void a still-pending, unpaid hold (frees the slot). Never throws. */
export async function releaseUnpaidHold(appointmentId: string): Promise<void> {
  try {
    await supabase.rpc("release_unpaid_hold", { p_appointment_id: appointmentId });
  } catch {
    // Non-fatal — the 10-minute TTL sweeper is the backstop.
  }
}

/* -------------------------------- reviews -------------------------------- */

export interface DoctorReviewRow {
  id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
}

export async function listDoctorReviews(doctorId: string, limit = 50) {
  const [{ data: doc }, { data: rows, error }] = await Promise.all([
    supabase.from("doctors").select("avg_rating, review_count").eq("id", doctorId).maybeSingle(),
    supabase
      .from("reviews")
      .select("id, rating, review_text, created_at")
      .eq("target_type", "doctor")
      .eq("target_id", doctorId)
      .eq("is_visible", true)
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);
  if (error) throw error;
  const list = (rows ?? []) as DoctorReviewRow[];
  const docRow = doc as { avg_rating?: number | string | null; review_count?: number | null } | null;
  const average = docRow?.avg_rating != null ? Number(docRow.avg_rating) : list.length ? list.reduce((s, r) => s + r.rating, 0) / list.length : 0;
  const total = docRow?.review_count != null ? Number(docRow.review_count) : list.length;
  const distribution = [5, 4, 3, 2, 1].map((stars) => ({ stars, count: list.filter((r) => Math.round(r.rating) === stars).length }));
  return { summary: { average, total, distribution }, reviews: list };
}

/** Eligibility (own completed appointment) is enforced by RLS — we surface its verdicts. */
export async function createDoctorReview(input: { doctorId: string; rating: number; comment?: string; appointmentId?: string | null }): Promise<void> {
  const patientId = await getMyPatientProfileId();
  const { error } = await supabase.from("reviews").insert({
    patient_id: patientId,
    target_type: "doctor",
    target_id: input.doctorId,
    rating: input.rating,
    review_text: norm(input.comment ?? "") || null,
    appointment_id: input.appointmentId ?? null,
  });
  if (error) {
    const code = (error as { code?: string }).code ?? "";
    if (code === "23505") throw new Error("ALREADY_REVIEWED");
    if (code === "42501") throw new Error("REVIEW_NOT_ALLOWED");
    throw error;
  }
}

/* ----------------------------- notifications ----------------------------- */

export interface NotificationRow {
  id: string;
  type: string | null;
  title: string | null;
  body: string | null;
  is_read: boolean | null;
  created_at: string | null;
  data: Record<string, unknown> | null;
}

export async function listMyNotifications(limit = 50): Promise<NotificationRow[]> {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from("in_app_notifications")
    .select("id, type, title, body, is_read, created_at, data")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as NotificationRow[];
}

export async function markAllNotificationsRead(): Promise<void> {
  const userId = await getCurrentUserId();
  const { error } = await supabase.from("in_app_notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
  if (error) throw error;
}
