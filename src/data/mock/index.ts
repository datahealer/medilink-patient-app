import type {
  AiSuggestion,
  Appointment,
  AvailableSlot,
  Doctor,
  DoctorReviews,
  FamilyMember,
  Favourite,
  NewAppointment,
  NotificationItem,
  PatientProfile,
  Review,
} from "../types";
import type { DoctorSearchParams, Repositories } from "../repositories";
import {
  APPOINTMENTS_SEED,
  CLINICS,
  DOCTORS,
  FAMILY,
  INSURANCE,
  MEDICAL_HISTORY,
  NOTIFICATIONS,
  PACKAGES,
  PROFILE,
  REVIEW_POOL,
  SPECIALTIES,
} from "./seed";
import { isoAddDays, todayISO } from "@/utils/format";

/** Artificial latency so loading states stay visible. */
const delay = <T,>(value: T, ms = 300): Promise<T> => new Promise((r) => setTimeout(() => r(value), ms));

/* Session-mutable state */
let appointments: Appointment[] = [...APPOINTMENTS_SEED];
let notifications: NotificationItem[] = [...NOTIFICATIONS];
let family: FamilyMember[] = [...FAMILY];
let profile: PatientProfile = { ...PROFILE };
const favKey = (f: Favourite) => `${f.kind}:${f.refId}`;
const favourites = new Map<string, Favourite>(
  (
    [
      { kind: "doctor", refId: "dr-ahmed" },
      { kind: "doctor", refId: "dr-noura" },
      { kind: "clinic", refId: "cl-mouj" },
      { kind: "package", refId: "pkg-0" },
    ] as Favourite[]
  ).map((f) => [favKey(f), f]),
);
let refCounter = 100;

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/* Deterministic slot generation: stable per (doctor, date), Fri closed. */
function slotsFor(doctorId: string, dateISO: string): AvailableSlot[] {
  const date = new Date(dateISO + "T12:00:00");
  if (date.getDay() === 5) return []; // Friday — Oman weekend
  const taken = new Set(
    appointments
      .filter((a) => a.doctor_id === doctorId && a.slot_date === dateISO && a.status !== "cancelled")
      .map((a) => a.slot_start),
  );
  const base = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00"];
  const h = hash(doctorId + dateISO);
  const out: AvailableSlot[] = [];
  const isToday = dateISO === todayISO();
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  base.forEach((start, i) => {
    if ((h >> i) % 3 === 0) return; // drop ~1/3 pseudo-randomly
    if (taken.has(start)) return;
    const [hh, mm] = start.split(":").map(Number);
    if (isToday && hh * 60 + mm <= nowMinutes + 45) return;
    out.push({ start, period: hh < 12 ? "morning" : hh < 16 ? "afternoon" : "evening" });
  });
  return out;
}

function withAvailability(doctor: Doctor): Doctor {
  const today = slotsFor(doctor.id, todayISO());
  // Scarcity is real (1–2 slots left) but still hash-gated so the tag stays
  // rare — tagging everything is the clutter we're avoiding.
  const scarce =
    today.length > 0 && today.length <= 2 && hash(doctor.id + todayISO()) % 3 === 0;
  return {
    ...doctor,
    available_today: today.length > 0,
    slots_today: today.slice(0, 3).map((s) => s.start),
    tag: scarce ? { key: "lastSlots", n: today.length } : doctor.tag,
  };
}

function makeReviews(doctorId: string): DoctorReviews {
  const doctor = DOCTORS.find((x) => x.id === doctorId);
  const total = doctor?.reviews ?? 0;
  const average = doctor?.rating ?? 5;
  const h = hash(doctorId);
  const items: Review[] = Array.from({ length: 4 }, (_, i) => {
    const t = REVIEW_POOL[(h + i * 3) % REVIEW_POOL.length];
    return { ...t, id: `${doctorId}-rv-${i}`, date: isoAddDays(new Date(), -(7 + i * 23 + (h % 11))) };
  });
  const five = Math.round(total * 0.72);
  const four = Math.round(total * 0.2);
  const three = Math.round(total * 0.05);
  const two = Math.round(total * 0.02);
  return {
    summary: {
      average,
      total,
      distribution: [
        { stars: 5, count: five },
        { stars: 4, count: four },
        { stars: 3, count: three },
        { stars: 2, count: two },
        { stars: 1, count: Math.max(total - five - four - three - two, 0) },
      ],
    },
    reviews: items,
  };
}

export const repositories: Repositories = {
  patient: {
    getProfile: () => delay({ ...profile }),
    updateProfile: async (patch) => {
      profile = { ...profile, ...patch };
      return delay({ ...profile }, 500);
    },
    getMedicalHistory: () => delay(MEDICAL_HISTORY),
    getInsurance: () => delay(INSURANCE),
  },
  family: {
    list: () => delay([...family]),
    add: async (member) => {
      const created = { ...member, id: `fam-${Date.now()}` };
      family = [...family, created];
      return delay(created);
    },
    remove: async (id) => {
      family = family.filter((f) => f.id !== id);
      return delay(undefined);
    },
  },
  discovery: {
    listSpecialties: () => delay(SPECIALTIES, 180),
    featuredClinics: () => delay(CLINICS.filter((c) => c.featured)),
    searchClinics: (term) => {
      const q = term.trim().toLowerCase();
      const all = q
        ? CLINICS.filter(
            (c) =>
              c.name.toLowerCase().includes(q) ||
              c.name_ar.includes(term.trim()) ||
              c.area.toLowerCase().includes(q) ||
              c.area_ar.includes(term.trim()) ||
              c.city.toLowerCase().includes(q) ||
              c.city_ar.includes(term.trim()),
          )
        : CLINICS;
      return delay([...all].sort((a, b) => a.distance_km - b.distance_km));
    },
    getClinic: (id) => delay(CLINICS.find((c) => c.id === id) ?? null),
    searchPackages: (term) => {
      const q = term.trim().toLowerCase();
      const all = q
        ? PACKAGES.filter((p) => p.name.toLowerCase().includes(q) || p.name_ar.includes(term.trim()))
        : PACKAGES;
      return delay(all);
    },
    getPackage: (id) => delay(PACKAGES.find((p) => p.id === id) ?? null),
  },
  doctor: {
    search: (params?: DoctorSearchParams) => {
      let list = DOCTORS.map(withAvailability);
      const q = params?.query?.trim().toLowerCase();
      if (q) {
        const specialtyHit = SPECIALTIES.filter(
          (s) => s.name.toLowerCase().includes(q) || s.name_ar.includes(params!.query!.trim()),
        ).map((s) => s.id);
        list = list.filter(
          (x) =>
            x.full_name.toLowerCase().includes(q) ||
            x.full_name_ar.includes(params!.query!.trim()) ||
            specialtyHit.includes(x.specialty) ||
            x.facility.toLowerCase().includes(q) ||
            x.facility_ar.includes(params!.query!.trim()),
        );
      }
      if (params?.specialty) list = list.filter((x) => x.specialty === params.specialty);
      if (params?.clinicId) list = list.filter((x) => x.facility_id === params.clinicId);
      if (params?.gender && params.gender !== "any") list = list.filter((x) => x.gender === params.gender);
      if (params?.maxFee) list = list.filter((x) => x.fee_omr <= params.maxFee!);
      if (params?.minRating) list = list.filter((x) => x.rating >= params.minRating!);
      if (params?.availableToday) list = list.filter((x) => x.available_today);
      list.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
      if (params?.limit) list = list.slice(0, params.limit);
      return delay(list);
    },
    get: (id) => {
      const found = DOCTORS.find((x) => x.id === id);
      return delay(found ? withAvailability(found) : null);
    },
    top: () => delay(DOCTORS.map(withAvailability).sort((a, b) => b.rating - a.rating || b.reviews - a.reviews).slice(0, 6)),
    reviews: (id) => delay(makeReviews(id)),
  },
  appointment: {
    list: (tab) => {
      const today = todayISO();
      const upcoming = appointments
        .filter((a) => ["pending", "confirmed", "checked_in"].includes(a.status) && a.slot_date >= today)
        .sort((a, b) => (a.slot_date + a.slot_start).localeCompare(b.slot_date + b.slot_start));
      const past = appointments
        .filter((a) => ["completed", "cancelled", "no_show"].includes(a.status) || a.slot_date < today)
        .sort((a, b) => (b.slot_date + b.slot_start).localeCompare(a.slot_date + a.slot_start));
      return delay(tab === "upcoming" ? upcoming : past);
    },
    get: (id) => delay(appointments.find((a) => a.id === id) ?? null),
    getSlots: ({ doctorId, date }) => delay(slotsFor(doctorId, date), 240),
    create: async (input: NewAppointment) => {
      // PDPL consent is collected in the UI and required before this call.
      // Card checkout is simulated as instantly successful in the prototype.
      const doctor = DOCTORS.find((x) => x.id === input.doctorId)!;
      const member = family.find((f) => f.id === input.patientId);
      const created: Appointment = {
        id: `apt-${Date.now()}`,
        reference_number: `ML-${(refCounter++).toString(36).toUpperCase()}${Math.floor(Math.random() * 90 + 10)}`,
        doctor_id: input.doctorId,
        slot_date: input.slotDate,
        slot_start: input.slotStart,
        status: "confirmed",
        payment_status: "paid",
        reason_for_visit: input.reason ?? null,
        fee_omr: doctor.fee_omr,
        patient_name: member?.full_name ?? profile.full_name,
        patient_name_ar: member?.full_name_ar ?? profile.full_name_ar,
        clinic_id: input.clinicId,
      };
      appointments = [created, ...appointments];
      return delay(created, 700);
    },
    cancel: async (id) => {
      appointments = appointments.map((a) => (a.id === id ? { ...a, status: "cancelled" } : a));
      return delay(undefined);
    },
    reschedule: async (id, slot) => {
      appointments = appointments.map((a) =>
        a.id === id ? { ...a, slot_date: slot.date, slot_start: slot.start, status: "confirmed" } : a,
      );
      return delay(undefined, 550);
    },
    checkIn: async (id) => {
      appointments = appointments.map((a) => (a.id === id ? { ...a, status: "checked_in", queue_ahead: 3 } : a));
      return delay(undefined, 600);
    },
    pay: async (id) => {
      appointments = appointments.map((a) =>
        a.id === id ? { ...a, payment_status: "paid", status: "confirmed" } : a,
      );
      return delay(undefined, 900);
    },
  },
  notification: {
    list: () => delay([...notifications]),
    unreadCount: () => delay(notifications.filter((n) => n.unread).length, 120),
    markAllRead: async () => {
      notifications = notifications.map((n) => ({ ...n, unread: false }));
      return delay(undefined, 150);
    },
  },
  review: {
    submit: async () => delay(undefined, 600),
  },
  favourite: {
    list: () => delay([...favourites.values()]),
    toggle: async (kind, refId) => {
      const key = favKey({ kind, refId });
      if (favourites.has(key)) favourites.delete(key);
      else favourites.set(key, { kind, refId });
      return delay(favourites.has(key), 100);
    },
  },
  ai: {
    ask: async (message): Promise<AiSuggestion> => {
      const m = message.toLowerCase();
      const has = (...words: string[]) => words.some((w) => m.includes(w) || message.includes(w));
      let out: AiSuggestion;
      if (has("صداع", "حرارة", "headache", "fever")) {
        out = {
          reply:
            "A mild headache with low fever is usually viral. Rest, fluids and paracetamol help. If the fever passes 39°, lasts more than 3 days, or comes with a stiff neck — see a doctor. Would you like a general physician?",
          reply_ar:
            "الصداع مع حرارة خفيفة غالباً سببه فيروسي. الراحة والسوائل والباراسيتامول تساعد. إذا تجاوزت الحرارة 39° أو استمرت أكثر من 3 أيام أو صاحبها تيبّس في الرقبة — راجعي طبيباً. تحبين أرشّح لك طبيب عام؟",
          urgency: "self",
          doctorIds: ["dr-fatma", "dr-anil"],
        };
      } else if (has("ظهر", "back")) {
        out = {
          reply:
            "For back pain lasting more than a week, an orthopedic assessment plus physiotherapy gives the best results. Here are the closest highly-rated options:",
          reply_ar:
            "لألم الظهر المستمر أكثر من أسبوع، الأفضل تقييم عظام مع جلسات علاج طبيعي. هذي أقرب الخيارات الأعلى تقييماً:",
          urgency: "doctor",
          doctorIds: ["dr-said", "dr-omar"],
        };
      } else if (has("أسنان", "سن", "dentist", "tooth")) {
        out = {
          reply: "Dr. Khalid Al Lawati at Nakhal Dental House has evening slots this week — shall I take you to booking?",
          reply_ar: "د. خالد اللواتي في بيت نخل لطب الأسنان عنده مواعيد مسائية هذا الأسبوع — أفتح لك صفحة الحجز؟",
          urgency: null,
          doctorIds: ["dr-khalid"],
        };
      } else if (has("صدر", "chest", "تنفس", "breath")) {
        out = {
          reply: "Chest pain with shortness of breath needs urgent attention. Please head to the nearest emergency department or call 9999 now.",
          reply_ar: "ألم الصدر مع ضيق التنفس يحتاج تقييماً عاجلاً. توجّهي لأقرب طوارئ أو اتصلي بـ 9999 الآن.",
          urgency: "emergency",
          doctorIds: [],
        };
      } else {
        out = {
          reply:
            "Tell me a bit more — where is the pain, since when, and how strong (1–10)? Meanwhile, a general physician is a safe first step:",
          reply_ar:
            "خبريني أكثر — وين الألم، من متى، وكم شدّته من 10؟ وإلى ذلك الحين، طبيب العام خطوة أولى مناسبة:",
          urgency: null,
          doctorIds: ["dr-fatma"],
        };
      }
      return delay(out, 1100);
    },
  },
};
