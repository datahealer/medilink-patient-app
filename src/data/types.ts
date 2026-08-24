/**
 * Domain models — field names deliberately match the production contract
 * (mobile/src/data/types.ts) so screens port unchanged. Fields marked
 * `// +proto` are additive bilingual/catalog extensions listed in docs/PORTING.md.
 *
 * Scope note (client decision 2026-08-10): NO video consultations, NO lab
 * results, NO prescriptions, NO documents. Insurance is display/storage only.
 */

export type Gender = "male" | "female";
export type BloodGroup = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | "unknown";
export type FamilyRelation = "spouse" | "child" | "parent" | "sibling" | "other";
export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "checked_in"
  | "completed"
  | "cancelled"
  | "no_show";
export type NotificationKind = "assistant" | "appointment" | "queue" | "payment" | "facility" | "general";
export type ClinicType = "hospital" | "clinic" | "dental" | "lab" | "physiotherapy" | "optical";
/** Canonical order for facility-type filters — the one place the UI and the facet agree on. */
export const CLINIC_TYPES: ClinicType[] = ["hospital", "clinic", "dental", "lab", "physiotherapy", "optical"];

/**
 * Promo/context tags — label resolved via i18n `tags.{key}` (bilingual).
 * "Featured" is deliberately NOT a tag: featured clinics get their own curated
 * home section instead of a badge that blends into the promo noise (client
 * feedback 2026-08-20).
 */
export type TagKey =
  | "topRated"
  | "new"
  | "nearest"
  | "booksFast"
  | "discount"
  | "lowestPrice"
  | "open247"
  | "popular"
  | "lastSlots";

export interface Tag {
  key: TagKey;
  n?: number; // e.g. discount percent or remaining slots
}

export interface Specialty {
  id: string; // stable slug (specialties.slug)
  icon: string; // Icon name in the custom set
  name: string;
  name_ar: string; // +proto (client i18n in prod)
}

export interface Doctor {
  id: string;
  full_name: string;
  full_name_ar: string;
  full_name_ar_status: "verified";
  specialty: string; // slug
  title?: string; // +proto e.g. "Consultant"
  title_ar?: string; // +proto
  facility_id: string;
  facility: string;
  facility_ar: string;
  rating: number;
  reviews: number;
  fee_omr: number;
  distance_km?: number;
  available_today?: boolean;
  gender: Gender;
  experience_years: number;
  languages: string[]; // ["ar","en","hi"]
  about: string;
  about_ar: string; // +proto
  slots_today?: string[];
  avatarHue: number; // +proto — deterministic branded avatar tint
  photo?: string | null; // real photo can drop in later
  tag?: Tag | null; // +proto — at most one promo tag
  /** Procedures beyond consultation — absent for consultation-only doctors. */
  services?: DoctorService[]; // +proto
}

export interface WorkingDay {
  days: string; // i18n-composed label is built client-side from dow indexes
  dow: number[]; // e.g. [0,1,2,3,4] Sun–Thu
  open: string | null; // "08:30"
  close: string | null; // "20:30"
}

export interface ClinicService {
  id: string;
  name: string;
  name_ar: string;
  price_from_omr: number;
  specialty?: string;
}

/**
 * A procedure a doctor performs beyond the consultation (wound dressing, ear
 * cleaning…). Shown collapsed ("+n more") on the doctor screen — consultation
 * stays the headline. // +proto
 */
export interface DoctorService {
  id: string;
  name: string;
  name_ar: string;
  price_omr: number;
}

export interface Clinic {
  id: string;
  name: string;
  name_ar: string;
  name_ar_status: "verified";
  type: ClinicType;
  area: string;
  area_ar: string; // +proto
  city: string;
  city_ar: string; // +proto
  description: string;
  description_ar: string; // +proto
  rating: number;
  reviews: number;
  doctors_count: number;
  /** Absent when the viewer's location is unknown (real mode without geo). */
  distance_km?: number;
  featured?: boolean;
  is_verified: boolean;
  latitude: number;
  longitude: number;
  phone: string;
  working_hours: WorkingDay[];
  services: ClinicService[];
  // accepted_insurances removed (client feedback 2026-08-20): the app supports
  // self-paying bookings only — no insurance concept anywhere in the catalog.
  coverHue: number; // +proto — branded cover gradient
  tag?: Tag | null; // +proto
}

export interface HealthPackage {
  id: string;
  name: string;
  name_ar: string;
  clinic_id: string;
  /** Specialty that performs it — booking routes to a doctor who actually does. */
  specialty: string; // +proto
  price_omr: number;
  old_price_omr?: number;
  tests_count: number;
  hours_to_results: number;
  popular?: boolean;
  includes: { en: string; ar: string }[];
  tag?: Tag | null; // +proto
}

export interface AvailableSlot {
  start: string; // "HH:MM" — raw value sent to booking
  period: "morning" | "afternoon" | "evening";
  /** "HH:MM" — present in real mode (the reschedule RPC needs the slot end). */
  end?: string;
}

export interface Appointment {
  id: string;
  reference_number: string;
  doctor_id: string;
  slot_date: string; // YYYY-MM-DD
  slot_start: string; // HH:MM
  status: AppointmentStatus;
  payment_status: "unpaid" | "pending" | "paid" | "refunded";
  reason_for_visit?: string | null;
  fee_omr: number;
  /** "self" (account holder) or a family member id — drives profile switching. */
  patient_id: string;
  patient_name: string; // display name (self or family member)
  patient_name_ar: string;
  clinic_id: string;
  queue_ahead?: number; // people ahead when checked in
}

export interface NewAppointment {
  doctorId: string;
  clinicId: string;
  slotDate: string;
  slotStart: string;
  patientId: string; // "self" | family id
  reason?: string | null;
  // Card is the only payment method (client decision 2026-08-10) —
  // production maps create → book_appointment_atomic + card checkout.
  consent: boolean; // PDPL consent — required
}

export type FavouriteKind = "doctor" | "clinic" | "package";

export interface Favourite {
  kind: FavouriteKind;
  refId: string;
}

export interface Review {
  id: string;
  author: string;
  author_ar: string;
  rating: number;
  comment: string;
  comment_ar: string;
  date: string; // ISO
  verified?: boolean;
}

export interface DoctorReviews {
  summary: { average: number; total: number; distribution: { stars: number; count: number }[] };
  reviews: Review[];
}

export interface FamilyMember {
  id: string;
  full_name: string;
  full_name_ar: string;
  relation: FamilyRelation;
  date_of_birth: string;
  gender: Gender;
}

/**
 * A switchable person under one account: the account holder ("self") or a
 * family member. Only the account holder can add members and switch profiles.
 */
export interface Person {
  id: string; // "self" | family member id
  full_name: string;
  full_name_ar: string;
  gender: Gender;
  date_of_birth: string;
  relation: FamilyRelation | "self";
  avatarHue: number;
  blood_group?: BloodGroup;
  is_account_holder: boolean;
}

export interface PatientProfile {
  full_name: string;
  full_name_ar: string;
  phone: string;
  email: string;
  date_of_birth: string;
  gender: Gender;
  blood_group: BloodGroup;
  civil_number: string;
  address: string;
  address_ar: string;
  emergency_contact: string;
  avatarHue: number;
}

export interface MedicalHistory {
  allergies: { en: string; ar: string }[];
  conditions: { en: string; ar: string }[];
  medications: string[]; // drug names stay Latin (Omani convention)
  surgeries: { en: string; ar: string }[];
  smoking_status: "never" | "former" | "current";
}

export interface InsuranceCard {
  provider: string;
  provider_ar: string;
  policy_number: string;
  member_id: string;
  expiry_date: string;
  coverage: string;
  coverage_ar: string;
  is_active: boolean;
}

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  title: string;
  title_ar: string; // in_app_notifications.title_ar exists in prod DB
  body: string;
  body_ar: string;
  minutes_ago: number;
  unread?: boolean;
  appointmentId?: string | null;
}

export interface AiSuggestion {
  reply: string;
  reply_ar: string;
  urgency: "self" | "doctor" | "emergency" | null;
  doctorIds: string[];
}
