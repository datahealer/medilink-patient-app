import type {
  Clinic,
  ClinicService,
  Doctor,
  DoctorService,
  FamilyMember,
  HealthPackage,
  InsuranceCard,
  MedicalHistory,
  NotificationItem,
  PatientProfile,
  Review,
  Specialty,
  Tag,
} from "../types";
import { isoAddDays } from "@/utils/format";

const now = new Date();
const d = (offset: number) => isoAddDays(now, offset);

/** Deterministic hash — keeps the generated catalog stable across reloads. */
const hash = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};
const range = (seed: number, min: number, max: number) => min + (seed % (max - min + 1));

/* ------------------------------------------------------------------ */
/* Specialties (14)                                                    */
/* ------------------------------------------------------------------ */
export const SPECIALTIES: Specialty[] = [
  { id: "general", icon: "stethoscope", name: "General Medicine", name_ar: "طب عام" },
  { id: "dental", icon: "tooth", name: "Dentistry", name_ar: "طب الأسنان" },
  { id: "cardiology", icon: "heart-pulse", name: "Cardiology", name_ar: "أمراض القلب" },
  { id: "pediatrics", icon: "baby", name: "Pediatrics", name_ar: "طب الأطفال" },
  { id: "obgyn", icon: "gyn", name: "Obstetrics & Gynecology", name_ar: "النساء والولادة" },
  { id: "dermatology", icon: "sparkles", name: "Dermatology", name_ar: "الجلدية والتجميل" },
  { id: "ophthalmology", icon: "eye", name: "Ophthalmology", name_ar: "طب العيون" },
  { id: "orthopedics", icon: "bone", name: "Orthopedics", name_ar: "العظام والمفاصل" },
  { id: "ent", icon: "ear", name: "ENT", name_ar: "أنف وأذن وحنجرة" },
  { id: "mental", icon: "brain", name: "Mental Health", name_ar: "الصحة النفسية" },
  { id: "physio", icon: "dumbbell", name: "Physiotherapy", name_ar: "العلاج الطبيعي" },
  { id: "nutrition", icon: "apple", name: "Clinical Nutrition", name_ar: "التغذية العلاجية" },
  { id: "radiology", icon: "scan", name: "Radiology", name_ar: "الأشعة والتصوير" },
  { id: "lab", icon: "flask", name: "Laboratory", name_ar: "المختبرات الطبية" },
];

/* ------------------------------------------------------------------ */
/* Bilingual pools                                                     */
/* ------------------------------------------------------------------ */
const MALE: [string, string][] = [
  ["Ahmed", "أحمد"], ["Mohammed", "محمد"], ["Said", "سعيد"], ["Khalid", "خالد"],
  ["Salim", "سالم"], ["Hamad", "حمد"], ["Nasser", "ناصر"], ["Yousuf", "يوسف"],
  ["Abdullah", "عبدالله"], ["Talal", "طلال"], ["Majid", "ماجد"], ["Badar", "بدر"],
  ["Hilal", "هلال"], ["Mazin", "مازن"], ["Qais", "قيس"], ["Omar", "عمر"],
];
const FEMALE: [string, string][] = [
  ["Maryam", "مريم"], ["Fatma", "فاطمة"], ["Aisha", "عائشة"], ["Noura", "نورة"],
  ["Layla", "ليلى"], ["Shaikha", "شيخة"], ["Asma", "أسماء"], ["Huda", "هدى"],
  ["Muna", "منى"], ["Bashayer", "بشاير"], ["Ruqaiya", "رقية"], ["Zainab", "زينب"],
  ["Sara", "سارة"], ["Hanan", "حنان"], ["Jokha", "جوخة"], ["Amal", "أمل"],
];
/** [en, ar-masculine, ar-feminine] */
const NISBA: [string, string, string][] = [
  ["Al Harthy", "الحارثي", "الحارثية"], ["Al Balushi", "البلوشي", "البلوشية"],
  ["Al Lawati", "اللواتي", "اللواتية"], ["Al Riyami", "الريامي", "الريامية"],
  ["Al Hinai", "الهنائي", "الهنائية"], ["Al Busaidi", "البوسعيدي", "البوسعيدية"],
  ["Al Maamari", "المعمري", "المعمرية"], ["Al Amri", "العامري", "العامرية"],
  ["Al Zadjali", "الزدجالي", "الزدجالية"], ["Al Kindi", "الكندي", "الكندية"],
  ["Al Wahaibi", "الوهيبي", "الوهيبية"], ["Al Rawahi", "الرواحي", "الرواحية"],
  ["Al Shidi", "الشيدي", "الشيدية"], ["Al Ghafri", "الغافري", "الغافرية"],
  ["Al Maqbali", "المقبالي", "المقبالية"], ["Al Farsi", "الفارسي", "الفارسية"],
  ["Al Siyabi", "السيابي", "السيابية"], ["Al Abri", "العبري", "العبرية"],
  ["Al Jabri", "الجابري", "الجابرية"], ["Al Nabhani", "النبهاني", "النبهانية"],
];
/** Expat doctors are common in Oman. [en, ar, gender] */
const EXPAT_FIRST: [string, string, "male" | "female"][] = [
  ["Rajesh", "راجيش", "male"], ["Anil", "أنيل", "male"], ["Suresh", "سوريش", "male"],
  ["Thomas", "توماس", "male"], ["Imran", "عمران", "male"],
  ["Priya", "برييا", "female"], ["Maria", "ماريا", "female"], ["Nadia", "نادية", "female"],
  ["Sunita", "سونيتا", "female"], ["Reena", "رينا", "female"],
];
const EXPAT_LAST: [string, string][] = [
  ["Kumar", "كومار"], ["Menon", "مينون"], ["Santos", "سانتوس"], ["Khan", "خان"],
  ["Hassan", "حسن"], ["George", "جورج"], ["Nair", "ناير"], ["Pillai", "بيلاي"],
  ["Dsouza", "دسوزا"], ["Sharma", "شارما"],
];

/** [area en, area ar, city en, city ar, lat, lng] */
const AREAS: [string, string, string, string, number, number][] = [
  ["Al Khuwair", "الخوير", "Muscat", "مسقط", 23.5989, 58.4353],
  ["Qurum", "القرم", "Muscat", "مسقط", 23.6089, 58.4794],
  ["Ruwi", "روي", "Muscat", "مسقط", 23.5931, 58.5455],
  ["Al Mouj", "الموج", "Muscat", "مسقط", 23.6396, 58.2531],
  ["Al Ghubra", "الغبرة", "Muscat", "مسقط", 23.5859, 58.4059],
  ["Bawshar", "بوشر", "Muscat", "مسقط", 23.559, 58.399],
  ["Seeb", "السيب", "Muscat", "مسقط", 23.6702, 58.189],
  ["Al Khoudh", "الخوض", "Muscat", "مسقط", 23.6266, 58.1541],
  ["Al Mawaleh", "الموالح", "Muscat", "مسقط", 23.6011, 58.2565],
  ["Al Amerat", "العامرات", "Muscat", "مسقط", 23.5253, 58.4989],
  ["Muttrah", "مطرح", "Muscat", "مسقط", 23.6161, 58.5666],
  ["Al Hail", "الحيل", "Muscat", "مسقط", 23.647, 58.195],
  ["Al Maabilah", "المعبيلة", "Muscat", "مسقط", 23.6389, 58.1226],
  ["Sohar", "صحار", "Sohar", "صحار", 24.3643, 56.7462],
  ["Nizwa", "نزوى", "Nizwa", "نزوى", 22.9333, 57.5333],
  ["Salalah", "صلالة", "Salalah", "صلالة", 17.0176, 54.0924],
  ["Barka", "بركاء", "Barka", "بركاء", 23.7071, 57.8894],
  ["Sur", "صور", "Sur", "صور", 22.5667, 59.5289],
  ["Ibri", "عبري", "Ibri", "عبري", 23.2257, 56.5157],
  ["Rustaq", "الرستاق", "Rustaq", "الرستاق", 23.3908, 57.4244],
];

const CLINIC_STEMS: [string, string][] = [
  ["Al Shifa", "الشفاء"], ["Al Nakheel", "النخيل"], ["Al Waha", "الواحة"],
  ["Al Salam", "السلام"], ["Al Amal", "الأمل"], ["Al Ri'aya", "الرعاية"],
  ["Al Baraka", "البركة"], ["Al Afia", "العافية"], ["Al Madina", "المدينة"],
  ["Gulf", "الخليج"], ["Green Mountain", "الجبل الأخضر"], ["Dhofar", "ظفار"],
  ["Al Batinah", "الباطنة"], ["Al Nahda", "النهضة"], ["Al Bushra", "البشرى"],
  ["Al Yaqeen", "اليقين"], ["Muscat Bay", "خليج مسقط"], ["Al Sarooj", "السروج"],
  ["Al Falaj", "الفلج"], ["Majan", "مجان"], ["Samail", "سمائل"], ["Al Noor", "النور"],
];

const CLINIC_KIND: Record<Clinic["type"], { en: (s: string) => string; ar: (s: string) => string }> = {
  hospital: { en: (s) => `${s} Hospital`, ar: (s) => `مستشفى ${s}` },
  clinic: { en: (s) => `${s} Medical Center`, ar: (s) => `مركز ${s} الطبي` },
  dental: { en: (s) => `${s} Dental Clinic`, ar: (s) => `عيادة ${s} للأسنان` },
  lab: { en: (s) => `${s} Medical Labs`, ar: (s) => `مختبرات ${s} الطبية` },
  physiotherapy: { en: (s) => `${s} Physiotherapy Center`, ar: (s) => `مركز ${s} للعلاج الطبيعي` },
  optical: { en: (s) => `${s} Eye Center`, ar: (s) => `مركز ${s} للعيون` },
};

/** Gender-neutral (noun-phrase) bios per specialty + fee bands. */
// Exported: the real data layer reuses these bilingual titles/abouts as the
// display fallback for live doctors whose DB rows carry no bio.
export const ABOUT: Record<string, { en: string; ar: string; title: string; title_ar: string; title_ar_f: string; fee: [number, number] }> = {
  general: { en: "Everyday illness, chronic disease reviews and preventive care for all ages.", ar: "خبرة في الأمراض اليومية ومراجعات الأمراض المزمنة والرعاية الوقائية لجميع الأعمار.", title: "General Practitioner", title_ar: "طب عام", title_ar_f: "طب عام", fee: [4, 9] },
  dental: { en: "Cosmetic and family dentistry — fillings, root canals and smile design.", ar: "طب أسنان تجميلي وعائلي — حشوات وعلاج عصب وتصميم الابتسامة.", title: "Dental Specialist", title_ar: "أخصائي أسنان", title_ar_f: "أخصائية أسنان", fee: [8, 18] },
  cardiology: { en: "Hypertension, heart-failure clinics and cardiac diagnostics.", ar: "متابعة الضغط وعيادات قصور القلب والفحوصات القلبية التشخيصية.", title: "Cardiology Consultant", title_ar: "استشاري قلب", title_ar_f: "استشارية قلب", fee: [18, 28] },
  pediatrics: { en: "Growth follow-up, vaccination schedules and newborn care.", ar: "متابعة النمو وجداول التطعيم ورعاية حديثي الولادة.", title: "Pediatrics Specialist", title_ar: "أخصائي أطفال", title_ar_f: "أخصائية أطفال", fee: [8, 15] },
  obgyn: { en: "Pregnancy care, women's health checks and delivery planning.", ar: "رعاية الحمل وفحوصات صحة المرأة والتخطيط للولادة.", title: "OB-GYN Consultant", title_ar: "استشاري نساء وولادة", title_ar_f: "استشارية نساء وولادة", fee: [14, 22] },
  dermatology: { en: "Acne, pigmentation and cosmetic dermatology with laser certification.", ar: "علاج حب الشباب والتصبغات والتجميل الجلدي مع شهادة الليزر.", title: "Dermatology Specialist", title_ar: "أخصائي جلدية", title_ar_f: "أخصائية جلدية", fee: [12, 20] },
  ophthalmology: { en: "Cataract, glaucoma management and vision screening.", ar: "علاج الساد ومتابعة الجلوكوما وفحوصات النظر.", title: "Ophthalmology Consultant", title_ar: "استشاري عيون", title_ar_f: "استشارية عيون", fee: [10, 18] },
  orthopedics: { en: "Knee and shoulder injuries, joint care and sports medicine.", ar: "إصابات الركبة والكتف والعناية بالمفاصل والطب الرياضي.", title: "Orthopedics Consultant", title_ar: "استشاري عظام", title_ar_f: "استشارية عظام", fee: [15, 25] },
  ent: { en: "Sinus problems, tonsillitis, hearing checks and children's ENT.", ar: "الجيوب الأنفية واللوز وفحوصات السمع وأنف وأذن الأطفال.", title: "ENT Specialist", title_ar: "أخصائي أنف وأذن وحنجرة", title_ar_f: "أخصائية أنف وأذن وحنجرة", fee: [10, 16] },
  mental: { en: "Anxiety, burnout and CBT — in Arabic and English.", ar: "جلسات القلق والإرهاق والعلاج المعرفي السلوكي — بالعربية والإنجليزية.", title: "Clinical Psychologist", title_ar: "أخصائي نفسي", title_ar_f: "أخصائية نفسية", fee: [18, 28] },
  physio: { en: "Back and neck programs, post-surgery rehab and athlete recovery.", ar: "برامج الظهر والرقبة والتأهيل بعد العمليات وتعافي الرياضيين.", title: "Physiotherapist", title_ar: "أخصائي علاج طبيعي", title_ar_f: "أخصائية علاج طبيعي", fee: [8, 14] },
  nutrition: { en: "Weight management, diabetes-friendly plans and child nutrition.", ar: "إدارة الوزن وخطط غذائية لمرضى السكري وتغذية الأطفال.", title: "Clinical Dietitian", title_ar: "أخصائي تغذية علاجية", title_ar_f: "أخصائية تغذية علاجية", fee: [10, 16] },
  radiology: { en: "X-ray, ultrasound and MRI reporting.", ar: "تقارير الأشعة السينية والموجات الصوتية والرنين المغناطيسي.", title: "Radiology Consultant", title_ar: "استشاري أشعة", title_ar_f: "استشارية أشعة", fee: [15, 25] },
  lab: { en: "Clinical pathology and laboratory medicine.", ar: "علم الأمراض السريري وطب المختبرات.", title: "Lab Medicine Specialist", title_ar: "أخصائي مختبرات", title_ar_f: "أخصائية مختبرات", fee: [3, 8] },
};

/**
 * Service menus per clinic type (bilingual, base prices in OMR).
 * Every line carries a specialty: an untagged service has no doctor to route
 * "Book" to, which is how you end up booking a pediatric visit with a
 * cardiologist. The doctor roster is generated FROM these menus (see
 * rosterFor) so a facility can always staff what it advertises.
 */
const SERVICE_MENU: Record<Clinic["type"], [string, string, number, string][]> = {
  hospital: [
    ["General consultation", "استشارة عامة", 8, "general"],
    ["Pediatric consultation", "استشارة أطفال", 12, "pediatrics"],
    ["Obstetrics & gynecology consultation", "استشارة نساء وولادة", 18, "obgyn"],
    ["ECG", "تخطيط القلب", 12, "cardiology"],
    ["Cardiac echo", "الموجات الصوتية للقلب", 35, "cardiology"],
    ["Orthopedic consultation", "استشارة عظام", 20, "orthopedics"],
    ["ENT consultation", "استشارة أنف وأذن وحنجرة", 14, "ent"],
    ["Dermatology consultation", "استشارة جلدية", 16, "dermatology"],
    ["Eye examination", "فحص العيون", 14, "ophthalmology"],
    ["X-Ray", "أشعة سينية", 10, "radiology"],
    ["MRI scan", "الرنين المغناطيسي", 90, "radiology"],
    ["Laboratory tests", "الفحوصات المخبرية", 6, "lab"],
    ["Physiotherapy session", "جلسة علاج طبيعي", 12, "physio"],
    ["Psychology session", "جلسة استشارة نفسية", 22, "mental"],
  ],
  clinic: [
    ["General consultation", "استشارة عامة", 6, "general"],
    ["Blood pressure & sugar check", "قياس الضغط والسكر", 3, "general"],
    ["Wound dressing", "ضماد الجروح", 4, "general"],
    ["Pediatric consultation", "استشارة أطفال", 12, "pediatrics"],
    ["Vaccination", "التطعيمات", 5, "pediatrics"],
    ["Dermatology consultation", "استشارة جلدية", 15, "dermatology"],
    ["ENT consultation", "استشارة أنف وأذن وحنجرة", 13, "ent"],
    ["Women's health consultation", "استشارة صحة المرأة", 16, "obgyn"],
    ["Nutrition consultation", "استشارة تغذية", 14, "nutrition"],
    ["Psychology session", "جلسة استشارة نفسية", 20, "mental"],
    ["Cardiology consultation", "استشارة قلب", 18, "cardiology"],
    ["Orthopedic consultation", "استشارة عظام", 18, "orthopedics"],
    ["X-Ray", "أشعة سينية", 9, "radiology"],
  ],
  dental: [
    ["Dental checkup", "كشف أسنان", 8, "dental"],
    ["Teeth cleaning", "تنظيف الأسنان", 15, "dental"],
    ["Cosmetic filling", "حشوة تجميلية", 20, "dental"],
    ["Root canal treatment", "علاج العصب", 70, "dental"],
    ["Teeth whitening", "تبييض الأسنان", 60, "dental"],
    ["Braces consultation", "استشارة تقويم", 10, "dental"],
  ],
  lab: [
    ["Complete blood count (CBC)", "تعداد الدم الكامل", 5, "lab"],
    ["Lipid profile", "فحص الدهون", 8, "lab"],
    ["Vitamin D", "فيتامين د", 12, "lab"],
    ["HbA1c", "السكر التراكمي", 7, "lab"],
    ["Thyroid panel", "فحص الغدة الدرقية", 10, "lab"],
    ["Home sample collection", "السحب المنزلي", 5, "lab"],
  ],
  physiotherapy: [
    ["Initial assessment", "تقييم أولي", 10, "physio"],
    ["Physiotherapy session", "جلسة علاج طبيعي", 10, "physio"],
    ["Sports therapeutic massage", "مساج رياضي علاجي", 15, "physio"],
    ["Electrotherapy", "العلاج الكهربائي", 12, "physio"],
  ],
  optical: [
    ["Comprehensive eye exam", "فحص نظر شامل", 12, "ophthalmology"],
    ["Retina imaging", "تصوير الشبكية", 20, "ophthalmology"],
    ["Contact lens fitting", "قياس العدسات اللاصقة", 10, "ophthalmology"],
    ["LASIK consultation", "استشارة ليزك", 15, "ophthalmology"],
  ],
};

const HOURS_STD = [
  { days: "sun-thu", dow: [0, 1, 2, 3, 4], open: "08:30", close: "21:00" },
  { days: "sat", dow: [6], open: "09:00", close: "17:00" },
  { days: "fri", dow: [5], open: null, close: null },
];
const HOURS_247 = [{ days: "all", dow: [0, 1, 2, 3, 4, 5, 6], open: "00:00", close: "23:59" }];

const KHUWAIR = { lat: 23.5989, lng: 58.4353 };
function distanceKm(lat: number, lng: number): number {
  const R = 6371;
  const dLat = ((lat - KHUWAIR.lat) * Math.PI) / 180;
  const dLng = ((lng - KHUWAIR.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((KHUWAIR.lat * Math.PI) / 180) * Math.cos((lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

/* ------------------------------------------------------------------ */
/* Clinics — 8 crafted anchors + generated fleet (80 total)            */
/* ------------------------------------------------------------------ */
const svc = (id: string, name: string, name_ar: string, price: number, specialty: string): ClinicService => ({
  id, name, name_ar, price_from_omr: price, specialty,
});

/** doctors_count and tag are derived once the roster exists — see CLINICS. */
type ClinicSeed = Omit<Clinic, "doctors_count" | "tag">;

/**
 * The menu a facility actually prints. Hospitals and single-specialty
 * facilities offer their whole type menu; a multi-specialty clinic keeps
 * general medicine and picks up a deterministic subset of the rest — so
 * "offers pediatrics" narrows the list instead of matching every clinic.
 */
function menuFor(type: Clinic["type"], h: (attr: string) => number) {
  const pool = SERVICE_MENU[type];
  if (type !== "clinic") return pool;
  return pool.filter(([, , , specialty]) => specialty === "general" || h(`svc-${specialty}`) % 2 === 0);
}

const ANCHOR_CLINICS: ClinicSeed[] = [
  {
    id: "cl-muzn", name: "Al Muzn Specialist Hospital", name_ar: "مستشفى المُزن التخصصي", name_ar_status: "verified",
    type: "hospital", area: "Al Khuwair", area_ar: "الخوير", city: "Muscat", city_ar: "مسقط",
    description: "A leading private hospital with 12 specialties, modern operating theatres and a 24/7 emergency department.",
    description_ar: "مستشفى خاص رائد يضم 12 تخصصاً، وغرف عمليات حديثة، وقسم طوارئ يعمل على مدار الساعة.",
    rating: 4.8, reviews: 512, distance_km: 2.1, featured: true, is_verified: true,
    latitude: 23.5989, longitude: 58.4353, phone: "+968 2447 7000", working_hours: HOURS_247,
    services: SERVICE_MENU.hospital.map((s, i) => svc(`s-muzn-${i}`, s[0], s[1], s[2], s[3])),
    coverHue: 262,
  },
  {
    id: "cl-luban", name: "Luban Medical Complex", name_ar: "مجمع لُبان الطبي", name_ar_status: "verified",
    type: "clinic", area: "Ruwi", area_ar: "روي", city: "Muscat", city_ar: "مسقط",
    description: "Family-friendly multi-specialty complex serving Ruwi for over 20 years.",
    description_ar: "مجمع طبي متعدد التخصصات يخدم عائلات روي منذ أكثر من 20 عاماً.",
    rating: 4.7, reviews: 389, distance_km: 6.8, featured: true, is_verified: true,
    latitude: 23.5931, longitude: 58.5455, phone: "+968 2470 2211", working_hours: HOURS_STD,
    services: SERVICE_MENU.clinic.map((s, i) => svc(`s-luban-${i}`, s[0], s[1], s[2], s[3])),
    coverHue: 220,
  },
  {
    id: "cl-mouj", name: "Al Mouj Health Village", name_ar: "قرية الموج الصحية", name_ar_status: "verified",
    type: "clinic", area: "Al Mouj", area_ar: "الموج", city: "Muscat", city_ar: "مسقط",
    description: "Boutique wellness clinic by the marina — dermatology, mental health and nutrition.",
    description_ar: "عيادة راقية على المرسى — الجلدية والصحة النفسية والتغذية العلاجية.",
    rating: 4.9, reviews: 167, distance_km: 12.4, is_verified: true,
    latitude: 23.6396, longitude: 58.2531, phone: "+968 2205 3300", working_hours: HOURS_STD,
    services: [
      svc("s-mouj-1", "Dermatology consultation", "استشارة جلدية", 18, "dermatology"),
      svc("s-mouj-2", "Skin care session", "جلسة عناية بالبشرة", 25, "dermatology"),
      svc("s-mouj-3", "Psychology session", "جلسة استشارة نفسية", 25, "mental"),
      svc("s-mouj-4", "Nutrition consultation", "استشارة تغذية", 15, "nutrition"),
    ],
    coverHue: 288,
  },
  {
    id: "cl-nakhal", name: "Nakhal Dental House", name_ar: "بيت نخل لطب الأسنان", name_ar_status: "verified",
    type: "dental", area: "Qurum", area_ar: "القرم", city: "Muscat", city_ar: "مسقط",
    description: "Dedicated dental house — cosmetic, orthodontic and family dentistry.",
    description_ar: "بيت متخصص للأسنان — تجميل وتقويم وطب أسنان العائلة.",
    rating: 4.9, reviews: 294, distance_km: 4.5, is_verified: true,
    latitude: 23.6089, longitude: 58.4794, phone: "+968 2456 8800", working_hours: HOURS_STD,
    services: SERVICE_MENU.dental.map((s, i) => svc(`s-nakhal-${i}`, s[0], s[1], s[2], s[3])),
    coverHue: 245,
  },
  {
    id: "cl-diqqa", name: "Diqqa Medical Laboratories", name_ar: "مختبرات دِقّة الطبية", name_ar_status: "verified",
    type: "lab", area: "Bawshar", area_ar: "بوشر", city: "Muscat", city_ar: "مسقط",
    description: "Accredited labs with home sample collection across Muscat and results in hours.",
    description_ar: "مختبرات معتمدة مع خدمة السحب المنزلي في مسقط ونتائج خلال ساعات.",
    rating: 4.8, reviews: 201, distance_km: 5.2, is_verified: true,
    latitude: 23.559, longitude: 58.399, phone: "+968 2459 1144", working_hours: HOURS_STD,
    services: SERVICE_MENU.lab.map((s, i) => svc(`s-diqqa-${i}`, s[0], s[1], s[2], s[3])),
    coverHue: 210,
  },
  {
    id: "cl-physio", name: "Harakah Physiotherapy Center", name_ar: "مركز حَرَكة للعلاج الطبيعي", name_ar_status: "verified",
    type: "physiotherapy", area: "Al Ghubra", area_ar: "الغبرة", city: "Muscat", city_ar: "مسقط",
    description: "Rehabilitation, sports injuries and posture programs with modern equipment.",
    description_ar: "إعادة تأهيل وإصابات ملاعب وبرامج قوام بأحدث الأجهزة.",
    rating: 4.7, reviews: 76, distance_km: 3.3, is_verified: true,
    latitude: 23.5859, longitude: 58.4059, phone: "+968 2449 6600", working_hours: HOURS_STD,
    services: SERVICE_MENU.physiotherapy.map((s, i) => svc(`s-physio-${i}`, s[0], s[1], s[2], s[3])),
    coverHue: 200,
  },
  {
    id: "cl-qurum-eye", name: "Qurum Vision Eye Center", name_ar: "مركز القرم للعيون", name_ar_status: "verified",
    type: "optical", area: "Qurum", area_ar: "القرم", city: "Muscat", city_ar: "مسقط",
    description: "Comprehensive eye care — exams, retina imaging and LASIK consultations.",
    description_ar: "رعاية متكاملة للعيون — فحوصات وتصوير الشبكية واستشارات الليزك.",
    rating: 4.6, reviews: 98, distance_km: 4.9, is_verified: true,
    latitude: 23.612, longitude: 58.475, phone: "+968 2456 2277", working_hours: HOURS_STD,
    services: SERVICE_MENU.optical.map((s, i) => svc(`s-eye-${i}`, s[0], s[1], s[2], s[3])),
    coverHue: 230,
  },
  {
    id: "cl-seeb", name: "Al Seeb Community Clinic", name_ar: "عيادة السيب الأهلية", name_ar_status: "verified",
    type: "clinic", area: "Seeb", area_ar: "السيب", city: "Muscat", city_ar: "مسقط",
    description: "Affordable everyday care for the Seeb community, walk-ins welcome.",
    description_ar: "رعاية يومية بأسعار مناسبة لأهالي السيب، ويُستقبل الحضور المباشر.",
    rating: 4.5, reviews: 645, distance_km: 18.6, is_verified: true,
    latitude: 23.6702, longitude: 58.189, phone: "+968 2442 3355", working_hours: HOURS_STD,
    services: SERVICE_MENU.clinic.map((s, i) => svc(`s-seeb-${i}`, s[0], s[1], s[2], s[3])),
    coverHue: 195,
  },
];

const CLINIC_TYPES: Clinic["type"][] = ["clinic", "clinic", "clinic", "dental", "dental", "hospital", "lab", "physiotherapy", "optical", "clinic"];

function makeClinic(i: number): ClinicSeed {
  // Independent hash per attribute — adjacent bit-shifts of one hash are
  // correlated across similar keys and cluster the catalog badly.
  const h = (attr: string) => hash(`clinic-${i}-${attr}`);
  const type = CLINIC_TYPES[h("type") % CLINIC_TYPES.length];
  const stem = CLINIC_STEMS[h("stem") % CLINIC_STEMS.length];
  const [areaEn, areaAr, cityEn, cityAr, lat0, lng0] = AREAS[h("area") % AREAS.length];
  const lat = lat0 + ((h("lat") % 19) - 9) / 950;
  const lng = lng0 + ((h("lng") % 19) - 9) / 950;
  const kind = CLINIC_KIND[type];
  const menu = menuFor(type, h);
  const jitter = 1 + ((h("jitter") % 5) - 2) / 20; // ±10% price variation
  return {
    id: `cl-g${i}`,
    name: kind.en(stem[0]),
    name_ar: kind.ar(stem[1]),
    name_ar_status: "verified",
    type,
    area: areaEn, area_ar: areaAr, city: cityEn, city_ar: cityAr,
    description: `Trusted ${type === "hospital" ? "hospital" : "care provider"} serving ${areaEn} families.`,
    description_ar: `${type === "hospital" ? "مستشفى موثوق يخدم" : "جهة رعاية موثوقة تخدم"} أهالي ${areaAr}.`,
    rating: Math.round((4.1 + (h("rating") % 9) / 10) * 10) / 10,
    reviews: range(h("reviews"), 6, 480),
    distance_km: distanceKm(lat, lng),
    is_verified: h("verified") % 5 !== 0,
    latitude: lat, longitude: lng,
    phone: `+968 2${range(h("ph1"), 400, 499)} ${range(h("ph2"), 1000, 9899)}`,
    working_hours: type === "hospital" ? HOURS_247 : HOURS_STD,
    services: menu.map((s, k) => svc(`s-g${i}-${k}`, s[0], s[1], Math.max(2, Math.round(s[2] * jitter)), s[3])),
    coverHue: 190 + (h("hue") % 110),
  };
}

/**
 * Deterministic promo tag — most items stay untagged on purpose.
 * `featured` is NOT a tag: featured clinics live in their own curated home
 * section and must not blend into the promo-badge noise.
 */
function clinicTag(c: ClinicSeed): Tag | null {
  const seed = hash(c.id);
  if (c.working_hours[0]?.open === "00:00") return seed % 2 === 0 ? { key: "open247" } : null;
  if (c.reviews < 20) return { key: "new" };
  if ((c.distance_km ?? 99) <= 2.5 && seed % 3 === 0) return { key: "nearest" };
  if (c.rating >= 4.8 && seed % 4 === 0) return { key: "topRated" };
  return null;
}

const CLINIC_SEEDS: ClinicSeed[] = [...ANCHOR_CLINICS, ...Array.from({ length: 72 }, (_, i) => makeClinic(i))];

/* ------------------------------------------------------------------ */
/* Doctors — 12 crafted anchors + a roster generated per clinic         */
/* ------------------------------------------------------------------ */
const doc = (
  id: string, full_name: string, full_name_ar: string, specialty: string, clinicId: string,
  rating: number, reviews: number, fee: number, gender: "male" | "female", exp: number,
  languages: string[], about: string, about_ar: string, hue: number, title: string, title_ar: string,
): Doctor => {
  const clinic = CLINIC_SEEDS.find((c) => c.id === clinicId)!;
  return {
    id, full_name, full_name_ar, full_name_ar_status: "verified", specialty, title, title_ar,
    facility_id: clinicId, facility: clinic.name, facility_ar: clinic.name_ar,
    rating, reviews, fee_omr: fee, distance_km: clinic.distance_km, gender,
    experience_years: exp, languages, about, about_ar, avatarHue: hue,
  };
};

const ANCHOR_DOCTORS: Doctor[] = [
  doc("dr-maryam", "Dr. Maryam Al Balushi", "د. مريم البلوشية", "obgyn", "cl-muzn", 4.9, 214, 20, "female", 14, ["ar", "en"],
    "Senior consultant in obstetrics & gynecology, special interest in high-risk pregnancy care. Led the maternity unit at Al Muzn since 2019.",
    "استشارية أولى في النساء والولادة، مهتمة برعاية حالات الحمل عالية الخطورة. تقود وحدة الولادة في مستشفى المُزن منذ 2019.",
    268, "Senior Consultant", "استشارية أولى"),
  doc("dr-ahmed", "Dr. Ahmed Al Harthy", "د. أحمد الحارثي", "cardiology", "cl-muzn", 4.8, 186, 25, "male", 18, ["ar", "en"],
    "Interventional cardiologist trained in Germany. Performs angiography and manages hypertension and heart-failure clinics.",
    "استشاري قلب تداخلي تدرّب في ألمانيا. يجري القسطرة التشخيصية ويشرف على عيادات الضغط وقصور القلب.",
    262, "Consultant", "استشاري"),
  doc("dr-sara", "Dr. Sara Al Riyami", "د. سارة الريامية", "dermatology", "cl-mouj", 4.7, 152, 18, "female", 9, ["ar", "en"],
    "Dermatologist focusing on acne, pigmentation and cosmetic dermatology with laser certification.",
    "أخصائية جلدية تركّز على حب الشباب والتصبغات والتجميل، وحاصلة على شهادة الليزر.",
    288, "Specialist", "أخصائية"),
  doc("dr-khalid", "Dr. Khalid Al Lawati", "د. خالد اللواتي", "dental", "cl-nakhal", 4.9, 321, 15, "male", 12, ["ar", "en"],
    "Cosmetic and restorative dentist known for painless root canal treatment and smile design.",
    "طبيب أسنان تجميلي وترميمي معروف بعلاج العصب دون ألم وتصميم الابتسامة.",
    245, "Specialist", "أخصائي"),
  doc("dr-noura", "Dr. Noura Al Hinai", "د. نورة الهنائية", "pediatrics", "cl-luban", 4.9, 268, 12, "female", 11, ["ar", "en"],
    "Pediatrician loved by little patients — growth follow-up, vaccination schedules and newborn care.",
    "طبيبة أطفال يحبها الصغار — متابعة النمو وجداول التطعيم ورعاية حديثي الولادة.",
    280, "Specialist", "أخصائية"),
  doc("dr-said", "Dr. Said Al Busaidi", "د. سعيد البوسعيدي", "orthopedics", "cl-muzn", 4.6, 97, 22, "male", 21, ["ar", "en"],
    "Orthopedic surgeon — knee and shoulder injuries, joint replacement and sports medicine.",
    "جراح عظام — إصابات الركبة والكتف واستبدال المفاصل والطب الرياضي.",
    250, "Senior Consultant", "استشاري أول"),
  doc("dr-fatma", "Dr. Fatma Al Maamari", "د. فاطمة المعمرية", "general", "cl-luban", 4.8, 342, 8, "female", 13, ["ar", "en"],
    "Family physician managing diabetes, asthma and preventive care for all ages.",
    "طبيبة أسرة تتابع السكري والربو والرعاية الوقائية لجميع الأعمار.",
    270, "Family Physician", "طبيبة أسرة"),
  doc("dr-rashid", "Dr. Rashid Al Amri", "د. راشد العامري", "ophthalmology", "cl-qurum-eye", 4.7, 118, 16, "male", 15, ["ar", "en"],
    "Ophthalmologist — cataract surgery, glaucoma management and pediatric vision screening.",
    "طبيب عيون — جراحة الساد ومتابعة الجلوكوما وفحص نظر الأطفال.",
    230, "Consultant", "استشاري"),
  doc("dr-anil", "Dr. Anil Nair", "د. أنيل ناير", "general", "cl-seeb", 4.6, 423, 5, "male", 24, ["en", "hi", "ml"],
    "Trusted GP serving Seeb families for two decades — everyday illness, chronic disease reviews and health certificates.",
    "طبيب عام موثوق يخدم عائلات السيب منذ عقدين — الأمراض اليومية ومراجعات الأمراض المزمنة والشهادات الصحية.",
    205, "General Practitioner", "طبيب عام"),
  doc("dr-layla", "Dr. Layla Al Zadjali", "د. ليلى الزدجالية", "mental", "cl-mouj", 4.9, 89, 25, "female", 8, ["ar", "en"],
    "Clinical psychologist — anxiety, burnout and CBT, in Arabic and English.",
    "أخصائية نفسية إكلينيكية — القلق والإرهاق والعلاج المعرفي السلوكي، بالعربية والإنجليزية.",
    295, "Clinical Psychologist", "أخصائية نفسية"),
  doc("dr-omar", "Dr. Omar Al Farsi", "د. عمر الفارسي", "physio", "cl-physio", 4.8, 143, 10, "male", 7, ["ar", "en"],
    "Physiotherapist — back and neck programs, post-surgery rehab and athlete recovery.",
    "أخصائي علاج طبيعي — برامج الظهر والرقبة والتأهيل بعد العمليات وتعافي الرياضيين.",
    200, "Physiotherapist", "أخصائي علاج طبيعي"),
  doc("dr-hanan", "Dr. Hanan Al Kindi", "د. حنان الكندية", "ent", "cl-luban", 4.7, 134, 14, "female", 10, ["ar", "en"],
    "ENT specialist — sinus problems, tonsillitis, hearing checks and children's ENT.",
    "أخصائية أنف وأذن وحنجرة — الجيوب الأنفية واللوز وفحوص السمع وأنف وأذن الأطفال.",
    258, "Specialist", "أخصائية"),
];

/** Extra doctors doubling up on a specialty the facility already staffs. */
const EXTRA_DOCTORS: Record<Clinic["type"], [number, number]> = {
  hospital: [2, 6],
  clinic: [0, 2],
  dental: [1, 3],
  lab: [1, 2],
  physiotherapy: [1, 3],
  optical: [1, 3],
};

type Name = { en: string; ar: string; gender: "male" | "female" };

/**
 * Every name the pools can produce. Doctors claim one by index instead of
 * re-rolling a hash: this hash correlates badly across near-identical keys, so
 * re-rolling walked a handful of names and produced armies of namesakes.
 */
const OMANI_NAMES: Name[] = [
  ...MALE.flatMap((f) => NISBA.map((n) => ({ en: `${f[0]} ${n[0]}`, ar: `${f[1]} ${n[1]}`, gender: "male" as const }))),
  ...FEMALE.flatMap((f) => NISBA.map((n) => ({ en: `${f[0]} ${n[0]}`, ar: `${f[1]} ${n[2]}`, gender: "female" as const }))),
];
const EXPAT_NAMES: Name[] = EXPAT_FIRST.flatMap((f) =>
  EXPAT_LAST.map((l) => ({ en: `${f[0]} ${l[0]}`, ar: `${f[1]} ${l[1]}`, gender: f[2] })),
);

/** Two doctors with the same full name read as a data bug, so names are unique. */
const usedNames = new Set<string>(ANCHOR_DOCTORS.map((d) => d.full_name.replace(/^Dr\. /, "")));

/** Claim the first free name at or after the hashed index. */
function claimName(seed: number, isExpat: boolean): Name {
  const pool = isExpat ? EXPAT_NAMES : OMANI_NAMES;
  for (let i = 0; i < pool.length; i++) {
    const candidate = pool[(seed + i) % pool.length];
    if (!usedNames.has(candidate.en)) {
      usedNames.add(candidate.en);
      return candidate;
    }
  }
  return pool[seed % pool.length]; // pool exhausted — 740 names vs ~450 doctors, so unreachable
}

function makeDoctor(clinic: ClinicSeed, specialty: string, k: number): Doctor {
  const h = (attr: string) => hash(`doctor-${clinic.id}-${k}-${attr}`);
  const meta = ABOUT[specialty];
  const isExpat = h("expat") % 9 === 0;
  const { en: nameEn, ar: nameAr, gender } = claimName(h("name"), isExpat);
  const [feeLo, feeHi] = meta.fee;
  return {
    id: `dr-${clinic.id.replace(/^cl-/, "")}-${k}`,
    full_name: `Dr. ${nameEn}`,
    full_name_ar: `د. ${nameAr}`,
    full_name_ar_status: "verified",
    specialty,
    title: meta.title,
    title_ar: gender === "female" ? meta.title_ar_f : meta.title_ar,
    facility_id: clinic.id,
    facility: clinic.name,
    facility_ar: clinic.name_ar,
    rating: Math.round((4.2 + (h("rating") % 8) / 10) * 10) / 10,
    reviews: range(h("reviews"), 4, 460),
    fee_omr: range(h("fee"), feeLo, feeHi),
    distance_km: clinic.distance_km,
    gender,
    experience_years: range(h("exp"), 4, 28),
    languages: isExpat ? ["en", "hi"] : h("lang") % 3 === 0 ? ["ar", "en", "hi"] : ["ar", "en"],
    about: meta.en,
    about_ar: meta.ar,
    avatarHue: 190 + (h("hue") % 110),
  };
}

/** Static doctor tag — the dynamic "last {n} slots" tag is added at runtime. */
function doctorTag(dr: Doctor): Tag | null {
  const seed = hash(dr.id + "tag");
  if (dr.reviews < 15) return { key: "new" };
  if (dr.rating >= 4.85 && dr.reviews >= 180 && seed % 3 === 0) return { key: "topRated" };
  if (dr.reviews >= 320 && seed % 3 === 1) return { key: "booksFast" };
  if ((dr.distance_km ?? 99) <= 2.5 && seed % 4 === 0) return { key: "nearest" };
  return null;
}

/* ------------------------------------------------------------------ */
/* Doctor services beyond consultation (client feedback 2026-08-20):   */
/* some doctors dress wounds or clean ears — consultation stays the    */
/* headline, extras collapse behind "+n more" on the doctor screen.    */
/* ------------------------------------------------------------------ */
type SvcTemplate = [en: string, ar: string, priceOMR: number];

const EXTRA_SERVICES: Record<string, SvcTemplate[]> = {
  general: [
    ["Wound dressing", "تضميد الجروح", 5],
    ["Ear irrigation (wax removal)", "غسيل الأذن وإزالة الشمع", 7],
    ["Travel & school vaccinations", "تطعيمات السفر والمدارس", 10],
    ["IV vitamin drip", "مغذّي فيتامينات وريدي", 15],
  ],
  ent: [
    ["Ear cleaning (microsuction)", "تنظيف الأذن بالشفط الدقيق", 12],
    ["Nasal endoscopy", "منظار الأنف", 18],
    ["Hearing test", "فحص السمع", 10],
  ],
  dental: [
    ["Scaling & polishing", "تنظيف وتلميع الأسنان", 12],
    ["Tooth filling", "حشو الأسنان", 15],
    ["Tooth extraction", "خلع الأسنان", 18],
    ["Teeth whitening", "تبييض الأسنان", 45],
  ],
  dermatology: [
    ["Cryotherapy (wart removal)", "العلاج بالتبريد لإزالة الثآليل", 15],
    ["Laser session", "جلسة ليزر", 25],
    ["Chemical peel", "تقشير كيميائي", 22],
  ],
  cardiology: [
    ["ECG", "تخطيط القلب", 8],
    ["Echocardiogram", "تصوير صدى القلب", 25],
    ["24h Holter monitor", "جهاز هولتر 24 ساعة", 30],
  ],
  obgyn: [
    ["Ultrasound scan", "تصوير بالموجات فوق الصوتية", 15],
    ["Pap smear", "مسحة عنق الرحم", 12],
  ],
  pediatrics: [
    ["Vaccination visit", "زيارة تطعيم", 8],
    ["Growth & nutrition check", "فحص النمو والتغذية", 10],
  ],
  orthopedics: [
    ["Joint injection", "حقنة مفصل", 20],
    ["Cast application", "تركيب جبيرة", 18],
  ],
  ophthalmology: [
    ["Comprehensive vision test", "فحص نظر شامل", 10],
    ["Retina imaging", "تصوير الشبكية", 20],
  ],
  physio: [
    ["Therapy session", "جلسة علاج طبيعي", 12],
    ["Dry needling session", "جلسة إبر جافة", 15],
    ["Sports massage", "مساج رياضي", 14],
  ],
  mental: [["Therapy session (50 min)", "جلسة علاج نفسي (50 دقيقة)", 25]],
  nutrition: [
    ["Body composition analysis", "تحليل مكونات الجسم", 8],
    ["Personalized diet plan", "خطة غذائية مخصصة", 12],
  ],
};

/** Demo anchors keep curated menus — the client's own examples must show. */
const ANCHOR_SERVICE_IDS: Record<string, number[]> = {
  "dr-fatma": [0, 1, 2], // GP — wound dressing, ear irrigation, vaccinations
  "dr-hanan": [0, 1, 2], // ENT — ear cleaning, endoscopy, hearing test
  "dr-khalid": [0, 1, 3],
  "dr-sara": [0, 1],
  "dr-ahmed": [0, 1, 2],
};

function servicesFor(dr: Doctor): DoctorService[] | undefined {
  const pool = EXTRA_SERVICES[dr.specialty];
  if (!pool) return undefined;
  const toService = (tpl: SvcTemplate, k: number, jitter = 0): DoctorService => ({
    id: `${dr.id}-svc-${k}`,
    name: tpl[0],
    name_ar: tpl[1],
    price_omr: Math.max(2, Math.round(tpl[2] * (1 + jitter))),
  });
  const curated = ANCHOR_SERVICE_IDS[dr.id];
  if (curated) return curated.filter((i) => pool[i]).map((i, k) => toService(pool[i], k));
  const h = (attr: string) => hash(`${dr.id}-svc-${attr}`);
  // 0..pool.length, so a fair share of doctors stay consultation-only.
  const n = h("count") % (pool.length + 1);
  if (!n) return undefined;
  const start = h("start") % pool.length;
  return Array.from({ length: n }, (_, k) =>
    toService(pool[(start + k) % pool.length], k, ((h(`p${k}`) % 5) - 2) / 20),
  );
}

/**
 * A facility's roster covers exactly the specialties its menu advertises —
 * crafted anchors first, generated doctors filling the gaps. That invariant is
 * what makes specialty search honest: a clinic can never surface for a service
 * it has nobody to perform, and every "Book" button has a doctor to route to.
 */
function rosterFor(clinic: ClinicSeed): Doctor[] {
  const h = (attr: string) => hash(`roster-${clinic.id}-${attr}`);
  const advertised = [...new Set(clinic.services.map((s) => s.specialty).filter(Boolean) as string[])];
  const anchored = new Set(ANCHOR_DOCTORS.filter((d) => d.facility_id === clinic.id).map((d) => d.specialty));
  const roster = advertised.filter((sp) => !anchored.has(sp)).map((sp, k) => makeDoctor(clinic, sp, k));
  const [lo, hi] = EXTRA_DOCTORS[clinic.type];
  const extras = range(h("extras"), lo, hi);
  for (let e = 0; e < extras; e++) {
    roster.push(makeDoctor(clinic, advertised[h(`extra-${e}`) % advertised.length], 50 + e));
  }
  return roster;
}

export const DOCTORS: Doctor[] = [...ANCHOR_DOCTORS, ...CLINIC_SEEDS.flatMap((c) => rosterFor(c))].map((dr) => ({
  ...dr,
  tag: doctorTag(dr),
  services: servicesFor(dr),
}));

/** doctors_count is the roster length — a badge that disagrees with the list is a bug. */
export const CLINICS: Clinic[] = CLINIC_SEEDS.map((c) => ({
  ...c,
  doctors_count: DOCTORS.filter((d) => d.facility_id === c.id).length,
  tag: clinicTag(c),
}));

/* ------------------------------------------------------------------ */
/* Health packages — 30, from bilingual templates                      */
/* ------------------------------------------------------------------ */
type Inc = { en: string; ar: string };
const INC = (en: string, ar: string): Inc => ({ en, ar });

const PACKAGE_TEMPLATES: { en: string; ar: string; base: number; tests: number; hours: number; specialty: string; includes: Inc[] }[] = [
  {
    en: "Comprehensive Health Check", ar: "فحص الصحة الشامل", base: 45, tests: 34, hours: 24, specialty: "general",
    includes: [INC("Complete blood count", "تعداد الدم الكامل"), INC("Lipid profile", "مستوى الدهون والكوليسترول"), INC("Liver & kidney function", "وظائف الكبد والكلى"), INC("Vitamin D & B12", "فيتامين د و ب12"), INC("Thyroid (TSH)", "الغدة الدرقية"), INC("HbA1c (diabetes)", "السكر التراكمي"), INC("ECG", "تخطيط القلب"), INC("Doctor review of results", "مراجعة الطبيب للنتائج")],
  },
  {
    en: "Women's Wellness Package", ar: "باقة صحة المرأة", base: 38, tests: 22, hours: 48, specialty: "obgyn",
    includes: [INC("Hormone panel", "فحص الهرمونات"), INC("Iron & ferritin", "الحديد ومخازنه"), INC("Pap smear", "مسحة عنق الرحم"), INC("Breast ultrasound", "تصوير الثدي بالموجات"), INC("Bone density scan", "فحص كثافة العظام"), INC("Gynecology consultation", "استشارة نساء وولادة")],
  },
  {
    en: "Healthy Heart Package", ar: "باقة القلب السليم", base: 29.5, tests: 12, hours: 24, specialty: "cardiology",
    includes: [INC("ECG", "تخطيط القلب"), INC("Cardiac echo", "الموجات الصوتية للقلب"), INC("Lipid profile", "مستوى الدهون"), INC("Blood pressure monitoring", "متابعة ضغط الدم"), INC("Cardiologist consultation", "استشارة طبيب قلب")],
  },
  {
    en: "Pre-Marital Screening", ar: "فحص ما قبل الزواج", base: 25, tests: 14, hours: 48, specialty: "lab",
    includes: [INC("Blood group & compatibility", "فصيلة الدم والتوافق"), INC("Genetic blood disorders", "أمراض الدم الوراثية"), INC("Infectious screening", "الفحوصات المعدية"), INC("Consultation & certificate", "استشارة وإصدار الشهادة")],
  },
  {
    en: "Diabetes Care Package", ar: "باقة رعاية السكري", base: 22, tests: 10, hours: 24, specialty: "nutrition",
    includes: [INC("HbA1c", "السكر التراكمي"), INC("Fasting glucose", "سكر صائم"), INC("Kidney function", "وظائف الكلى"), INC("Foot examination", "فحص القدم"), INC("Dietitian consultation", "استشارة تغذية")],
  },
  {
    en: "Child Wellness Package", ar: "باقة صحة الطفل", base: 18, tests: 9, hours: 24, specialty: "pediatrics",
    includes: [INC("Growth assessment", "تقييم النمو"), INC("CBC & iron", "تعداد الدم والحديد"), INC("Vitamin D", "فيتامين د"), INC("Pediatric consultation", "استشارة طبيب أطفال")],
  },
  {
    en: "Men's Health Package", ar: "باقة صحة الرجل", base: 32, tests: 18, hours: 24, specialty: "general",
    includes: [INC("Hormone panel", "فحص الهرمونات"), INC("PSA screening", "فحص البروستاتا"), INC("Lipid & liver profile", "الدهون ووظائف الكبد"), INC("ECG", "تخطيط القلب"), INC("Doctor consultation", "استشارة طبيب")],
  },
  {
    en: "Dental Care Package", ar: "باقة العناية بالأسنان", base: 20, tests: 4, hours: 2, specialty: "dental",
    includes: [INC("Checkup & X-ray", "كشف وأشعة"), INC("Deep cleaning", "تنظيف عميق"), INC("Polishing", "تلميع"), INC("Fluoride treatment", "علاج الفلورايد")],
  },
  {
    en: "Skin Glow Package", ar: "باقة نضارة البشرة", base: 35, tests: 3, hours: 2, specialty: "dermatology",
    includes: [INC("Skin analysis", "تحليل البشرة"), INC("Deep-clean facial", "تنظيف عميق للبشرة"), INC("Hydration session", "جلسة ترطيب"), INC("Dermatologist consultation", "استشارة جلدية")],
  },
  {
    en: "Back & Posture Program", ar: "برنامج الظهر والقوام", base: 40, tests: 6, hours: 2, specialty: "physio",
    includes: [INC("Physio assessment", "تقييم علاج طبيعي"), INC("4 therapy sessions", "4 جلسات علاجية"), INC("Posture plan", "خطة تصحيح القوام"), INC("Home exercise guide", "دليل تمارين منزلية")],
  },
];

function makePackages(): HealthPackage[] {
  const out: HealthPackage[] = [];
  for (let i = 0; i < 30; i++) {
    const h = (attr: string) => hash(`pkg-${i}-${attr}`);
    const tpl = PACKAGE_TEMPLATES[i % PACKAGE_TEMPLATES.length];
    // Only offer a package where somebody can actually perform it — a dental
    // package at a laboratory is the same wrong-doctor trap as an untagged service.
    const eligible = CLINICS.filter((c) => DOCTORS.some((d) => d.facility_id === c.id && d.specialty === tpl.specialty));
    const clinic = eligible[h("clinic") % eligible.length];
    const tier = 0.85 + (h("tier") % 5) / 10; // 0.85–1.25 price tier
    const price = Math.round(tpl.base * tier * 2) / 2;
    const hasDiscount = h("disc") % 5 < 2; // ~40%
    out.push({
      id: `pkg-${i}`,
      name: tpl.en,
      name_ar: tpl.ar,
      clinic_id: clinic.id,
      specialty: tpl.specialty,
      price_omr: price,
      old_price_omr: hasDiscount ? Math.round(price * (1.2 + (h("disc2") % 3) / 10) * 2) / 2 : undefined,
      tests_count: tpl.tests,
      hours_to_results: tpl.hours,
      popular: i === 0 || i === 4,
      includes: tpl.includes,
    });
  }
  const cheapestId = out.reduce((min, p) => (p.price_omr < min.price_omr ? p : min), out[0]).id;
  return out.map((p) => {
    let tag: Tag | null = null;
    if (p.old_price_omr) tag = { key: "discount", n: Math.round((1 - p.price_omr / p.old_price_omr) * 100) };
    else if (p.popular) tag = { key: "popular" };
    else if (p.id === cheapestId) tag = { key: "lowestPrice" };
    return { ...p, tag };
  });
}

export const PACKAGES: HealthPackage[] = makePackages();

/* ------------------------------------------------------------------ */
/* Patient, family, insurance (display only), history                  */
/* ------------------------------------------------------------------ */
export const PROFILE: PatientProfile = {
  full_name: "Aisha Al Harthy",
  full_name_ar: "عائشة الحارثية",
  phone: "+968 9123 4567",
  email: "aisha@example.om",
  date_of_birth: "1994-03-12",
  gender: "female",
  blood_group: "O+",
  civil_number: "12345678",
  address: "Al Khuwair, Muscat",
  address_ar: "الخوير، مسقط",
  emergency_contact: "Salim Al Harthy · +968 9111 1111",
  avatarHue: 275,
};

export const FAMILY: FamilyMember[] = [
  { id: "fam-salim", full_name: "Salim Al Harthy", full_name_ar: "سالم الحارثي", relation: "spouse", date_of_birth: "1989-05-02", gender: "male" },
  { id: "fam-lina", full_name: "Lina Al Harthy", full_name_ar: "لينا الحارثية", relation: "child", date_of_birth: "2019-09-14", gender: "female" },
  { id: "fam-mariam", full_name: "Mariam Al Wahaibi", full_name_ar: "مريم الوهيبية", relation: "parent", date_of_birth: "1964-01-20", gender: "female" },
];

/** Display/storage only — no claims execution in-app. */
export const INSURANCE: InsuranceCard = {
  provider: "Liva Insurance",
  provider_ar: "ليفا للتأمين",
  policy_number: "LV-2026-88412",
  member_id: "00841273",
  expiry_date: "2027-03-31",
  coverage: "Premium network — private clinics & hospitals",
  coverage_ar: "الشبكة الممتازة — عيادات ومستشفيات خاصة",
  is_active: true,
};

export const MEDICAL_HISTORY: MedicalHistory = {
  allergies: [
    { en: "Penicillin", ar: "البنسلين" },
    { en: "Pollen", ar: "حبوب اللقاح" },
  ],
  conditions: [{ en: "Asthma (mild)", ar: "الربو (خفيف)" }],
  medications: ["Salbutamol inhaler 100mcg"],
  surgeries: [{ en: "Appendectomy (2015)", ar: "استئصال الزائدة الدودية (2015)" }],
  smoking_status: "never",
};

const EMPTY_HISTORY: MedicalHistory = {
  allergies: [],
  conditions: [],
  medications: [],
  surgeries: [],
  smoking_status: "never",
};

/**
 * Records are per person — switching profiles must show that person's file,
 * not the account holder's. Members added in-session start with an empty file.
 */
export const HISTORY_BY_PERSON: Record<string, MedicalHistory> = {
  self: MEDICAL_HISTORY,
  "fam-salim": {
    allergies: [],
    conditions: [{ en: "Lower back strain (recurring)", ar: "إجهاد أسفل الظهر (متكرر)" }],
    medications: [],
    surgeries: [{ en: "Knee arthroscopy (2021)", ar: "تنظير الرُكبة (2021)" }],
    smoking_status: "former",
  },
  "fam-lina": {
    allergies: [{ en: "Peanuts", ar: "الفول السوداني" }],
    conditions: [],
    medications: [],
    surgeries: [],
    smoking_status: "never",
  },
  "fam-mariam": {
    allergies: [{ en: "Sulfa drugs", ar: "أدوية السلفا" }],
    conditions: [
      { en: "Type 2 diabetes", ar: "السكري من النوع الثاني" },
      { en: "Hypertension", ar: "ارتفاع ضغط الدم" },
    ],
    medications: ["Metformin 850mg", "Amlodipine 5mg"],
    surgeries: [{ en: "Cataract surgery — right eye (2023)", ar: "عملية الساد — العين اليمنى (2023)" }],
    smoking_status: "never",
  },
};

export const NO_HISTORY = EMPTY_HISTORY;

/* ------------------------------------------------------------------ */
/* Appointments (dates computed relative to today)                     */
/* ------------------------------------------------------------------ */
export const APPOINTMENTS_SEED = [
  {
    id: "apt-1", reference_number: "ML-4A7K92", doctor_id: "dr-ahmed", slot_date: d(2), slot_start: "10:30",
    status: "confirmed" as const, payment_status: "paid" as const, reason_for_visit: "متابعة ضغط الدم",
    fee_omr: 25, patient_id: "self", patient_name: "Aisha Al Harthy", patient_name_ar: "عائشة الحارثية", clinic_id: "cl-muzn",
  },
  {
    id: "apt-2", reference_number: "ML-8Q2M41", doctor_id: "dr-khalid", slot_date: d(6), slot_start: "17:00",
    status: "pending" as const, payment_status: "unpaid" as const, reason_for_visit: "تنظيف الأسنان",
    fee_omr: 15, patient_id: "self", patient_name: "Aisha Al Harthy", patient_name_ar: "عائشة الحارثية", clinic_id: "cl-nakhal",
  },
  {
    id: "apt-3", reference_number: "ML-2C9F17", doctor_id: "dr-noura", slot_date: d(-12), slot_start: "16:30",
    status: "completed" as const, payment_status: "paid" as const, reason_for_visit: "حرارة وتعب عام",
    fee_omr: 12, patient_id: "fam-lina", patient_name: "Lina Al Harthy", patient_name_ar: "لينا الحارثية", clinic_id: "cl-luban",
  },
  {
    id: "apt-4", reference_number: "ML-7T1B08", doctor_id: "dr-fatma", slot_date: d(-60), slot_start: "09:00",
    status: "completed" as const, payment_status: "paid" as const, reason_for_visit: "مراجعة الربو",
    fee_omr: 8, patient_id: "self", patient_name: "Aisha Al Harthy", patient_name_ar: "عائشة الحارثية", clinic_id: "cl-luban",
  },
  /* Family visits — so switching profiles shows a real file, not an empty one. */
  {
    id: "apt-5", reference_number: "ML-9K3D55", doctor_id: "dr-said", slot_date: d(4), slot_start: "18:30",
    status: "confirmed" as const, payment_status: "paid" as const, reason_for_visit: "ألم أسفل الظهر",
    fee_omr: 22, patient_id: "fam-salim", patient_name: "Salim Al Harthy", patient_name_ar: "سالم الحارثي", clinic_id: "cl-muzn",
  },
  {
    id: "apt-6", reference_number: "ML-5R8N23", doctor_id: "dr-omar", slot_date: d(-9), slot_start: "17:30",
    status: "completed" as const, payment_status: "paid" as const, reason_for_visit: "جلسة علاج طبيعي",
    fee_omr: 10, patient_id: "fam-salim", patient_name: "Salim Al Harthy", patient_name_ar: "سالم الحارثي", clinic_id: "cl-physio",
  },
  {
    id: "apt-7", reference_number: "ML-3W6H81", doctor_id: "dr-ahmed", slot_date: d(1), slot_start: "11:00",
    status: "confirmed" as const, payment_status: "paid" as const, reason_for_visit: "مراجعة ضغط الدم والسكري",
    fee_omr: 25, patient_id: "fam-mariam", patient_name: "Mariam Al Wahaibi", patient_name_ar: "مريم الوهيبية", clinic_id: "cl-muzn",
  },
  {
    id: "apt-8", reference_number: "ML-6Y4L37", doctor_id: "dr-rashid", slot_date: d(-40), slot_start: "09:30",
    status: "completed" as const, payment_status: "paid" as const, reason_for_visit: "متابعة بعد عملية الساد",
    fee_omr: 16, patient_id: "fam-mariam", patient_name: "Mariam Al Wahaibi", patient_name_ar: "مريم الوهيبية", clinic_id: "cl-qurum-eye",
  },
  {
    id: "apt-9", reference_number: "ML-1J7V64", doctor_id: "dr-noura", slot_date: d(8), slot_start: "16:30",
    status: "confirmed" as const, payment_status: "paid" as const, reason_for_visit: "تطعيم دوري",
    fee_omr: 12, patient_id: "fam-lina", patient_name: "Lina Al Harthy", patient_name_ar: "لينا الحارثية", clinic_id: "cl-luban",
  },
];

/* ------------------------------------------------------------------ */
/* Notifications — bilingual (labs/prescriptions out of scope)         */
/* ------------------------------------------------------------------ */
export const NOTIFICATIONS: NotificationItem[] = [
  {
    id: "n-1", kind: "appointment",
    title: "Reminder: your visit is soon", title_ar: "تذكير: موعدك قريب",
    body: "Dr. Ahmed Al Harthy · Al Muzn Hospital — bring your previous reports.",
    body_ar: "د. أحمد الحارثي · مستشفى المُزن — لا تنسي إحضار تقاريرك السابقة.",
    minutes_ago: 30, unread: true, appointmentId: "apt-1",
  },
  {
    id: "n-2", kind: "general",
    title: "20% off the Comprehensive Health Check", title_ar: "خصم 20٪ على فحص الصحة الشامل",
    body: "This month at Al Muzn Specialist Hospital — book from the packages page.",
    body_ar: "هذا الشهر في مستشفى المُزن التخصصي — احجزي من صفحة الباقات.",
    minutes_ago: 180, unread: true,
  },
  {
    id: "n-3", kind: "payment",
    title: "Payment received", title_ar: "تم استلام الدفع",
    body: "OMR 26.250 for your cardiology visit — receipt available.",
    body_ar: "26.250 ر.ع لموعد القلب — الإيصال متوفر.",
    minutes_ago: 60 * 26, unread: false,
  },
  {
    id: "n-4", kind: "appointment",
    title: "How was Lina's visit?", title_ar: "كيف كانت زيارة لينا؟",
    body: "Rate your visit to Dr. Noura Al Hinai — it helps other parents.",
    body_ar: "قيّمي زيارتكم للدكتورة نورة الهنائية — تقييمك يفيد بقية الأهالي.",
    minutes_ago: 60 * 24 * 11, unread: false, appointmentId: "apt-3",
  },
  {
    id: "n-5", kind: "facility",
    title: "Luban Medical Complex — Eid hours", title_ar: "مجمع لُبان الطبي — دوام العيد",
    body: "The complex operates 9 AM – 2 PM during the Eid holiday.",
    body_ar: "يعمل المجمع من 9 صباحاً حتى 2 ظهراً خلال إجازة العيد.",
    minutes_ago: 60 * 24 * 20, unread: false,
  },
];

/* ------------------------------------------------------------------ */
/* Reviews pool — deterministic per doctor                             */
/* ------------------------------------------------------------------ */
export const REVIEW_POOL: Omit<Review, "id" | "date">[] = [
  { author: "Salim M.", author_ar: "سالم م.", rating: 5, comment: "Excellent doctor — explained everything clearly and didn't rush.", comment_ar: "طبيب ممتاز — شرح كل شيء بوضوح وما استعجل أبداً.", verified: true },
  { author: "Noor A.", author_ar: "نور أ.", rating: 5, comment: "The clinic was clean and the booking was smooth through the app.", comment_ar: "العيادة نظيفة والحجز عن طريق التطبيق كان سلساً.", verified: true },
  { author: "Yusuf K.", author_ar: "يوسف ك.", rating: 4, comment: "Good experience overall, short wait even at a busy hour.", comment_ar: "تجربة جيدة عموماً، والانتظار قصير حتى في وقت الذروة.", verified: true },
  { author: "Muna S.", author_ar: "منى س.", rating: 5, comment: "Very caring with children and answered all my questions.", comment_ar: "تعامل راقٍ مع الأطفال وأجابت على كل أسئلتي.", verified: true },
  { author: "Hamed R.", author_ar: "حمد ر.", rating: 4, comment: "Professional and honest about the treatment options.", comment_ar: "مهني وصريح في خيارات العلاج.", verified: true },
  { author: "Amal T.", author_ar: "أمل ت.", rating: 5, comment: "Followed up with me after the visit — rare and appreciated.", comment_ar: "تابع حالتي حتى بعد الزيارة — شيء نادر ويستحق الشكر.", verified: true },
];
