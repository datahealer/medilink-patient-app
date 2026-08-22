# Medilink — UX Redesign Prototype (ميديلنك)

Arabic-first, RTL-first redesign of the Medilink patient app for the Oman market.
Built as a standalone Expo prototype whose **UI consumes the exact repository/domain
contract of the production app** (`mobile/src/data/{types,repositories}.ts`), so the
approved UI ports onto the live Supabase/HAMS backend without backend changes.

---

## 1. Design principles (the anti-clutter contract)

1. **One job per screen.** Every screen has exactly one primary action, rendered with
   the brand's slant-edge CTA. Everything else is secondary or a list item.
2. **Search exists once.** The only live search input in the app is on the Explore tab.
   The Home "search" element is a *launcher* (a button that navigates to Explore), not a
   second input. Records has a scoped filter field — different scope, different screen.
3. **No duplicated content sections.** Home never repeats what a tab already owns; it
   shows *state* (next appointment, results ready) and *entry points* (services grid),
   capped at 3 items per section with a single「عرض الكل」link.
4. **No ads, no dead data.** Zero-review providers show a「جديد」badge — never “0.0 (0)”.
   Every list has a designed empty state (icon + one line + one action).
5. **Whitespace is a feature.** 8-pt grid, generous card radii (22–28), one accent per
   surface. Dense information (prices, times) uses typographic hierarchy, not boxes.
6. **44 pt touch targets, labels under icons in the tab bar, no icon-only mysteries.**

## 2. Information architecture

5 tabs (order mirrors in RTL):

| Tab | Arabic | Job | Backing repositories |
|---|---|---|---|
| Home | الرئيسية | Today's state + entry points | appointment.listUpcoming, discovery.*, notification unread |
| Explore | استكشف | Universal search hub + doors to the four dedicated screens | doctor.search, discovery.searchClinics/searchPackages, specialties |
| Me (center, raised) | مي | AI health assistant: symptom check → doctor suggestions → book | ai.suggestDoctors, ai.scheduleAssist |
| Appointments | مواعيدي | Upcoming/past, reschedule, cancel, check-in, rate, rebook | appointment.*, queue.*, review.submit |
| My file | ملفي | Health record + account: history, family, favourites, insurance, settings | patient.*, medicalHistory, family.*, favourite.* |

- **No booking FAB** — booking always starts from context (doctor / clinic / service /
  package / AI suggestion), which is why it never duplicates.
- Detail screens push full-screen without the tab bar (same structural rule as prod).

### Screen map (→ = pushes)

- Onboarding: splash → language-first welcome (عربي default) → 3 value slides → sign-in / OTP / guest
- Home → notifications, explore (launcher), service categories, package detail, doctor/clinic details
- Explore → filters sheet, map view, doctor detail → reviews → **booking**, clinic detail (services+doctors+hours+map)
- Booking: (1) الزيارة (patient + reason) → (2) الموعد (day strip + slot grid)
  → (3) المراجعة والدفع (fee/VAT/total, card payment — processor never surfaced,
  PDPL consent) → success (reference, add-to-calendar)
- Appointments → detail (status timeline, check-in, queue position) → reschedule / cancel sheet / rate
- My file → medical history · family (add/remove) · favourites (hearted doctors/clinics/packages)
  · insurance card (storage only) · profile → edit profile · help & support · settings (language, theme)

## 3. Visual system (from the brand kit)

- **Colors** — Russian Violet `#2E1A47` (primary/ink), Shocking Lavender `#DFC8E7`
  (accent, selected states), Smooth Pastel Blue `#C3D7EE` (accent 2 / info), Eye White
  `#F9F4FA` (background). Dark mode = deep-violet derived palette (same 25 semantic roles as prod).
- **Type** — Arabic: 29LT Zarid Sans (static Regular/Medium/SemiBold/Bold, ×1.08 **+ 1 px**).
  English body/UI: Manrope. English display: Agatho serif. Numerals: Western digits in both languages (Omani convention).
- **Signature shapes** — slant-edge CTA button (mirrored in RTL); connected-dots “link”
  pattern and soft orbs as low-opacity decoration on hero cards, success screens, empty states.
- **Icons** — single-stroke 24×24 SVG set (custom, like prod). **Never emoji.**
  Specialty icons sit in tinted rounded tiles cycling lavender/blue/white.
- **Money** — OMR with 3 decimals (baisa): `12.500 ر.ع` / `OMR 12.500`; VAT 5 % shown in booking review.

## 4. Bilingual & RTL strategy (identical mechanism to prod)

- Native layout stays **LTR permanently**; every component mirrors itself from JS
  (`isRTL` from i18n context) — language flips **instantly, no restart**.
- Typed message catalogs (`en.ts` canonical for types, `ar.ts` complete mirror), dot-path `t()`.
- **Default locale: Arabic.** First-run language screen shows العربية preselected.
- Entity names use `localizedName(en, ar, status, isRTL)` — Arabic shown when verified,
  exactly like prod. **All mock entities ship verified Arabic**, so the demo is 100 % Arabic.
- Dates composed from translated day/month names (no Intl dependency), e.g. «الأحد، 24 أغسطس».
- Arabic tone: MSA with mild Omani warmth (حيّاك، ولاية/محافظة, «إن شاء الله»، عيادات قريبة منك).

## 5. Dummy data (Omani, fully bilingual)

- 120 doctors across 14 specialties (deterministic bilingual generator: Omani + expat
  name pools with correct feminine nisba forms — البلوشية، العامرية — feminine titles
  for female doctors, specialty-appropriate fees 3–45 OMR, languages, bios AR/EN).
- 80 facilities in real locations with true coordinates (الخوير، القرم، السيب، روي،
  الموج، العذيبة، بوشر، نزوى، صحار، صلالة…) + working hours (Fri weekend), priced services.
- 30 health packages from 10 bilingual templates (فحص شامل، صحة المرأة، القلب…) with
  included-tests lists, old-price discounts and sparse promo tags.
- Seed patient عائشة الحارثية + family (سالم، لينا، مريم) + insurance card (display only)
  + notifications AR/EN (DB supports `title_ar/body_ar`).

## 6. Port path (why nothing is throwaway)

- Screens consume `repositories.*` + domain types — same names/shapes as prod
  (`Doctor`, `Clinic`, `Appointment`, `LabResultDetail`, …). Swap the mock module for the
  hybrid/real module during port.
- Bilingual fields not yet in the DB (`about_ar`, `area_ar`, service/package catalogs)
  are listed in `docs/PORTING.md` as **additive** migrations — allowed by the schema policy.
- Theme roles, i18n mechanism, font files, icon approach = identical to prod, so
  components drop into `mobile/src/components/ui` with import-path changes only.

---

## Revision 2 (client feedback, 2026-08-10)

1. Removed from scope: video consultations, labs, prescriptions, documents.
   Insurance = storage only. ملفي is now: history · family · insurance · settings.
2. IA: Home's four "see all" links land on four **dedicated screens** —
   `/doctors`, `/clinics` (prominent List⇄Map segmented toggle), `/packages`,
   `/specialties` — each with a search scoped to its content. The Explore tab is a
   universal-search hub (grouped results + the four doors).
3. Promo tags (i18n-driven, bilingual): featured / top rated / new / near you /
   books fast / {n}% off / lowest price / 24-7 / most popular / last {n} slots today.
   Deterministically assigned to a minority of items; scarcity tag is hash-gated.
4. Catalog ×10 via bilingual Omani generators (name pools + nisba gender forms +
   real area coordinates). Feminine Arabic titles for female doctors.
5. WhatsApp share (icon-only) on doctor/clinic/package; Directions prefers the
   Google Maps app; PDPL consent checkbox gates booking confirm; back button on
   every pushed screen (top-start: left in EN, right in AR).

## Revision 3 (client feedback, 2026-08-10)

1. **Payment is card-only.** Pay-at-clinic removed; the confirm step shows a
   single non-interactive payment row. The processor (Thawani in production) is
   deliberately never named in the UI — "دفع إلكتروني آمن" is all a patient needs.
2. **Favourites got a home.** Hearts now exist on all three detail types
   (doctor / clinic / package — `FavButton`, kind-aware repo) and collect in
   ملفي ← المفضلة: grouped rows, remove-heart on each row, count on the door.
3. **Every account button works.** Edit profile (bilingual name, email, DOB,
   gender, blood group, emergency contact; phone locked as the sign-in identity),
   Help & support (call / WhatsApp / email + FAQ accordion + 9999 emergency note),
   Add family member (bottom-sheet form) and remove member (trash → confirm).
4. **Sheets avoid the keyboard.** The bottom sheet now wraps its content in a
   KeyboardAvoidingView + ScrollView, so the review comment box (and the new
   family form) stay visible while typing.

## Revision 4 (client feedback, 2026-08-11)

1. **Profile switching.** One login, many files. The account holder taps their
   avatar (Home) or the identity card (Profile) to switch to any family member;
   appointments, medical history and the insurance card all follow the active
   person (`appStore.activePatientId` → `appointment.list(tab, patientId)`,
   `patient.getMedicalHistory(patientId)`, `patient.getInsurance(patientId)`).
   A blue "you're viewing X's file" banner with a one-tap way back appears on
   Home and Visits so the context is never ambiguous, booking pre-selects the
   active person, and members have no login of their own — only the account
   holder can add members or switch. `activePatientId` is deliberately NOT
   persisted: every launch starts on your own file and it can never point at a
   member who has since been removed.
2. **Tab 5 is "Profile"** (was "My File"), reorganised into *My health records*
   (medical history, insurance) and *Account* (family, favourites, settings).
3. **Browsing reworked.** The home search bar and the Explore tab no longer do
   the same job: the search bar opens `/search` (the universal hub), and the
   Explore tab opens the clinics browser **map-first**. `/clinics` opens the
   same browser list-first, so "see all" under Clinics and the Explore tab are
   two routes to one screen. Extracted `src/features/{Doctors,Clinics,Packages}Browser`
   so every entry point shares one implementation.
4. **A service is not only doctors.** Tapping a specialty opens
   `/services/[specialty]` with a Doctors ⇄ Clinics switch, both filtered to
   that specialty (a clinic "offers" a specialty when its doctors or its
   service menu do), each side keeping its own scoped search and filters.
5. **Filters everywhere the section names got more general.** "Highly rated
   doctors" → **Doctors** and "Clinics near you" → **Clinics**; rating and
   distance moved into filters (clinics also gained facility type and open-now,
   packages gained sort / max price / test count / discounted-only).
6. **Date of birth is a calendar,** not a typed string — a custom bilingual
   picker (`DateField`) built on our own month/day names, because the native
   picker renders in the *device* locale and would show English months inside
   an Arabic form. It expands inline rather than in a modal, since it's used
   inside bottom sheets and modal-in-modal doesn't stack reliably.
7. Gender chips in the family list use two different hues at equal weight —
   one shared colour carried no information.

## Revision 5 (client feedback, 2026-08-17)

1. **The guest boundary is now a rule, not four screen checks.** A guest may
   browse the entire catalogue — doctors, clinics, packages, prices, hours,
   reviews, map — but *anything that reads or writes a patient file stops at a
   sign-in wall*: booking, favourites, notifications. `useAuthWall()`
   (`src/components/AuthWall.tsx`) is the single implementation: it wraps the
   action, and after signing in the patient resumes exactly where they were
   (`/auth/sign-in?next=…`), so the wall never costs them their place.
   Previously only Home, Visits, Records and Profile checked `guest`, which let
   a guest book two appointments **and see the account holder's family members**
   in the "who is this visit for?" step, save favourites into a list they had no
   screen to read, and read someone's payment receipts in Notifications. The
   booking route enforces the wall itself (not only the buttons that lead to
   it), and never loads family data while unauthenticated.
2. **A facility now staffs exactly what it advertises.** The catalogue used to
   generate clinics and doctors independently — a doctor picked a random clinic
   and a random specialty its *type* allowed — so 75 of 129 advertised
   (clinic, specialty) pairs had no such doctor, 15 clinics had no doctors at
   all, and every `doctors_count` badge disagreed with the list it sat above.
   `rosterFor()` now generates each clinic's roster **from its service menu**:
   every advertised specialty gets a doctor, doctors never practise a specialty
   the clinic doesn't advertise, and `doctors_count` *is* the roster length.
   Health packages follow the same rule — each carries the specialty that
   performs it and is only offered by a clinic that staffs it.
3. **Specialty context survives the tap.** Landing on `/services/pediatrics`
   and opening a clinic keeps the reason you're there: the clinic screen scopes
   its doctor list to that specialty ("Pediatrics doctors (2)") with one tap to
   see the rest, instead of dumping every doctor in the building on somebody who
   came for one thing.
4. **Filters only offer what exists.** The facility-type chips come from a
   facet (`discovery.clinicTypes(specialty)`), so Pediatrics offers Hospital and
   Clinic and hides Dental / Laboratory / Physiotherapy / Optical — chips that
   could only ever return nothing. With a single possible type they disappear.
5. **"Book" never guesses a doctor.** A service row with several qualified
   doctors opens a picker ("Who should see you for Orthopedic consultation?");
   with one, it goes straight to booking. Silently falling back to the first
   doctor in the list is how a patient books a pediatric visit with a
   cardiologist. Every service line now carries a specialty — untagged rows
   were the only reason that fallback existed.
