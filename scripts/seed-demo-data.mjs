/**
 * Demo dataset seeder — populates the live shared Supabase project with a
 * curated, realistic Omani healthcare landscape for the investor demo.
 *
 *   node scripts/seed-demo-data.mjs            # seed / repair everything
 *
 * What it does (idempotent — safe to re-run):
 *   1. Repairs the 112 existing HAMS test doctors in place: garbage specialty
 *      strings ("qwertygfd") become real ones, fees land in Oman's actual
 *      4–22 OMR consultation band, missing experience/languages are filled.
 *   2. Gives every active facility working hours, a description and a phone.
 *   3. Creates ~13 new facilities covering every category the app can filter
 *      (hospital / clinic / dental / lab / physiotherapy / optical /
 *      mental-health), near Muscat and far (Nizwa, Sohar, Salalah, Sur),
 *      each with PostGIS coordinates so distance and the map work.
 *   4. Creates ~60 new doctors — male/female across all 14 specialties, with
 *      weekly availability templates (evening slots included) so every one of
 *      them is genuinely bookable through book_appointment_atomic.
 *   5. Seeds REAL review rows (bilingual) — the DB trigger
 *      reviews_maintain_target_rating recomputes avg_rating/review_count, so
 *      stars are honest aggregates, not hand-set numbers.
 *   6. Completes 5 demo patient accounts (Aisha + Salim + Fatma + Hamed +
 *      Noora): full profile, family members, past & upcoming appointments,
 *      linked reviews, and in-app notifications.
 *
 * Credentials: reads SUPABASE url + service-role key from the MediLink
 * backend's .env (never hardcoded here). The demo accounts share the password
 * already configured in this repo's .env (EXPO_PUBLIC_DEMO_PASSWORD).
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/* ------------------------------- plumbing -------------------------------- */

const HERE = dirname(fileURLToPath(import.meta.url));
const BACKEND_ENV = "/Users/thakur/Workspace/medilink/medilink/Medilink/backend/.env";
const PROTO_ENV = resolve(HERE, "../.env");

function parseEnv(path) {
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split("\n")
      .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
      .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^"|"$/g, "")]),
  );
}
const benv = parseEnv(BACKEND_ENV);
const penv = parseEnv(PROTO_ENV);
const BASE = benv.NEXT_PUBLIC_SUPABASE_URL;
const KEY = benv.SUPABASE_SERVICE_ROLE_KEY;
const DEMO_PASSWORD = penv.EXPO_PUBLIC_DEMO_PASSWORD;
if (!BASE || !KEY) throw new Error("Missing Supabase env in backend/.env");
if (!DEMO_PASSWORD) throw new Error("Missing EXPO_PUBLIC_DEMO_PASSWORD in medilink-t/.env");

const HEADERS = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

async function rest(method, path, body, extraHeaders = {}) {
  const res = await fetch(`${BASE}/rest/v1/${path}`, {
    method,
    headers: { ...HEADERS, Prefer: "return=representation", ...extraHeaders },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    const err = new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 300)}`);
    err.status = res.status;
    err.body = text;
    throw err;
  }
  return text ? JSON.parse(text) : null;
}
const get = (p) => rest("GET", p);
const post = (p, b, h) => rest("POST", p, b, h);
const patch = (p, b) => rest("PATCH", p, b);

async function adminAuth(method, path, body) {
  const res = await fetch(`${BASE}/auth/v1/${path}`, {
    method,
    headers: HEADERS,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`auth ${method} ${path} → ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

/** Deterministic PRNG — reruns produce the same dataset. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
const rngOf = (s) => mulberry32(hash(s));
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
const between = (rng, min, max) => min + Math.floor(rng() * (max - min + 1));
const hex8 = (rng) => [...Array(8)].map(() => "0123456789ABCDEF"[Math.floor(rng() * 16)]).join("");

const log = (...a) => console.log(...a);

/* ------------------------- domain reference data -------------------------- */

// Fee bands per catalog slug — Omani private-sector consultation reality (OMR).
const FEE_BAND = {
  general: [4, 8], lab: [4, 8], nutrition: [6, 10], physio: [6, 10],
  pediatrics: [6, 12], ent: [8, 14], radiology: [8, 15], obgyn: [8, 16],
  dental: [5, 15], dermatology: [10, 18], ophthalmology: [10, 18],
  orthopedics: [10, 18], mental: [10, 20], cardiology: [12, 22],
};

// Specialty display label → slug it maps to in the app (SLUG_MATCHERS).
const LABEL = {
  general: "General Medicine", dental: "Dentistry", cardiology: "Cardiology",
  pediatrics: "Pediatrics", obgyn: "Obstetrics & Gynecology", dermatology: "Dermatology",
  ophthalmology: "Ophthalmology", orthopedics: "Orthopedics", ent: "ENT",
  mental: "Mental Health", physio: "Physiotherapy", nutrition: "Clinical Nutrition",
  radiology: "Radiology", lab: "Laboratory Medicine",
};

// Existing HAMS freetext → normalized label (only rows matching keys change).
const RELABEL = {
  cardio: "Cardiology", cardiologist: "Cardiology", cardiology: "Cardiology",
  "consultant cardiologist": "Cardiology", cardialogist: "Cardiology",
  cordialogist: "Cardiology", cardiologis: "Cardiology", cardi: "Cardiology",
  dentist: "Dentistry", pediatrician: "Pediatrics", gynecologist: "Obstetrics & Gynecology",
  psychiatrist: "Psychiatry", "ent specialist": "ENT", dermatologist: "Dermatology",
  dermatology: "Dermatology", general: "General Medicine", "general physician": "General Medicine",
  orthopedic: "Orthopedics", "ophthalmologist, ent, eye specilist": "Ophthalmology",
};
const GARBAGE = new Set([
  "qwertygfd", "test12", "candof", "23erfre3", "helo", "wsdc", "cccd", "test",
  "asdf", "cxsasdf", "asdfghjhy", "erfsd", "asdfg", "asdfgh", "triuhgb",
  "medica", "fvredrf", "sadfgh", "medical", "fdd", "ms", "veterinary", "",
]);
// Underrepresented specialties the garbage rows get spread across.
const GARBAGE_POOL = [
  "Ophthalmology", "Orthopedics", "Physiotherapy", "Clinical Nutrition",
  "Radiology", "Obstetrics & Gynecology", "Mental Health", "ENT",
  "Laboratory Medicine", "Dermatology", "General Medicine", "Pediatrics",
];

function slugOfLabel(label) {
  const s = (label ?? "").toLowerCase();
  if (/cardio/.test(s)) return "cardiology";
  if (/dent/.test(s)) return "dental";
  if (/pediat|paed/.test(s)) return "pediatrics";
  if (/gyn|obst/.test(s)) return "obgyn";
  if (/derma/.test(s)) return "dermatology";
  if (/ophthal|optom|eye/.test(s)) return "ophthalmology";
  if (/ortho/.test(s)) return "orthopedics";
  if (/ent\b|otolaryn/.test(s)) return "ent";
  if (/psych|mental/.test(s)) return "mental";
  if (/physio/.test(s)) return "physio";
  if (/nutri/.test(s)) return "nutrition";
  if (/radiol|imaging/.test(s)) return "radiology";
  if (/lab|patholog/.test(s)) return "lab";
  return "general";
}
function feeFor(slug, rng) {
  const [lo, hi] = FEE_BAND[slug] ?? FEE_BAND.general;
  const inPerson = between(rng, lo, hi);
  return { in_person: inPerson, online: Math.max(3, inPerson - 2) };
}

/* -------- bilingual name pools (Omani; feminine nisba for women) ---------- */

const LAST = [
  ["Al-Harthy", "الحارثي", "الحارثية"], ["Al-Busaidi", "البوسعيدي", "البوسعيدية"],
  ["Al-Lawati", "اللواتي", "اللواتية"], ["Al-Wahaibi", "الوهيبي", "الوهيبية"],
  ["Al-Zadjali", "الزدجالي", "الزدجالية"], ["Al-Riyami", "الريامي", "الريامية"],
  ["Al-Kindi", "الكندي", "الكندية"], ["Al-Hinai", "الهنائي", "الهنائية"],
  ["Al-Maamari", "المعمري", "المعمرية"], ["Al-Balushi", "البلوشي", "البلوشية"],
  ["Al-Rawahi", "الرواحي", "الرواحية"], ["Al-Abri", "العبري", "العبرية"],
  ["Al-Siyabi", "السيابي", "السيابية"], ["Al-Habsi", "الحبسي", "الحبسية"],
  ["Al-Farsi", "الفارسي", "الفارسية"], ["Al-Ghafri", "الغافري", "الغافرية"],
  ["Al-Saadi", "السعدي", "السعدية"], ["Al-Amri", "العمري", "العمرية"],
  ["Al-Shukaili", "الشقيلي", "الشقيلية"], ["Al-Naabi", "الناعبي", "الناعبية"],
];
const FIRST_M = [
  ["Ahmed", "أحمد"], ["Mohammed", "محمد"], ["Salim", "سالم"], ["Khalid", "خالد"],
  ["Hamad", "حمد"], ["Said", "سعيد"], ["Nasser", "ناصر"], ["Talal", "طلال"],
  ["Yousuf", "يوسف"], ["Majid", "ماجد"], ["Sultan", "سلطان"], ["Faisal", "فيصل"],
  ["Ali", "علي"], ["Ibrahim", "إبراهيم"], ["Rashid", "راشد"], ["Tariq", "طارق"],
  ["Adil", "عادل"], ["Bader", "بدر"], ["Qais", "قيس"], ["Haitham", "هيثم"],
];
const FIRST_F = [
  ["Aisha", "عائشة"], ["Fatma", "فاطمة"], ["Maryam", "مريم"], ["Noora", "نورة"],
  ["Zainab", "زينب"], ["Salma", "سلمى"], ["Huda", "هدى"], ["Layla", "ليلى"],
  ["Samira", "سميرة"], ["Muna", "منى"], ["Amal", "أمل"], ["Hanan", "حنان"],
  ["Asma", "أسماء"], ["Khadija", "خديجة"], ["Zahra", "زهراء"], ["Badriya", "بدرية"],
  ["Iman", "إيمان"], ["Rahma", "رحمة"], ["Shaikha", "شيخة"], ["Wafa", "وفاء"],
  ["Jokha", "جوخة"], ["Thuraya", "ثريا"],
];
const MIDDLE = [
  ["Said", "سعيد"], ["Hamad", "حمد"], ["Saif", "سيف"], ["Nasser", "ناصر"],
  ["Khalifa", "خليفة"], ["Salim", "سالم"], ["Sulaiman", "سليمان"], ["Abdullah", "عبدالله"],
];

const usedNames = new Set();
function makeName(rng, gender) {
  for (let i = 0; i < 40; i++) {
    const [fEn, fAr] = pick(rng, gender === "female" ? FIRST_F : FIRST_M);
    const [mEn, mAr] = pick(rng, MIDDLE);
    const [lEn, lArM, lArF] = pick(rng, LAST);
    const en = `Dr. ${fEn} ${mEn} ${lEn}`;
    if (usedNames.has(en)) continue;
    usedNames.add(en);
    return { en, ar: `د. ${fAr} ${mAr} ${gender === "female" ? lArF : lArM}` };
  }
  throw new Error("name pool exhausted");
}

const QUALS = {
  general: ["MBBS", "MRCGP"], cardiology: ["MBBS", "MD (Cardiology)", "MRCP (UK)"],
  dental: ["BDS", "MFDS RCS"], pediatrics: ["MBBS", "MD (Pediatrics)", "MRCPCH"],
  obgyn: ["MBBS", "MD (Ob/Gyn)", "MRCOG"], dermatology: ["MBBS", "MD (Dermatology)"],
  ophthalmology: ["MBBS", "MS (Ophthalmology)", "FRCS"], orthopedics: ["MBBS", "MS (Orthopedics)"],
  ent: ["MBBS", "MS (ENT)"], mental: ["MBBS", "MD (Psychiatry)"],
  physio: ["BPT", "MPT (Sports)"], nutrition: ["BSc (Nutrition)", "MSc Clinical Nutrition"],
  radiology: ["MBBS", "MD (Radiology)", "FRCR"], lab: ["MBBS", "MD (Pathology)"],
};
const BIO = {
  general: "Family physician focused on preventive care, chronic disease management and whole-family wellness.",
  cardiology: "Consultant cardiologist specialising in preventive cardiology, echocardiography and hypertension care.",
  dental: "Dental surgeon covering restorative dentistry, cosmetic smile design and painless root canal treatment.",
  pediatrics: "Paediatrician with a gentle, parent-first approach to newborn care, vaccinations and childhood asthma.",
  obgyn: "Obstetrician-gynaecologist experienced in antenatal care, high-risk pregnancy and women's wellness.",
  dermatology: "Dermatologist treating acne, eczema and pigmentation, with a special interest in cosmetic dermatology.",
  ophthalmology: "Eye specialist covering cataract assessment, glaucoma screening and paediatric vision care.",
  orthopedics: "Orthopaedic surgeon focused on sports injuries, joint pain and non-surgical spine care.",
  ent: "ENT specialist managing sinus disease, tonsillitis, hearing loss and snoring disorders.",
  mental: "Psychiatrist offering confidential, stigma-free care for anxiety, depression and sleep disorders.",
  physio: "Physiotherapist specialising in post-surgical rehabilitation, back pain and sports recovery.",
  nutrition: "Clinical dietitian designing practical nutrition plans for diabetes, weight management and gut health.",
  radiology: "Radiologist reporting X-ray, ultrasound and CT with same-day results for referring physicians.",
  lab: "Consultant pathologist overseeing haematology and clinical chemistry with strict quality control.",
};

/* ----------------------------- review corpora ----------------------------- */

const REVIEW_EN = [
  "Very thorough — explained everything clearly and didn't rush the visit.",
  "Listened patiently to all my concerns. Highly recommend.",
  "The wait was short and the doctor was extremely professional.",
  "Excellent with children — my son actually enjoyed the visit!",
  "Clear diagnosis and a simple treatment plan. Felt in safe hands.",
  "Kind, respectful and answered every question I had.",
  "Booked in the morning, seen the same afternoon. Great experience.",
  "Follow-up was as good as the first visit. Very consistent care.",
  "Explained the test results in plain language. Much appreciated.",
  "Professional and punctual. The clinic was spotless.",
  "Really took the time to understand my history before prescribing.",
  "Straightforward, honest advice — no unnecessary tests.",
  "Gentle and reassuring throughout the procedure.",
  "The best specialist I have visited in Muscat so far.",
  "Good doctor, though the clinic parking was difficult.",
  "Helpful visit overall; reception was a little slow at check-in.",
];
const REVIEW_AR = [
  "دكتور محترم جداً وشرح الحالة بالتفصيل دون استعجال.",
  "استمع لكل استفساراتي بصبر واهتمام. أنصح به بشدة.",
  "الانتظار قصير والتعامل راقٍ جداً.",
  "ممتازة مع الأطفال — ابني ارتاح لها من أول زيارة.",
  "تشخيص واضح وخطة علاج بسيطة. شعرت بالاطمئنان.",
  "طبيبة لطيفة ومحترمة وأجابت على جميع أسئلتي.",
  "حجزت صباحاً وتمت المعاينة في نفس اليوم. تجربة ممتازة.",
  "المتابعة كانت بنفس جودة الزيارة الأولى. رعاية ثابتة.",
  "شرح نتائج التحاليل بلغة مفهومة. جزاه الله خيراً.",
  "احترافية والتزام بالمواعيد، والعيادة نظيفة جداً.",
  "أخذ وقته في فهم تاريخي الصحي قبل وصف العلاج.",
  "نصائح صادقة ومباشرة دون فحوصات غير ضرورية.",
  "تعامل لطيف ومطمئن طوال الإجراء.",
  "من أفضل الأخصائيين الذين زرتهم في مسقط.",
  "دكتور ممتاز لكن مواقف السيارات صعبة قليلاً.",
  "زيارة مفيدة، لكن الاستقبال كان بطيئاً بعض الشيء.",
];
const REVIEW_FAC_EN = [
  "Clean, modern facility with friendly staff and short waiting times.",
  "Reception was organised and the whole visit took under an hour.",
  "Easy parking, clear signage and very helpful nurses.",
  "Prices are reasonable and the doctors are excellent.",
  "The lab results were ready the same evening. Impressive.",
  "Comfortable waiting area and a smooth check-in experience.",
];
const REVIEW_FAC_AR = [
  "مركز نظيف وحديث وطاقم متعاون، والانتظار قصير.",
  "الاستقبال منظم والزيارة كلها أقل من ساعة.",
  "مواقف متوفرة ولوحات واضحة وممرضات متعاونات.",
  "الأسعار مناسبة والأطباء ممتازون.",
  "نتائج المختبر جاهزة في نفس اليوم. ممتاز.",
  "قاعة انتظار مريحة وتسجيل دخول سريع وسلس.",
];

/** Build n integer ratings whose mean ≈ target (e.g. 4.7). */
function ratingsFor(rng, target, n) {
  const base = Math.floor(target);
  const highCount = Math.round((target - base) * n);
  const out = [];
  for (let i = 0; i < n; i++) out.push(i < highCount ? Math.min(5, base + 1) : base);
  if (n >= 6 && rng() < 0.5) out[n - 1] = Math.max(1, base - 1); // one grumpy outlier
  return out;
}

function pastISO(rng, maxDaysAgo = 540, minDaysAgo = 3) {
  const days = between(rng, minDaysAgo, maxDaysAgo);
  const d = new Date(Date.now() - days * 86400_000 - between(rng, 0, 86_399) * 1000);
  return d.toISOString();
}

/* -------------------------- availability templates ------------------------ */

function slotGrid(from, to) {
  // 30-min grid, "HH:MM" strings, [from, to) — matches HAMS slot template shape.
  const out = [];
  let [h, m] = from.split(":").map(Number);
  const [eh, em] = to.split(":").map(Number);
  while (h * 60 + m < eh * 60 + em) {
    out.push({ type: "normal", start: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}` });
    m += 30; if (m >= 60) { m -= 60; h++; }
  }
  return out;
}
// day_of_week: 0=Sunday … 6=Saturday (verified against get_available_slots).
// Oman weekend is Fri–Sat; most private clinics work Sat–Thu.
const TEMPLATES = [
  { name: "full", days: [0, 1, 2, 3, 4, 6], slots: [...slotGrid("09:00", "12:30"), ...slotGrid("16:30", "20:30")] },
  { name: "evening", days: [0, 1, 2, 3, 6], slots: slotGrid("16:00", "21:00") },
  { name: "morning", days: [0, 1, 2, 3, 4], slots: slotGrid("08:30", "13:00") },
  { name: "hospital", days: [0, 1, 2, 3, 4, 5, 6], slots: [...slotGrid("09:00", "13:00"), ...slotGrid("16:00", "21:00")] },
];

/* ------------------------------- facilities ------------------------------- */

// Every template accounts for all 7 days — closed days carry open/close: null,
// which the details screen renders as an explicit red "Closed" row (the
// approved mock design did the same for Fridays).
const WH_CLINIC = [
  { days: "Sat – Thu", dow: [6, 0, 1, 2, 3, 4], open: "08:30", close: "21:00" },
  { days: "Fri", dow: [5], open: null, close: null },
];
const WH_CLINIC_FRI = [
  { days: "Sat – Thu", dow: [6, 0, 1, 2, 3, 4], open: "08:30", close: "21:00" },
  { days: "Fri", dow: [5], open: "16:00", close: "21:00" },
];
const WH_24_7 = [{ days: "Daily", dow: [0, 1, 2, 3, 4, 5, 6], open: "00:00", close: "23:59" }];
const WH_LAB = [{ days: "Daily", dow: [0, 1, 2, 3, 4, 5, 6], open: "07:00", close: "22:00" }];
const WH_OFFICE = [
  { days: "Sun – Thu", dow: [0, 1, 2, 3, 4], open: "09:00", close: "19:00" },
  { days: "Fri – Sat", dow: [5, 6], open: null, close: null },
];

// [name, name_ar, type, city, area, street, lng, lat, wh, targetRating, blurb, doctors[]]
// doctors: [slug, gender, templateIdx]
const NEW_FACILITIES = [
  ["Royal Muscat Hospital", "مستشفى مسقط الملكي", "hospital", "Muscat", "Al Khuwair", "Sultan Qaboos Street", 58.4356, 23.5996, WH_24_7, 4.8,
    "Private multi-specialty hospital with 24/7 emergency, advanced cardiac care and family medicine under one roof.",
    [["cardiology", "male", 3], ["cardiology", "female", 3], ["pediatrics", "female", 3], ["pediatrics", "male", 0], ["obgyn", "female", 3], ["orthopedics", "male", 0], ["general", "female", 3], ["general", "male", 1], ["ent", "male", 0], ["dermatology", "female", 0]]],
  ["Qurum Specialty Medical Center", "مركز القرم التخصصي الطبي", "clinic", "Muscat", "Qurum", "Al Sarooj Street", 58.477, 23.612, WH_CLINIC_FRI, 4.7,
    "Consultant-led specialty clinics in the heart of Qurum — cardiology, dermatology, eye care and mental wellness.",
    [["cardiology", "male", 0], ["dermatology", "female", 0], ["ophthalmology", "male", 1], ["mental", "female", 2], ["ent", "female", 0]]],
  ["Al Bustan Family Health Center", "مركز البستان لصحة الأسرة", "clinic", "Muscat", "Ruwi", "Al Jaame Street", 58.5437, 23.5946, WH_CLINIC, 4.4,
    "Neighbourhood family clinic for everyday care — GP visits, women's health and children's clinics.",
    [["general", "male", 0], ["general", "female", 2], ["pediatrics", "female", 0], ["obgyn", "female", 1]]],
  ["Pearl Dental Studio", "استوديو اللؤلؤة لطب الأسنان", "dental", "Muscat", "Al Khuwair", "Dohat Al Adab Street", 58.4302, 23.601, WH_CLINIC, 4.9,
    "Boutique dental practice — cosmetic dentistry, orthodontics and anxiety-free treatment for all ages.",
    [["dental", "female", 0], ["dental", "male", 1], ["dental", "female", 2]]],
  ["Shatti Eye & Vision Center", "مركز الشاطئ للعيون والبصر", "optical", "Muscat", "Shatti Al Qurum", "Way 2817", 58.462, 23.618, WH_CLINIC, 4.7,
    "Dedicated eye centre — comprehensive vision exams, cataract assessment and children's optometry.",
    [["ophthalmology", "male", 0], ["ophthalmology", "female", 2]]],
  ["Muscat Physio & Rehab Clinic", "عيادة مسقط للعلاج الطبيعي والتأهيل", "physiotherapy", "Muscat", "Bawshar", "Dohat Al Adab", 58.3988, 23.5773, WH_CLINIC, 4.6,
    "Movement and recovery specialists — post-surgical rehab, sports injuries and chronic back pain programs.",
    [["physio", "male", 0], ["physio", "female", 2], ["orthopedics", "male", 1]]],
  ["Al Mouj Diagnostic Laboratories", "مختبرات الموج التشخيصية", "lab", "Seeb", "Al Mouj", "Al Mouj Boulevard", 58.2657, 23.6255, WH_LAB, 4.6,
    "Accredited diagnostics — full blood panels, imaging and same-day digital results.",
    [["lab", "female", 2], ["radiology", "male", 0], ["lab", "male", 2]]],
  ["Serenity Mental Wellness Clinic", "عيادة السكينة للصحة النفسية", "mental_health", "Muscat", "Madinat Al Sultan Qaboos", "Way 3019", 58.4258, 23.6011, WH_OFFICE, 4.8,
    "Private, confidential mental-health care — psychiatry, talk therapy and stress clinics.",
    [["mental", "female", 2], ["mental", "male", 0], ["nutrition", "female", 2]]],
  ["Amerat Community Clinic", "عيادة العامرات المجتمعية", "clinic", "Muscat", "Al Amerat", "Al Amerat Main Road", 58.4986, 23.5236, WH_CLINIC_FRI, 4.2,
    "Affordable walk-in care for the Amerat community — consultations from 4 OMR.",
    [["general", "male", 0], ["general", "female", 1], ["nutrition", "female", 2]]],
  ["Nizwa Grand Hospital", "مستشفى نزوى الكبير", "hospital", "Nizwa", "Firq", "Firq Roundabout Road", 57.5301, 22.9333, WH_24_7, 4.5,
    "The interior's leading private hospital — 24/7 emergency, maternity and cardiac clinics.",
    [["general", "male", 3], ["pediatrics", "female", 3], ["cardiology", "male", 0], ["obgyn", "female", 1]]],
  ["Salalah Coast Medical Center", "مركز ساحل صلالة الطبي", "clinic", "Salalah", "Al Saada", "As Sultan Qaboos Street", 54.0924, 17.0151, WH_CLINIC, 4.4,
    "Dhofar's family clinic — general practice, dental care and skin clinics by the coast.",
    [["general", "female", 0], ["dental", "male", 1], ["dermatology", "female", 2]]],
  ["Sohar Port Clinic", "عيادة ميناء صحار", "clinic", "Sohar", "Falaj Al Qabail", "Port Access Road", 56.7469, 24.3643, WH_CLINIC, 4.3,
    "Occupational and family health for Sohar's port community.",
    [["general", "male", 0], ["pediatrics", "female", 2]]],
  ["Sur Family Care Center", "مركز صور لرعاية الأسرة", "clinic", "Sur", "Al Sharq", "Sur Corniche Road", 59.5289, 22.5667, WH_CLINIC, 4.4,
    "Trusted family medicine and children's care for the Sharqiyah coast.",
    [["general", "female", 0], ["ent", "male", 1]]],
];

// Doctors to add to existing under-populated ACTIVE facilities (matched by name).
const EXISTING_FACILITY_DOCTORS = {
  "Al Amal Medical Centre - Al Hail": [["general", "female", 0], ["pediatrics", "male", 2]],
  "Al Hayat Medical Centre - Al Khoudh": [["dental", "female", 0], ["general", "male", 1]],
  "Al Noor Medical Centre - Falaj Al Qabail": [["obgyn", "female", 2], ["general", "male", 0]],
  "Al Sahwa Medical Centre - Ghala": [["dermatology", "female", 0], ["ent", "male", 1]],
  "Al Shifa Medical Centre - Muttrah": [["cardiology", "male", 0], ["physio", "female", 2]],
  "Al Wafa Hospital - Ruwi": [["general", "male", 3], ["pediatrics", "female", 3], ["orthopedics", "male", 0], ["obgyn", "female", 1]],
};

const FACILITY_BLURB = "Community medical centre offering family medicine, specialist clinics and on-site diagnostics.";

/* ------------------------------ demo accounts ----------------------------- */

const ACCOUNTS = [
  {
    email: "jai+medilink-demo@inzint.com", phone: "91234567",
    name: "Aisha Al Harthy", name_ar: "عائشة الحارثية", gender: "female",
    dob: "1992-03-14", blood: "O+", civil: "92031401",
    address: { street: "Way 3012, Building 45", area: "Al Khuwair", city: "Muscat" },
    emergency: { name: "Salim Al Harthy", phone: "99887712", relation: "spouse" },
    family: [
      { n: "Salim Al Harthy", ar: "سالم الحارثي", rel: "spouse", g: "male", dob: "1988-06-20" },
      { n: "Maryam Al Harthy", ar: "مريم الحارثية", rel: "child", g: "female", dob: "2016-09-02" },
      { n: "Omar Al Harthy", ar: "عمر الحارثي", rel: "child", g: "male", dob: "2019-12-11" },
      { n: "Fatma Al Riyami", ar: "فاطمة الريامية", rel: "parent", g: "female", dob: "1961-04-25" },
    ],
    visits: [
      { fac: "Al Bustan Family Health Center", slug: "general", daysAgo: 190, time: "10:00", status: "completed", reason: "Annual health check-up", review: [5, "Very thorough — explained everything clearly and didn't rush the visit."] },
      { fac: "Qurum Specialty Medical Center", slug: "dermatology", daysAgo: 95, time: "17:30", status: "completed", reason: "Eczema flare-up on hands", review: [4, "دكتورة لطيفة ومحترمة وأجابت على جميع أسئلتي."] },
      { fac: "Al Bustan Family Health Center", slug: "pediatrics", daysAgo: 40, time: "09:30", status: "completed", family: "Maryam Al Harthy", reason: "School vaccination review" },
      { fac: "Qurum Specialty Medical Center", slug: "ent", daysAgo: 66, time: "18:00", status: "cancelled", reason: "Recurring sinus headaches" },
      { fac: "Qurum Specialty Medical Center", slug: "dermatology", daysIn: 6, time: "17:30", status: "confirmed", reason: "Dermatology follow-up" },
    ],
  },
  {
    email: "jai+medilink-salim@inzint.com", phone: "92345671",
    name: "Salim Al Busaidi", name_ar: "سالم البوسعيدي", gender: "male",
    dob: "1985-07-02", blood: "A+", civil: "85070203",
    address: { street: "Qurum Heights, Way 2233", area: "Qurum", city: "Muscat" },
    emergency: { name: "Zainab Al Busaidi", phone: "99123456", relation: "spouse" },
    family: [
      { n: "Zainab Al Busaidi", ar: "زينب البوسعيدية", rel: "spouse", g: "female", dob: "1989-01-15" },
      { n: "Hamad Al Busaidi", ar: "حمد البوسعيدي", rel: "child", g: "male", dob: "2014-03-22" },
      { n: "Sara Al Busaidi", ar: "سارة البوسعيدية", rel: "child", g: "female", dob: "2018-08-09" },
    ],
    visits: [
      { fac: "Royal Muscat Hospital", slug: "cardiology", daysAgo: 150, time: "18:30", status: "completed", reason: "Chest tightness after exercise", review: [5, "Consultant explained my ECG results clearly. Felt in safe hands."] },
      { fac: "Royal Muscat Hospital", slug: "pediatrics", daysAgo: 75, time: "10:30", status: "completed", family: "Hamad Al Busaidi", reason: "Asthma inhaler review" },
      { fac: "Al Bustan Family Health Center", slug: "general", daysAgo: 30, time: "09:00", status: "no_show", reason: "Blood pressure check" },
      { fac: "Royal Muscat Hospital", slug: "cardiology", daysIn: 4, time: "18:30", status: "confirmed", reason: "Cardiology follow-up — lipid panel results" },
    ],
  },
  {
    email: "jai+medilink-fatma@inzint.com", phone: "93456712",
    name: "Fatma Al Lawati", name_ar: "فاطمة اللواتية", gender: "female",
    dob: "1958-11-23", blood: "B+", civil: "58112304",
    address: { street: "Muttrah Corniche, Way 1120", area: "Muttrah", city: "Muscat" },
    emergency: { name: "Ali Al Lawati", phone: "99234567", relation: "child" },
    family: [
      { n: "Ali Al Lawati", ar: "علي اللواتي", rel: "child", g: "male", dob: "1984-02-10" },
      { n: "Huda Al Lawati", ar: "هدى اللواتية", rel: "child", g: "female", dob: "1987-07-19" },
      { n: "Samira Al Lawati", ar: "سميرة اللواتية", rel: "sibling", g: "female", dob: "1963-05-30" },
    ],
    visits: [
      { fac: "Shatti Eye & Vision Center", slug: "ophthalmology", daysAgo: 210, time: "10:00", status: "completed", reason: "Cataract assessment", review: [5, "من أفضل الأخصائيين الذين زرتهم في مسقط."] },
      { fac: "Al Shifa Medical Centre - Muttrah", slug: "cardiology", daysAgo: 120, time: "11:00", status: "completed", reason: "Blood pressure review" },
      { fac: "Muscat Physio & Rehab Clinic", slug: "physio", daysAgo: 60, time: "09:30", status: "completed", reason: "Knee pain physiotherapy" },
      { fac: "Muscat Physio & Rehab Clinic", slug: "physio", daysAgo: 25, time: "09:30", status: "completed", reason: "Physiotherapy session 2", review: [4, "المتابعة كانت بنفس جودة الزيارة الأولى. رعاية ثابتة."] },
      { fac: "Shatti Eye & Vision Center", slug: "ophthalmology", daysIn: 8, time: "10:30", status: "confirmed", reason: "Post-assessment eye check" },
    ],
  },
  {
    email: "jai+medilink-hamed@inzint.com", phone: "94567123",
    name: "Hamed Al Wahaibi", name_ar: "حمد الوهيبي", gender: "male",
    dob: "1998-01-19", blood: "AB+", civil: "98011905",
    address: { street: "Al Mawaleh South, Way 4410", area: "Seeb", city: "Muscat" },
    emergency: { name: "Said Al Wahaibi", phone: "99345678", relation: "parent" },
    family: [
      { n: "Said Al Wahaibi", ar: "سعيد الوهيبي", rel: "parent", g: "male", dob: "1965-09-03" },
      { n: "Moza Al Wahaibi", ar: "موزة الوهيبية", rel: "parent", g: "female", dob: "1970-02-14" },
    ],
    visits: [
      { fac: "Pearl Dental Studio", slug: "dental", daysAgo: 100, time: "18:00", status: "completed", reason: "Wisdom tooth pain", review: [4, "Gentle and reassuring throughout the procedure."] },
      { fac: "Al Bustan Family Health Center", slug: "general", daysAgo: 45, time: "10:30", status: "completed", family: "Said Al Wahaibi", reason: "Diabetes management review" },
      { fac: "Serenity Mental Wellness Clinic", slug: "mental", daysAgo: 20, time: "17:00", status: "cancelled", reason: "Sleep problems consultation" },
      { fac: "Pearl Dental Studio", slug: "dental", daysIn: 5, time: "18:30", status: "confirmed", reason: "Dental cleaning and polish" },
    ],
  },
  {
    email: "jai+medilink-noora@inzint.com", phone: "95671234",
    name: "Noora Al Zadjali", name_ar: "نورة الزدجالية", gender: "female",
    dob: "1990-05-08", blood: "O-", civil: "90050806",
    address: { street: "Al Amerat Heights, Way 5521", area: "Al Amerat", city: "Muscat" },
    emergency: { name: "Khalid Al Zadjali", phone: "99456789", relation: "spouse" },
    family: [
      { n: "Khalid Al Zadjali", ar: "خالد الزدجالي", rel: "spouse", g: "male", dob: "1986-10-27" },
      { n: "Lujain Al Zadjali", ar: "لجين الزدجالية", rel: "child", g: "female", dob: "2020-01-05" },
      { n: "Faisal Al Zadjali", ar: "فيصل الزدجالي", rel: "child", g: "male", dob: "2022-06-18" },
      { n: "Alya Al Zadjali", ar: "علياء الزدجالية", rel: "child", g: "female", dob: "2024-11-30" },
    ],
    visits: [
      { fac: "Royal Muscat Hospital", slug: "obgyn", daysAgo: 260, time: "10:00", status: "completed", reason: "Postnatal check-up", review: [5, "استمعت لكل استفساراتي بصبر واهتمام. أنصح بها بشدة."] },
      { fac: "Al Bustan Family Health Center", slug: "pediatrics", daysAgo: 130, time: "09:30", status: "completed", family: "Lujain Al Zadjali", reason: "Fever and ear pain", review: [5, "ممتازة مع الأطفال — ابنتي ارتاحت لها من أول زيارة."] },
      { fac: "Al Bustan Family Health Center", slug: "pediatrics", daysAgo: 55, time: "10:00", status: "completed", family: "Faisal Al Zadjali", reason: "18-month development check" },
      { fac: "Al Bustan Family Health Center", slug: "pediatrics", daysIn: 2, time: "09:30", status: "confirmed", family: "Alya Al Zadjali", reason: "9-month vaccinations" },
    ],
  },
];

/* ================================ PHASES ================================== */

async function phase1_fixExistingDoctors() {
  log("\n— Phase 1: repair existing doctors (fees → 4–22 OMR, real specialties) —");
  const docs = await get("doctors?select=id,full_name,specialty,fees,years_experience,languages,bio,qualifications,is_active&limit=500");
  const KNOWN_LANGS = new Set(["ar", "en", "ur", "hi", "fr", "de", "ml"]);
  let garbageIdx = 0, patched = 0;
  for (const d of docs) {
    const raw = (d.specialty ?? "").toLowerCase().trim();
    let label = null;
    if (GARBAGE.has(raw)) label = GARBAGE_POOL[garbageIdx++ % GARBAGE_POOL.length];
    else if (RELABEL[raw]) label = RELABEL[raw];
    const effective = label ?? d.specialty ?? "General Medicine";
    const slug = slugOfLabel(effective);
    const rng = rngOf(`fee:${d.id}`);
    const body = { fees: feeFor(slug, rng) };
    if (label && label !== d.specialty) body.specialty = label;
    // HAMS test rows carry 0 as often as NULL — both read as "no experience".
    if (d.years_experience == null || d.years_experience === 0) body.years_experience = between(rng, 4, 28);
    if (!(d.bio ?? "").trim()) body.bio = BIO[slug];
    if (!Array.isArray(d.qualifications) || d.qualifications.length === 0) body.qualifications = QUALS[slug];
    // Every doctor here speaks Arabic and English; keep any real extras.
    const langs = (Array.isArray(d.languages) ? d.languages : []).filter((l) => KNOWN_LANGS.has(l));
    if (!langs.includes("ar") || !langs.includes("en")) {
      const extras = langs.filter((l) => l !== "ar" && l !== "en");
      if (!extras.length && rng() < 0.3) extras.push(pick(rng, ["ur", "hi", "fr"]));
      body.languages = ["ar", "en", ...extras];
    }
    await patch(`doctors?id=eq.${d.id}`, body);
    patched++;
  }
  log(`  ${patched} doctors repaired (${garbageIdx} garbage specialties reassigned)`);
}

async function phase2_fixExistingFacilities() {
  log("\n— Phase 2: working hours / descriptions for existing active facilities —");
  const facs = await get("facilities?select=id,name,type,description,phone,working_hours&status=eq.active&is_verified=eq.true");
  for (const f of facs) {
    const rng = rngOf(`fac:${f.id}`);
    const body = {};
    // Repair when hours are missing OR when the template predates the explicit
    // Friday row (every day must be accounted for, closed days included).
    const mentionsFriday = Array.isArray(f.working_hours)
      && f.working_hours.some((e) => Array.isArray(e?.dow) && e.dow.includes(5));
    if (!Array.isArray(f.working_hours) || f.working_hours.length === 0 || !mentionsFriday) {
      const curated = NEW_FACILITIES.find((n) => n[0] === f.name)?.[8];
      body.working_hours = curated ?? (f.type === "hospital" ? WH_24_7 : rng() < 0.5 ? WH_CLINIC : WH_CLINIC_FRI);
    }
    if (!f.description) body.description = FACILITY_BLURB;
    if (!f.phone || f.phone.startsWith("+91")) body.phone = `+968 24${between(rng, 100000, 999999)}`;
    if (Object.keys(body).length) await patch(`facilities?id=eq.${f.id}`, body);
  }
  log(`  ${facs.length} active facilities updated`);
}

async function phase3_newFacilities() {
  log("\n— Phase 3: new facilities (all categories, near & far) —");
  const byName = new Map();
  for (const [name, nameAr, type, city, area, street, lng, lat, wh, , blurb] of NEW_FACILITIES) {
    const existing = await get(`facilities?select=id&name=eq.${encodeURIComponent(name)}`);
    if (existing.length) { byName.set(name, existing[0].id); log(`  = ${name} (exists)`); continue; }
    const rng = rngOf(`newfac:${name}`);
    const [row] = await post("facilities", {
      name, name_ar: nameAr, name_ar_status: "verified", type,
      status: "active", is_verified: true,
      city, area, street, country: "Oman",
      address: { street, area, city },
      description: blurb,
      phone: `+968 24${between(rng, 100000, 999999)}`,
      working_hours: wh,
      services: ["Consultations", "Follow-up visits", "Health screenings"],
      location: `SRID=4326;POINT(${lng} ${lat})`,
    });
    byName.set(name, row.id);
    log(`  + ${name} [${type}] @ ${city}`);
  }
  return byName;
}

async function phase4_newDoctors(facilityIds) {
  log("\n— Phase 4: new doctors with availability templates —");
  const created = []; // {id, slug, gender, facilityName, facilityId, targetRating}
  const specs = [];
  for (const [name, , , , , , , , , targetRating, , docs] of NEW_FACILITIES) {
    for (const [slug, gender, tpl] of docs) specs.push({ facilityName: name, slug, gender, tpl, targetRating });
  }
  const existingActive = await get("facilities?select=id,name&status=eq.active&is_verified=eq.true");
  for (const [facName, docs] of Object.entries(EXISTING_FACILITY_DOCTORS)) {
    const fac = existingActive.find((f) => f.name === facName);
    if (!fac) { log(`  ! existing facility not found: ${facName}`); continue; }
    facilityIds.set(facName, fac.id);
    for (const [slug, gender, tpl] of docs) specs.push({ facilityName: facName, slug, gender, tpl, targetRating: 4.3 });
  }

  for (const [i, s] of specs.entries()) {
    const facilityId = facilityIds.get(s.facilityName);
    if (!facilityId) continue;
    const rng = rngOf(`doc:${s.facilityName}:${s.slug}:${i}`);
    const { en, ar } = makeName(rng, s.gender);
    const existing = await get(`doctors?select=id&full_name=eq.${encodeURIComponent(en)}&facility_id=eq.${facilityId}`);
    let id;
    if (existing.length) {
      id = existing[0].id;
    } else {
      const [row] = await post("doctors", {
        full_name: en, full_name_ar: ar, full_name_ar_status: "verified",
        specialty: LABEL[s.slug], facility_id: facilityId,
        fees: feeFor(s.slug, rng),
        years_experience: between(rng, 5, 30),
        languages: rng() < 0.35 ? ["ar", "en", pick(rng, ["ur", "hi", "fr", "de"])] : ["ar", "en"],
        qualifications: QUALS[s.slug],
        bio: BIO[s.slug],
        is_active: true, status: "available",
      });
      id = row.id;
      const tpl = TEMPLATES[s.tpl];
      await post("doctor_availability", tpl.days.map((day) => ({ doctor_id: id, day_of_week: day, slots: tpl.slots })));
    }
    created.push({ id, ...s, name: en });
  }
  log(`  ${created.length} doctors in place across ${new Set(created.map((c) => c.facilityName)).size} facilities`);
  return created;
}

async function phase5_reviews(newDoctors) {
  log("\n— Phase 5: reviews (trigger recomputes honest star aggregates) —");
  const patients = (await get("patient_profiles?select=id&limit=400")).map((p) => p.id);
  const reviewRows = [];

  // New doctors: aim at each one's facility target rating.
  for (const d of newDoctors) {
    const rng = rngOf(`rev:${d.id}`);
    const existing = await get(`reviews?select=id&target_type=eq.doctor&target_id=eq.${d.id}&is_visible=eq.true&limit=5`);
    if (existing.length >= 4) continue;
    const n = between(rng, 5, 14);
    const target = Math.max(3.4, Math.min(5, d.targetRating + (rng() - 0.5) * 0.5));
    const ratings = ratingsFor(rng, target, n);
    for (const [j, rating] of ratings.entries()) {
      const arabic = rng() < 0.55;
      reviewRows.push({
        patient_id: patients[(hash(d.id) + j * 7) % patients.length],
        target_type: "doctor", target_id: d.id, rating,
        review_text: rng() < 0.82 ? pick(rng, arabic ? REVIEW_AR : REVIEW_EN) : null,
        is_visible: true, created_at: pastISO(rng),
      });
    }
  }

  // Existing active doctors (the 90+ HAMS test rows): modest counts so the
  // whole search screen has stars, not just the curated set.
  const existingDocs = await get("doctors?select=id,review_count&is_active=eq.true&limit=500");
  const newIds = new Set(newDoctors.map((d) => d.id));
  for (const d of existingDocs) {
    if (newIds.has(d.id)) continue;
    const existing = await get(`reviews?select=id&target_type=eq.doctor&target_id=eq.${d.id}&is_visible=eq.true&limit=5`);
    if (existing.length >= 4) continue;
    const rng = rngOf(`rev-old:${d.id}`);
    const target = 3.6 + rng() * 1.3; // 3.6 – 4.9
    const n = between(rng, 4, 9);
    const ratings = ratingsFor(rng, target, n);
    for (const [j, rating] of ratings.entries()) {
      const arabic = rng() < 0.55;
      reviewRows.push({
        patient_id: patients[(hash(d.id) + j * 11) % patients.length],
        target_type: "doctor", target_id: d.id, rating,
        review_text: rng() < 0.75 ? pick(rng, arabic ? REVIEW_AR : REVIEW_EN) : null,
        is_visible: true, created_at: pastISO(rng),
      });
    }
  }

  // Facilities: stars for every active facility.
  const facs = await get("facilities?select=id,name&status=eq.active&is_verified=eq.true");
  const targetByName = new Map(NEW_FACILITIES.map((f) => [f[0], f[9]]));
  for (const f of facs) {
    const existing = await get(`reviews?select=id&target_type=eq.facility&target_id=eq.${f.id}&is_visible=eq.true&limit=4`);
    if (existing.length >= 3) continue;
    const rng = rngOf(`rev-fac:${f.id}`);
    const target = targetByName.get(f.name) ?? 3.9 + rng() * 0.9;
    const n = between(rng, 5, 12);
    const ratings = ratingsFor(rng, target, n);
    for (const [j, rating] of ratings.entries()) {
      const arabic = rng() < 0.55;
      reviewRows.push({
        patient_id: patients[(hash(f.id) + j * 13) % patients.length],
        target_type: "facility", target_id: f.id, rating,
        review_text: rng() < 0.7 ? pick(rng, arabic ? REVIEW_FAC_AR : REVIEW_FAC_EN) : null,
        is_visible: true, created_at: pastISO(rng),
      });
    }
  }

  for (let i = 0; i < reviewRows.length; i += 100) {
    await post("reviews", reviewRows.slice(i, i + 100), { Prefer: "return=minimal" });
  }
  log(`  ${reviewRows.length} review rows inserted`);
}

async function phase6_demoAccounts(facilityIds, newDoctors) {
  log("\n— Phase 6: demo patient accounts —");
  const doctorFor = (facName, slug) => newDoctors.find((d) => d.facilityName === facName && d.slug === slug);

  for (const acc of ACCOUNTS) {
    const rng = rngOf(`acc:${acc.email}`);
    // 1) auth user (find by profiles.email, else create)
    let userId;
    const prof = await get(`profiles?select=id&email=eq.${encodeURIComponent(acc.email)}`);
    if (prof.length) {
      userId = prof[0].id;
    } else {
      const user = await adminAuth("POST", "admin/users", {
        email: acc.email, password: DEMO_PASSWORD, email_confirm: true,
        user_metadata: { full_name: acc.name, phone: acc.phone, role: "patient" },
      });
      userId = user.id ?? user.user?.id;
      if (!userId) throw new Error(`no user id for ${acc.email}`);
    }
    // 2) profile + patient profile
    await patch(`profiles?id=eq.${userId}`, {
      full_name: acc.name, full_name_ar: acc.name_ar, full_name_ar_status: "verified", phone: acc.phone,
    });
    let pp = await get(`patient_profiles?select=id&user_id=eq.${userId}`);
    if (!pp.length) {
      pp = await post("patient_profiles", { user_id: userId });
    }
    const patientId = pp[0].id;
    await patch(`patient_profiles?id=eq.${patientId}`, {
      date_of_birth: acc.dob, gender: acc.gender, blood_group: acc.blood,
      civil_number: acc.civil, address: acc.address, emergency_contact: acc.emergency,
    });
    // 3) family
    const fam = await get(`family_members?select=id,full_name&patient_id=eq.${patientId}`);
    const famByName = new Map(fam.map((m) => [m.full_name, m.id]));
    if (fam.length === 0) {
      const rows = await post("family_members", acc.family.map((m) => ({
        patient_id: patientId, full_name: m.n, relation: m.rel, gender: m.g, date_of_birth: m.dob,
      })));
      for (const r of rows) famByName.set(r.full_name, r.id);
    }
    // 4) appointments (skip if any exist — idempotency)
    const appts = await get(`appointments?select=id&patient_id=eq.${patientId}&limit=1`);
    const madeAppointments = [];
    if (appts.length === 0) {
      for (const v of acc.visits) {
        const doc = doctorFor(v.fac, v.slug);
        const facId = facilityIds.get(v.fac);
        if (!doc || !facId) { log(`  ! no doctor/facility for ${acc.name}: ${v.fac}/${v.slug}`); continue; }
        const when = new Date(Date.now() + (v.daysIn ? v.daysIn : -v.daysAgo) * 86400_000);
        const slotDate = when.toISOString().slice(0, 10);
        const [h, m] = v.time.split(":").map(Number);
        const end = `${String(h + (m + 15 >= 60 ? 1 : 0)).padStart(2, "0")}:${String((m + 15) % 60).padStart(2, "0")}`;
        const completed = v.status === "completed";
        const body = {
          patient_id: patientId, doctor_id: doc.id, facility_id: facId,
          for_family_member_id: v.family ? famByName.get(v.family) ?? null : null,
          slot_date: slotDate, slot_start: v.time, slot_end: end,
          status: v.status, type: "in_person",
          payment_status: v.status === "cancelled" ? "refunded" : "paid",
          reference_number: `HAMS-${hex8(rng)}`,
          reason_for_visit: v.reason,
          patient_name: v.family ?? acc.name, patient_phone: acc.phone,
          ...(completed ? { completed_at: new Date(when.getTime() + 40 * 60000).toISOString(), checked_in_at: new Date(when.getTime() - 10 * 60000).toISOString() } : {}),
          ...(v.status === "cancelled" ? { cancelled_at: new Date(when.getTime() - 86400_000).toISOString(), cancellation_reason: "Patient rescheduled plans" } : {}),
        };
        try {
          const [row] = await post("appointments", body);
          madeAppointments.push({ ...v, id: row.id, doctorId: doc.id, when });
        } catch (e) {
          log(`  ! appointment failed (${acc.name} → ${v.fac}): ${String(e.message).slice(0, 160)}`);
        }
      }
      // 5) reviews linked to completed visits
      for (const v of madeAppointments) {
        if (!v.review || v.status !== "completed") continue;
        try {
          await post("reviews", [{
            patient_id: patientId, target_type: "doctor", target_id: v.doctorId,
            appointment_id: v.id, rating: v.review[0], review_text: v.review[1],
            is_visible: true, created_at: new Date(v.when.getTime() + 5 * 3600_000).toISOString(),
          }], { Prefer: "return=minimal" });
        } catch (e) {
          if (e.status !== 409) log(`  ! review failed: ${String(e.message).slice(0, 120)}`);
        }
      }
    }
    // 6) notifications (in_app_notifications.type is enum info|warning|error;
    // the semantic kind travels in data.kind, like the production backend writes)
    const notifs = await get(`in_app_notifications?select=id&user_id=eq.${userId}&limit=3`);
    if (notifs.length < 3) {
      const today = new Date().toISOString().slice(0, 10);
      const [upcoming] = await get(
        `appointments?select=id,slot_date,slot_start&patient_id=eq.${patientId}&status=eq.confirmed&slot_date=gte.${today}&order=slot_date.asc&limit=1`,
      );
      const rows = [
        upcoming && {
          user_id: userId, type: "info",
          title: "Appointment confirmed", title_ar: "تم تأكيد موعدك",
          body: `Your visit on ${upcoming.slot_date} at ${upcoming.slot_start.slice(0, 5)} is confirmed.`,
          body_ar: `تم تأكيد زيارتك بتاريخ ${upcoming.slot_date} الساعة ${upcoming.slot_start.slice(0, 5)}.`,
          data: { kind: "appointment", appointment_id: upcoming.id }, is_read: false,
          created_at: new Date(Date.now() - 2 * 3600_000).toISOString(),
        },
        upcoming && {
          user_id: userId, type: "info",
          title: "Payment received", title_ar: "تم استلام الدفعة",
          body: "Your payment has been received and your appointment is confirmed.",
          body_ar: "تم استلام دفعتك وتأكيد موعدك.",
          data: { kind: "payment", appointment_id: upcoming.id }, is_read: false,
          created_at: new Date(Date.now() - 2 * 3600_000 + 60_000).toISOString(),
        },
        {
          user_id: userId, type: "info",
          title: "Welcome to MediLink", title_ar: "مرحباً بك في ميديلينك",
          body: "Book trusted doctors, manage your family's health and pay securely — all in one place.",
          body_ar: "احجز أطباء موثوقين وأدر صحة عائلتك وادفع بأمان — كل ذلك في مكان واحد.",
          data: { kind: "general" }, is_read: true,
          created_at: new Date(Date.now() - 6 * 86400_000).toISOString(),
        },
      ].filter(Boolean);
      if (rows.length) await post("in_app_notifications", rows, { Prefer: "return=minimal" });
    }
    log(`  ✓ ${acc.name} (${acc.phone}) — family ${acc.family.length}, visits ${acc.visits.length}`);
  }
}

/* --------------------------------- main ----------------------------------- */

const t0 = Date.now();
log("Seeding demo dataset →", BASE.replace(/^https:\/\//, ""));
await phase1_fixExistingDoctors();
await phase2_fixExistingFacilities();
const facilityIds = await phase3_newFacilities();
const newDoctors = await phase4_newDoctors(facilityIds);
await phase5_reviews(newDoctors);
await phase6_demoAccounts(facilityIds, newDoctors);
log(`\nDone in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
