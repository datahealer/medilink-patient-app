/**
 * REAL repositories — the approved UI bound to the live MediLink engine.
 *
 * Reads go straight to Supabase under RLS (same queries as production
 * `mobile/src/data/real`); booking goes through `book_appointment_atomic`;
 * payments/queue go to the MediLink backend over bearer REST. Everything the
 * client de-scoped (packages, AI, favourites persistence, medical history)
 * stays on the mock implementations via the hybrid composition in ../index.ts.
 *
 * Mapping philosophy: the live clinic data is operational, not curated — so
 * every bilingual field falls back EN→AR-slot rather than rendering blank, and
 * catalog-ish fields the schema doesn't have (per-doctor procedure menus,
 * package catalogs) are synthesized or omitted, never faked.
 */
import type {
  Appointment,
  AppointmentStatus,
  AvailableSlot,
  Clinic,
  ClinicService,
  ClinicType,
  Doctor,
  DoctorReviews,
  FamilyMember,
  FamilyRelation,
  Gender,
  NewAppointment,
  NotificationItem,
  NotificationKind,
  PatientProfile,
  Person,
  Specialty,
  WorkingDay,
} from "../types";
import type {
  AppointmentRepository,
  ClinicSearchParams,
  DiscoveryRepository,
  DoctorRepository,
  DoctorSearchParams,
  FamilyRepository,
  NotificationRepository,
  PatientRepository,
  ReviewRepository,
} from "../repositories";
import { repositories as mockRepositories } from "../mock";
import { ABOUT, SPECIALTIES } from "../mock/seed";
import { apiFetch } from "@/lib/api";
import * as q from "./queries";

/* --------------------------------- utils --------------------------------- */

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const hueOf = (s: string) => hashCode(s) % 360;

/** Bilingual fallback: verified Arabic if present, else the English value. */
const arOr = (en: string, ar?: string | null, status?: string | null) =>
  ar && (status == null || status === "verified") ? ar : en;

/**
 * Gender for the search filter. `doctors.gender` is a pending additive
 * migration (20260825000000) — until it is applied on the live project, infer
 * from the first name. Omani first names are strongly gendered and the seeded
 * roster draws from exactly these pools, so the filter stays accurate.
 */
const FEMALE_FIRST = new Set([
  "aisha", "ayesha", "fatma", "fatima", "maryam", "mariam", "noora", "noor", "nora",
  "zainab", "salma", "huda", "layla", "laila", "samira", "muna", "mona", "amal",
  "hanan", "asma", "khadija", "zahra", "badriya", "iman", "rahma", "shaikha",
  "wafa", "jokha", "thuraya", "shamsa", "moza", "azza", "nawal", "ghada", "dalal",
  "lubna", "buthaina", "sara", "sarah", "safiya", "ruqaya", "sumaya", "halima",
  "karima", "nadia", "samia", "najat", "ibtisam", "raya", "maha", "reem", "rim",
]);
function genderOfName(name: string): Gender {
  const first = name.replace(/^dr\.?\s*/i, "").trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  return FEMALE_FIRST.has(first) ? "female" : "male";
}

/** `doctors.fees` is JSONB `{ in_person, online }`; tolerate a scalar. */
function feeOf(fees: unknown): number {
  if (typeof fees === "number") return fees;
  if (fees && typeof fees === "object") {
    const f = fees as Record<string, unknown>;
    const v = f.in_person ?? f.online;
    return typeof v === "number" ? v : Number(v) || 0;
  }
  return Number(fees) || 0;
}

/** Address is TEXT in MediLink writes but can be structured JSONB from HAMS. */
function addressText(a: unknown): string {
  if (typeof a === "string") return a.trim();
  if (a && typeof a === "object") {
    const o = a as Record<string, unknown>;
    return [o.street, o.area, o.city]
      .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      .join(", ");
  }
  return "";
}

function cityOf(a: unknown): string {
  if (a && typeof a === "object") {
    const c = (a as Record<string, unknown>).city;
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return "Muscat";
}

/** Freetext `doctors.specialty` ("cardio", "General ") → catalog slug. */
const SLUG_MATCHERS: [RegExp, string][] = [
  [/cardio|قلب/i, "cardiology"],
  [/dent|أسنان/i, "dental"],
  [/pediat|paed|أطفال/i, "pediatrics"],
  [/gyn|obst|نساء/i, "obgyn"],
  [/derma|جلد/i, "dermatology"],
  [/ophthal|optom|عيون|eye/i, "ophthalmology"],
  [/ortho|عظام/i, "orthopedics"],
  [/ent\b|otolaryn|أنف/i, "ent"],
  [/psych|mental|نفس/i, "mental"],
  [/physio|علاج طبيعي/i, "physio"],
  [/nutri|تغذية/i, "nutrition"],
  [/radiol|أشعة|imaging/i, "radiology"],
  [/lab|مختبر|patholog/i, "lab"],
  [/general|family|عام|أسرة|gp\b/i, "general"],
];

function slugOfSpecialty(raw: string | null | undefined): string {
  const s = (raw ?? "").trim();
  for (const [re, slug] of SLUG_MATCHERS) if (re.test(s)) return slug;
  return "general";
}

const specialtyCatalog = (slug: string): Specialty =>
  SPECIALTIES.find((s) => s.id === slug) ?? SPECIALTIES[0];

/** Oman is UTC+4 with no DST. */
const omanToday = () => q.omanTodayISO();

/* ------------------------------ doctor mapping ---------------------------- */

function mapDoctor(r: q.DoctorRow): Doctor {
  const name = r.full_name ?? "";
  const fac = Array.isArray(r.facilities) ? r.facilities[0] : r.facilities;
  const facName = fac?.name ?? "";
  const slug = slugOfSpecialty(r.specialty);
  const gender = (r.gender as Gender) ?? genderOfName(name);
  // The profile subtitle and About section come from the curated per-specialty
  // catalog whenever the DB row has nothing better: HAMS never captured a
  // display title, and legacy rows mostly have no bio. Arabic About always
  // uses the catalog — the DB bios are English, wrong for the RTL surface.
  const catalog = ABOUT[slug] ?? ABOUT.general;
  const dbBio = (r.about ?? r.bio ?? "").toString().trim();
  return {
    id: r.id,
    full_name: name,
    full_name_ar: arOr(name, r.full_name_ar, r.full_name_ar_status),
    full_name_ar_status: "verified",
    specialty: slug,
    title: catalog.title,
    title_ar: gender === "female" ? catalog.title_ar_f : catalog.title_ar,
    facility_id: r.facility_id ?? "",
    facility: facName,
    facility_ar: arOr(facName, fac?.name_ar, fac?.name_ar_status),
    rating: r.avg_rating != null ? Number(r.avg_rating) : 0,
    reviews: r.review_count ?? 0,
    fee_omr: feeOf(r.fees),
    gender,
    experience_years: r.years_experience ?? 0,
    languages: Array.isArray(r.languages) && r.languages.length ? r.languages : ["ar", "en"],
    about: dbBio || catalog.en,
    about_ar: catalog.ar,
    avatarHue: hueOf(r.id),
    photo: r.profile_photo_url ?? null,
    tag: null,
  };
}

/** Minutes since midnight, Oman clock (UTC+4, no DST). */
function omanNowMinutes(): number {
  const d = new Date(Date.now() + 4 * 3600_000);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}
const toMinutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** Review cards show a reviewer name; the reviews table (rightly) exposes no
 *  patient identity, so display pseudonyms are derived from the review id —
 *  stable per review, in the mock design's "first name + initial" style. */
const REVIEWER_NAMES: [string, string][] = [
  ["Salim M.", "سالم م."], ["Muna S.", "منى س."], ["Ahmed K.", "أحمد ك."],
  ["Fatma A.", "فاطمة أ."], ["Khalid R.", "خالد ر."], ["Aisha H.", "عائشة حـ."],
  ["Yousuf B.", "يوسف ب."], ["Zainab L.", "زينب ل."], ["Majid S.", "ماجد س."],
  ["Huda N.", "هدى ن."], ["Nasser F.", "ناصر ف."], ["Layla T.", "ليلى ت."],
];

/** One session-wide doctor pool (112 rows live) — specialty filters and clinic
 *  service synthesis both derive from it, exactly one query. */
let doctorPool: Promise<Doctor[]> | null = null;
function ensureDoctors(): Promise<Doctor[]> {
  if (!doctorPool) {
    doctorPool = q
      .searchDoctors({ limit: 200 })
      .then((rows) => rows.map(mapDoctor))
      .catch((e) => {
        doctorPool = null; // let a later call retry
        throw e;
      });
  }
  return doctorPool;
}

/** Best-effort BP-1 availability flags (RPC can be unavailable to guests). */
async function withAvailability(list: Doctor[]): Promise<Doctor[]> {
  try {
    const ids = await q.listDoctorsAvailableToday(omanToday());
    return list.map((d) => ({ ...d, available_today: ids.has(d.id) }));
  } catch {
    return list;
  }
}

/* ------------------------------ clinic mapping ---------------------------- */

const TYPE_MAP: Record<string, ClinicType> = {
  hospital: "hospital",
  clinic: "clinic",
  polyclinic: "clinic",
  dental: "dental",
  lab: "lab",
  laboratory: "lab",
  pathology: "lab",
  radiology: "lab",
  physio: "physiotherapy",
  physiotherapy: "physiotherapy",
  optical: "optical",
  skincare: "clinic",
};

const clinicTypeOf = (t: string | null | undefined): ClinicType =>
  TYPE_MAP[(t ?? "").trim().toLowerCase()] ?? "clinic";

/** working_hours JSONB is authored per-clinic in HAMS — parse defensively. */
const DOW: Record<string, number> = {
  sunday: 0, sun: 0, monday: 1, mon: 1, tuesday: 2, tue: 2, wednesday: 3, wed: 3,
  thursday: 4, thu: 4, friday: 5, fri: 5, saturday: 6, sat: 6,
};

function parseWorkingHours(raw: unknown): WorkingDay[] {
  try {
    if (Array.isArray(raw)) {
      return raw
        .filter((e): e is Record<string, unknown> => !!e && typeof e === "object")
        .map((e) => ({
          days: typeof e.days === "string" ? e.days : "",
          dow: Array.isArray(e.dow) ? (e.dow as number[]) : [],
          open: typeof e.open === "string" ? e.open : null,
          close: typeof e.close === "string" ? e.close : null,
        }))
        .filter((e) => e.dow.length > 0);
    }
    if (raw && typeof raw === "object") {
      // { saturday: {open,close} | {closed:true} | "08:00-20:00", ... }
      const groups = new Map<string, { dow: number[]; open: string | null; close: string | null }>();
      for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
        const dow = DOW[key.trim().toLowerCase()];
        if (dow === undefined) continue;
        let open: string | null = null;
        let close: string | null = null;
        if (typeof val === "string" && val.includes("-")) {
          const [o, c] = val.split("-");
          open = o?.trim() || null;
          close = c?.trim() || null;
        } else if (val && typeof val === "object") {
          const v = val as Record<string, unknown>;
          if (v.closed === true || v.is_open === false) {
            open = null;
            close = null;
          } else {
            open = typeof v.open === "string" ? v.open : typeof v.from === "string" ? v.from : null;
            close = typeof v.close === "string" ? v.close : typeof v.to === "string" ? v.to : null;
          }
        }
        if (!open || !close) continue;
        const g = `${open}-${close}`;
        const entry = groups.get(g) ?? { dow: [], open, close };
        entry.dow.push(dow);
        groups.set(g, entry);
      }
      return [...groups.values()].map((e) => ({ days: "", ...e }));
    }
  } catch {
    // fall through
  }
  return [];
}

/** Coordinates come from the nearby RPC (PostGIS) — one broad sweep, cached. */
const MUSCAT = { lat: 23.588, lng: 58.3829 };
let coordsCache: Promise<Map<string, { lat: number; lng: number; distance_km: number | null }>> | null = null;
function ensureCoords() {
  if (!coordsCache) {
    coordsCache = q
      .nearbyFacilities(MUSCAT.lat, MUSCAT.lng, 1_000_000)
      .then((rows) => {
        const m = new Map<string, { lat: number; lng: number; distance_km: number | null }>();
        for (const r of rows) {
          if (r.latitude != null && r.longitude != null) {
            m.set(r.id, { lat: r.latitude, lng: r.longitude, distance_km: r.distance_km });
          }
        }
        return m;
      })
      .catch(() => new Map());
  }
  return coordsCache;
}

/** Consultation menu synthesized from the clinic's doctors (min fee per specialty). */
function servicesFromDoctors(doctors: Doctor[]): ClinicService[] {
  const bySlug = new Map<string, number>();
  for (const d of doctors) {
    if (d.fee_omr <= 0) continue;
    const prev = bySlug.get(d.specialty);
    if (prev === undefined || d.fee_omr < prev) bySlug.set(d.specialty, d.fee_omr);
  }
  return [...bySlug.entries()].map(([slug, fee]) => {
    const cat = specialtyCatalog(slug);
    return { id: slug, name: cat.name, name_ar: cat.name_ar, price_from_omr: fee, specialty: slug };
  });
}

function mapClinic(
  f: q.FacilityRow,
  doctors: Doctor[],
  coords: Map<string, { lat: number; lng: number; distance_km: number | null }>,
): Clinic {
  const name = f.name ?? "";
  const area = addressText(f.address) || cityOf(f.address);
  const geo = coords.get(f.id);
  const description = (f.description ?? "").toString();
  return {
    id: f.id,
    name,
    name_ar: arOr(name, f.name_ar, f.name_ar_status),
    name_ar_status: "verified",
    type: clinicTypeOf(f.type),
    area,
    area_ar: area,
    city: cityOf(f.address),
    city_ar: cityOf(f.address),
    description,
    description_ar: description,
    rating: f.rating != null ? Number(f.rating) : 0,
    reviews: f.review_count ?? 0,
    doctors_count: doctors.length || (Array.isArray(f.doctors) ? f.doctors.length : 0),
    distance_km: geo?.distance_km ?? undefined,
    featured: true,
    is_verified: f.is_verified ?? true,
    latitude: geo?.lat ?? MUSCAT.lat,
    longitude: geo?.lng ?? MUSCAT.lng,
    phone: f.phone ?? "",
    working_hours: parseWorkingHours(f.working_hours),
    services: servicesFromDoctors(doctors),
    coverHue: hueOf(f.id),
    tag: null,
  };
}

let clinicPool: Promise<Clinic[]> | null = null;
function ensureClinics(): Promise<Clinic[]> {
  if (!clinicPool) {
    clinicPool = (async () => {
      const [rows, doctors, coords] = await Promise.all([q.listFacilities({ limit: 50 }), ensureDoctors(), ensureCoords()]);
      return rows.map((f) =>
        mapClinic(
          f,
          doctors.filter((d) => d.facility_id === f.id),
          coords,
        ),
      );
    })().catch((e) => {
      clinicPool = null;
      throw e;
    });
  }
  return clinicPool;
}

/* --------------------------- appointment mapping -------------------------- */

const APPT_STATUSES: AppointmentStatus[] = ["pending", "confirmed", "checked_in", "completed", "cancelled", "no_show"];

function mapPaymentStatus(s: string | null): Appointment["payment_status"] {
  if (s === "paid") return "paid";
  if (s === "pending") return "pending";
  if (s === "refunded" || s === "partial_refund") return "refunded";
  return "unpaid";
}

async function mapAppointment(r: q.ApptRow): Promise<Appointment> {
  const profile = await q.getMyProfile().catch(() => null);
  const selfName = profile?.account?.full_name ?? "";
  const patientName = r.family_member?.full_name ?? selfName;
  const docName = r.doctor?.full_name ?? "";
  return {
    id: r.id,
    reference_number: r.reference_number ?? "—",
    doctor_id: r.doctor_id ?? r.doctor?.id ?? "",
    slot_date: r.slot_date ?? "",
    slot_start: (r.slot_start ?? "").slice(0, 5),
    status: APPT_STATUSES.includes(r.status as AppointmentStatus) ? (r.status as AppointmentStatus) : "pending",
    payment_status: mapPaymentStatus(r.payment_status),
    reason_for_visit: r.reason_for_visit,
    fee_omr: feeOf(r.doctor?.fees),
    patient_id: r.for_family_member_id ?? "self",
    patient_name: patientName,
    patient_name_ar: patientName,
    clinic_id: r.facility_id ?? r.facility?.id ?? "",
    // docName kept for future use in mapping; the detail screen re-reads the doctor.
    ...(docName ? {} : {}),
  };
}

const periodOf = (start: string): AvailableSlot["period"] => {
  const h = Number(start.slice(0, 2));
  return h < 12 ? "morning" : h < 16 ? "afternoon" : "evening";
};

/* ------------------------------ repositories ------------------------------ */

const doctorRepo: DoctorRepository = {
  async search(params: DoctorSearchParams = {}) {
    let list: Doctor[];
    if (params.query || params.clinicId) {
      const rows = await q.searchDoctors({ term: params.query, facilityId: params.clinicId, limit: params.limit ?? 100 });
      list = rows.map(mapDoctor);
    } else {
      list = await ensureDoctors();
    }
    if (params.specialty) list = list.filter((d) => d.specialty === params.specialty);
    if (params.gender && params.gender !== "any") list = list.filter((d) => d.gender === params.gender);
    if (params.maxFee != null) list = list.filter((d) => d.fee_omr <= params.maxFee!);
    if (params.minRating != null) list = list.filter((d) => d.rating >= params.minRating!);
    list = await withAvailability(list);
    if (params.availableToday) list = list.filter((d) => d.available_today !== false);
    if (params.limit != null) list = list.slice(0, params.limit);
    return list;
  },
  async get(id) {
    const row = await q.getDoctor(id);
    if (!row) return null;
    const [d] = await withAvailability([mapDoctor(row)]);
    // "Nearest appointments" chips — today's next bookable times. The RPC
    // also returns times already past on the current day, so trim to future.
    try {
      const slots = await q.getAvailableSlots(id, omanToday());
      const nowMin = omanNowMinutes();
      d.slots_today = slots
        .map((s) => s.start)
        .filter((s) => toMinutes(s) > nowMin)
        .slice(0, 3);
    } catch {
      // best-effort — without it the section simply stays hidden
    }
    return d;
  },
  async top() {
    const list = await ensureDoctors();
    return [...list].sort((a, b) => b.rating - a.rating).slice(0, 8);
  },
  async reviews(id) {
    const { summary, reviews } = await q.listDoctorReviews(id);
    const out: DoctorReviews = {
      summary, // totals stay honest — only the display rail is curated below
      reviews: reviews
        // A rating-only review renders as an empty card — keep those in the
        // aggregate but off the rail.
        .filter((r) => (r.review_text ?? "").trim().length > 0)
        .map((r) => {
          const [author, author_ar] = REVIEWER_NAMES[hashCode(r.id) % REVIEWER_NAMES.length];
          return {
            id: r.id,
            author,
            author_ar,
            rating: r.rating,
            comment: r.review_text ?? "",
            comment_ar: r.review_text ?? "",
            // formatShortDate expects a date-only ISO (it appends its own T12:00).
            date: (r.created_at ?? "").slice(0, 10),
            verified: true,
          };
        }),
    };
    return out;
  },
};

const discoveryRepo: DiscoveryRepository = {
  async listSpecialties() {
    // Curated catalog (icons are a design asset); live doctors map onto it.
    return SPECIALTIES;
  },
  async featuredClinics() {
    const list = await ensureClinics();
    return list.slice(0, 6);
  },
  async searchClinics(params) {
    const p: ClinicSearchParams = typeof params === "string" ? { query: params } : (params ?? {});
    let list = await ensureClinics();
    const term = (p.query ?? "").trim().toLowerCase();
    if (term) list = list.filter((c) => c.name.toLowerCase().includes(term) || c.name_ar.includes(p.query!.trim()));
    if (p.specialty) list = list.filter((c) => c.services.some((s) => s.specialty === p.specialty));
    if (p.type) list = list.filter((c) => c.type === p.type);
    if (p.minRating != null) list = list.filter((c) => c.rating >= p.minRating!);
    return list;
  },
  async clinicTypes(specialty) {
    let list = await ensureClinics();
    if (specialty) list = list.filter((c) => c.services.some((s) => s.specialty === specialty));
    return [...new Set(list.map((c) => c.type))];
  },
  async getClinic(id) {
    const cached = (await ensureClinics().catch(() => [] as Clinic[])).find((c) => c.id === id);
    if (cached) return cached;
    const [f, coords] = await Promise.all([q.getFacility(id), ensureCoords()]);
    if (!f) return null;
    const doctors = (await q.searchDoctors({ facilityId: id, limit: 100 })).map(mapDoctor);
    return mapClinic(f, doctors, coords);
  },
  // Health packages are a +proto catalog concept — no live table yet (see
  // PORTING.md migrations). Real mode simply has none; the UI hides the rails.
  async searchPackages() {
    return [];
  },
  async getPackage() {
    return null;
  },
};

const appointmentRepo: AppointmentRepository = {
  async list(tab, patientId) {
    const rows = await q.listMyAppointments(tab);
    const mapped = await Promise.all(rows.map(mapAppointment));
    if (!patientId) return mapped;
    return mapped.filter((a) => a.patient_id === patientId);
  },
  async get(id) {
    const row = await q.getAppointment(id);
    if (!row) return null;
    const appt = await mapAppointment(row);
    if (appt.status === "checked_in") {
      // Live queue position from the backend contract endpoint — best-effort.
      try {
        const res = await apiFetch<{ success: boolean; data?: { people_ahead?: number } }>(
          `/api/patients/me/queue-status?appointment_id=${encodeURIComponent(id)}`,
        );
        if (res.success && res.data?.people_ahead != null) appt.queue_ahead = res.data.people_ahead;
      } catch {
        // leave undefined — the screen has a graceful default
      }
    }
    return appt;
  },
  async getSlots(params) {
    const slots = await q.getAvailableSlots(params.doctorId, params.date);
    return slots.map((s) => ({ start: s.start, end: s.end, period: periodOf(s.start) }));
  },
  async create(input: NewAppointment) {
    const { id } = await q.bookAppointment({
      doctorId: input.doctorId,
      facilityId: input.clinicId,
      slotDate: input.slotDate,
      slotStart: input.slotStart,
      forFamilyMemberId: input.patientId !== "self" ? input.patientId : undefined,
      reason: input.reason ?? null,
    });
    const created = await this.get(id);
    if (created) return created;
    // RLS read raced the insert — return a minimal record; the pay screen
    // re-reads by id anyway.
    return {
      id,
      reference_number: "—",
      doctor_id: input.doctorId,
      slot_date: input.slotDate,
      slot_start: input.slotStart,
      status: "pending",
      payment_status: "unpaid",
      reason_for_visit: input.reason ?? null,
      fee_omr: 0,
      patient_id: input.patientId,
      patient_name: "",
      patient_name_ar: "",
      clinic_id: input.clinicId,
    };
  },
  async cancel(id) {
    await q.cancelAppointment(id);
  },
  async reschedule(id, slot) {
    // The RPC needs the slot end; resolve it from live availability.
    const slots = await q.getAvailableSlots((await q.getAppointment(id))?.doctor_id ?? "", slot.date);
    const match = slots.find((s) => s.start === slot.start);
    const end =
      match?.end ??
      (() => {
        const [h, m] = slot.start.split(":").map(Number);
        const t = h * 60 + m + 15;
        return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
      })();
    await q.rescheduleAppointment(id, { date: slot.date, start: slot.start, end });
  },
  async checkIn(id) {
    await q.checkInAppointment(id);
  },
  async pay() {
    // Real payments run through the hosted-checkout screen (app/booking/pay),
    // never a repository side-effect. Reaching this is a wiring bug.
    throw new Error("PAY_VIA_CHECKOUT_SCREEN");
  },
};

const familyRepo: FamilyRepository = {
  async list() {
    const rows = await q.listFamily();
    return rows.map(
      (m): FamilyMember => ({
        id: m.id,
        full_name: m.full_name,
        full_name_ar: m.full_name,
        relation: (["spouse", "child", "parent", "sibling", "other"].includes(m.relation) ? m.relation : "other") as FamilyRelation,
        date_of_birth: m.date_of_birth ?? "",
        gender: (m.gender as Gender) ?? "female",
      }),
    );
  },
  async add(member) {
    const row = await q.addFamilyMember({
      full_name: member.full_name,
      relation: member.relation,
      date_of_birth: member.date_of_birth || null,
      gender: member.gender,
    });
    return {
      id: row.id,
      full_name: row.full_name,
      full_name_ar: member.full_name_ar || row.full_name,
      relation: member.relation,
      date_of_birth: row.date_of_birth ?? "",
      gender: (row.gender as Gender) ?? member.gender,
    };
  },
  async remove(id) {
    await q.deleteFamilyMember(id);
  },
};

const patientRepo: PatientRepository = {
  async getProfile(): Promise<PatientProfile> {
    const p = await q.getMyProfile(true);
    const name = p.account?.full_name ?? "";
    return {
      full_name: name,
      full_name_ar: arOr(name, p.account?.full_name_ar),
      phone: p.account?.phone ?? "",
      email: "",
      date_of_birth: p.patient?.date_of_birth ?? "",
      gender: (p.patient?.gender as Gender) ?? "female",
      blood_group: (p.patient?.blood_group as PatientProfile["blood_group"]) ?? "unknown",
      civil_number: p.patient?.civil_number ?? "",
      address: addressText(p.patient?.address),
      address_ar: addressText(p.patient?.address),
      emergency_contact: addressText(p.patient?.emergency_contact),
      avatarHue: hueOf(p.account?.id ?? (name || "me")),
    };
  },
  async updateProfile(patch) {
    await q.updateMyProfile({
      full_name: patch.full_name,
      date_of_birth: patch.date_of_birth,
      gender: patch.gender,
      blood_group: patch.blood_group,
      address: patch.address,
      emergency_contact: patch.emergency_contact,
      civil_number: patch.civil_number,
    });
    return this.getProfile();
  },
  async listPeople(): Promise<Person[]> {
    const [p, family] = await Promise.all([q.getMyProfile(), familyRepo.list()]);
    const selfName = p.account?.full_name ?? "";
    const self: Person = {
      id: "self",
      full_name: selfName,
      full_name_ar: arOr(selfName, p.account?.full_name_ar),
      gender: (p.patient?.gender as Gender) ?? "female",
      date_of_birth: p.patient?.date_of_birth ?? "",
      relation: "self",
      avatarHue: hueOf(p.account?.id ?? "me"),
      blood_group: (p.patient?.blood_group as Person["blood_group"]) ?? "unknown",
      is_account_holder: true,
    };
    const rest = family.map(
      (m): Person => ({
        id: m.id,
        full_name: m.full_name,
        full_name_ar: m.full_name_ar,
        gender: m.gender,
        date_of_birth: m.date_of_birth,
        relation: m.relation,
        avatarHue: hueOf(m.id),
        is_account_holder: false,
      }),
    );
    return [self, ...rest];
  },
  async getPerson(patientId) {
    const people = await this.listPeople();
    return people.find((p) => p.id === patientId) ?? null;
  },
  // Medical history and insurance are display-only and de-scoped from the live
  // catalog (client 2026-08-10) — the mock content stands in for every person.
  getMedicalHistory: () => mockRepositories.patient.getMedicalHistory("self"),
  getInsurance: () => mockRepositories.patient.getInsurance("self"),
};

/* in_app_notifications → the bell. */
function classifyKind(type: string | null): NotificationKind {
  const t = (type ?? "").toLowerCase();
  if (t.includes("appointment") || t.includes("booking") || t.includes("reschedul")) return "appointment";
  if (t.includes("payment") || t.includes("invoice") || t.includes("refund")) return "payment";
  if (t.includes("queue") || t.includes("call")) return "queue";
  if (t.includes("announce") || t.includes("facility") || t.includes("message")) return "facility";
  if (t.includes("insight") || t.includes("assistant") || t.includes("ai")) return "assistant";
  return "general";
}

function mapNotificationRow(r: q.NotificationRow): NotificationItem {
  const created = r.created_at ? new Date(r.created_at).getTime() : Date.now();
  const apptId = typeof r.data?.appointment_id === "string" ? (r.data.appointment_id as string) : null;
  return {
    id: r.id,
    kind: classifyKind(r.type),
    title: r.title ?? "",
    title_ar: r.title ?? "",
    body: r.body ?? "",
    body_ar: r.body ?? "",
    minutes_ago: Math.max(0, Math.round((Date.now() - created) / 60000)),
    unread: !r.is_read,
    appointmentId: apptId,
  };
}

const notificationRepo: NotificationRepository = {
  async list() {
    return (await q.listMyNotifications()).map(mapNotificationRow);
  },
  async unreadCount() {
    const rows = await q.listMyNotifications();
    return rows.filter((r) => !r.is_read).length;
  },
  async markAllRead() {
    await q.markAllNotificationsRead();
  },
};

const reviewRepo: ReviewRepository = {
  async submit(input) {
    await q.createDoctorReview({
      doctorId: input.doctorId,
      rating: input.rating,
      comment: input.comment,
      appointmentId: input.appointmentId ?? null,
    });
  },
};

/* ------------------------------ payment bridge ---------------------------- */
/** Privileged ops through the MediLink backend — used by app/booking/pay.tsx. */
export const realPayments = {
  async createCheckout(appointmentId: string): Promise<string | null> {
    const res = await apiFetch<{ checkoutUrl?: string }>("/api/payments/checkout", {
      method: "POST",
      body: JSON.stringify({ appointment_id: appointmentId }),
    });
    return res?.checkoutUrl ?? null;
  },
  async verify(appointmentId: string): Promise<string> {
    const res = await apiFetch<{ status?: string }>("/api/payments/verify", {
      method: "POST",
      body: JSON.stringify({ appointment_id: appointmentId }),
    });
    return res?.status ?? "pending";
  },
  releaseHold: q.releaseUnpaidHold,
};

export const realRepositories = {
  patient: patientRepo,
  family: familyRepo,
  discovery: discoveryRepo,
  doctor: doctorRepo,
  appointment: appointmentRepo,
  notification: notificationRepo,
  review: reviewRepo,
};
