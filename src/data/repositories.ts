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
  getProfile(): Promise<PatientProfile>;
  updateProfile(patch: Partial<PatientProfile>): Promise<PatientProfile>;
  getMedicalHistory(): Promise<MedicalHistory>;
  /** Display/storage only — no claims execution. */
  getInsurance(): Promise<InsuranceCard>;
}

export interface FamilyRepository {
  list(): Promise<FamilyMember[]>;
  add(member: Omit<FamilyMember, "id">): Promise<FamilyMember>;
  remove(id: string): Promise<void>;
}

export interface DiscoveryRepository {
  listSpecialties(): Promise<Specialty[]>;
  featuredClinics(): Promise<Clinic[]>;
  searchClinics(term: string): Promise<Clinic[]>;
  getClinic(id: string): Promise<Clinic | null>;
  searchPackages(term: string): Promise<HealthPackage[]>;
  getPackage(id: string): Promise<HealthPackage | null>;
}

export interface DoctorRepository {
  search(params?: DoctorSearchParams): Promise<Doctor[]>;
  get(id: string): Promise<Doctor | null>;
  top(): Promise<Doctor[]>;
  reviews(id: string): Promise<DoctorReviews>;
}

export interface AppointmentRepository {
  list(tab: "upcoming" | "past"): Promise<Appointment[]>;
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
