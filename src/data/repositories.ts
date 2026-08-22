import type {
  AiSuggestion,
  Appointment,
  AvailableSlot,
  Clinic,
  Doctor,
  DoctorReviews,
  FamilyMember,
  Favourite,
  FavouriteKind,
  HealthPackage,
  InsuranceCard,
  MedicalHistory,
  NewAppointment,
  NotificationItem,
  PatientProfile,
  Person,
  Specialty,
} from "./types";

/**
 * Repository interfaces — a faithful subset of production
 * `mobile/src/data/repositories.ts` (same names, same verbs), so the approved
 * UI rebinds to the real Supabase-backed implementations during the port.
 * Labs / prescriptions / documents / video consultations are out of scope.
 */
export interface DoctorSearchParams {
  query?: string;
  specialty?: string;
  gender?: "male" | "female" | "any";
  maxFee?: number;
  minRating?: number;
  availableToday?: boolean;
  clinicId?: string;
  limit?: number;
}

export interface PatientRepository {
  /** The account holder's own profile. */
  getProfile(): Promise<PatientProfile>;
  updateProfile(patch: Partial<PatientProfile>): Promise<PatientProfile>;
  /** Account holder + family members — the profile switcher's data source. */
  listPeople(): Promise<Person[]>;
  getPerson(patientId: string): Promise<Person | null>;
  /** Records are per person: "self" or a family member id. */
  getMedicalHistory(patientId?: string): Promise<MedicalHistory>;
  /** Display/storage only — no claims execution. Members are dependents on the same policy. */
  getInsurance(patientId?: string): Promise<InsuranceCard>;
}

export interface FamilyRepository {
  list(): Promise<FamilyMember[]>;
  add(member: Omit<FamilyMember, "id">): Promise<FamilyMember>;
  remove(id: string): Promise<void>;
}

export interface ClinicSearchParams {
  query?: string;
  /** Clinics that offer this specialty — services and doctors are both considered. */
  specialty?: string;
  type?: Clinic["type"] | null;
  maxDistanceKm?: number;
  minRating?: number;
  openNow?: boolean;
}

export interface PackageSearchParams {
  query?: string;
  maxPrice?: number;
  minTests?: number;
  discountedOnly?: boolean;
  clinicId?: string;
  sort?: "popular" | "priceAsc" | "priceDesc" | "tests";
}

export interface DiscoveryRepository {
  listSpecialties(): Promise<Specialty[]>;
  featuredClinics(): Promise<Clinic[]>;
  /** A bare string stays supported (term-only search) for existing call sites. */
  searchClinics(params?: string | ClinicSearchParams): Promise<Clinic[]>;
  /**
   * Facet: facility types that actually have clinics offering this specialty.
   * The filter chips are built from this, so a locked specialty can't offer
   * "Dental" when no dental clinic does pediatrics.
   */
  clinicTypes(specialty?: string): Promise<Clinic["type"][]>;
  getClinic(id: string): Promise<Clinic | null>;
  searchPackages(params?: string | PackageSearchParams): Promise<HealthPackage[]>;
  getPackage(id: string): Promise<HealthPackage | null>;
}

export interface DoctorRepository {
  search(params?: DoctorSearchParams): Promise<Doctor[]>;
  get(id: string): Promise<Doctor | null>;
  top(): Promise<Doctor[]>;
  reviews(id: string): Promise<DoctorReviews>;
}

export interface AppointmentRepository {
  /** Scoped to a person when patientId is given (profile switching). */
  list(tab: "upcoming" | "past", patientId?: string): Promise<Appointment[]>;
  get(id: string): Promise<Appointment | null>;
  getSlots(params: { doctorId: string; date: string }): Promise<AvailableSlot[]>;
  create(input: NewAppointment): Promise<Appointment>;
  cancel(id: string): Promise<void>;
  reschedule(id: string, slot: { date: string; start: string }): Promise<void>;
  checkIn(id: string): Promise<void>;
  pay(id: string): Promise<void>;
}

export interface NotificationRepository {
  list(): Promise<NotificationItem[]>;
  unreadCount(): Promise<number>;
  markAllRead(): Promise<void>;
}

export interface ReviewRepository {
  submit(input: { doctorId: string; rating: number; comment?: string }): Promise<void>;
}

export interface FavouriteRepository {
  list(): Promise<Favourite[]>;
  toggle(kind: FavouriteKind, refId: string): Promise<boolean>;
}

export interface AiRepository {
  ask(message: string): Promise<AiSuggestion>;
}

export interface Repositories {
  patient: PatientRepository;
  family: FamilyRepository;
  discovery: DiscoveryRepository;
  doctor: DoctorRepository;
  appointment: AppointmentRepository;
  notification: NotificationRepository;
  review: ReviewRepository;
  favourite: FavouriteRepository;
  ai: AiRepository;
}
