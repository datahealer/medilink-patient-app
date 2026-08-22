# Porting this UI into the production Medilink app

The prototype was written to be **lifted, not rewritten**. It deliberately reuses the
production app's architecture so the port is mechanical.

## What is already identical to production (`Medilink/mobile`)

| Piece | Prototype | Production | Port action |
|---|---|---|---|
| Stack | Expo SDK 54 · RN 0.81 · React 19 · expo-router 6 · TS | same | none |
| RTL strategy | native layout stays LTR; every component mirrors from JS via `isRTL`; instant switch | same (`enforceNativeLtr`) | none |
| i18n | typed catalogs, dot-path `t()`, `{var}` interpolation, key-fallback | same mechanism | merge `en.ts`/`ar.ts` groups into prod catalogs |
| Entity names | `localizedName(en, ar, status, isRTL)` verified-gating | same util | none |
| Theme | `tokens.ts` + 25 semantic roles, light + derived dark | same role names | drop-in (values match brand kit) |
| Fonts | Agatho / Manrope / ZaridSans static weights (copied **from** prod) | same files | none |
| Money | `consultationTotal` = fee + 5% VAT, `round3` | `shared/src/config/payments.ts` | import from shared instead of `src/utils/format` |
| Stores | zustand (`appStore`, `bookingStore` non-persisted draft) | zustand stores | map fields onto prod stores |
| Data access | screens import `repositories` from `@/data` only | identical rule | point at prod `src/data/index.ts` |

## Repository mapping (prototype → production)

Prototype interfaces are a *subset* with the same verbs. Rebind as follows:

| Prototype call | Production call |
|---|---|
| `patient.getProfile()` | `patient.getProfile()` (`PatientProfile`) |
| `patient.updateProfile(patch)` | `patient.updateProfile(...)` (bilingual name fields are additive columns, see below) |
| `patient.listPeople()` / `getPerson(id)` | **new (client-side)** — compose from `patient.getProfile()` + `family.list()`; no new endpoint needed |
| `patient.getMedicalHistory(patientId?)` | `medicalHistory.get(patientId)` — must accept a dependent id (see profile switching below) |
| `patient.getInsurance()` | **new** — read `patient_insurance` (table exists; add a small shared api fn) |
| `family.list/add/remove` | `family.list/add/remove` |
| `discovery.listSpecialties/featuredClinics/getClinic` | `discovery.*` (same names) |
| `discovery.searchClinics(params)` | `discovery.searchClinics(...)` — the prototype params add `specialty`, `type`, `maxDistanceKm`, `minRating`, `openNow`; specialty resolves via the facility's doctors/services |
| `discovery.clinicTypes(specialty?)` | **new (facet)** — distinct `facility.type` among facilities offering the specialty; one cheap `select distinct` (or a facet count in the search response). The filter chips are built from it, so they can't offer a type that returns nothing |
| `discovery.searchPackages/getPackage` | **new** — see “Additive backend work” |
| `doctor.search/get/reviews` | `doctor.search/get/reviews` |
| `doctor.top()` | `doctor.search({ topRated: true, limit: 6 })` |
| `appointment.list(tab, patientId?)` | `appointment.list(tab)` — filter server-side by patient/dependent id; the prototype filters on `Appointment.patient_id` |
| `appointment.getSlots({doctorId, date})` | `appointment.getSlots(...)` → `get_available_slots` RPC (never compute slots client-side) |
| `appointment.create(NewAppointment)` | `appointment.create(...)` → `book_appointment_atomic`, then always `payment.createCheckout` — **card is the only patient-facing method** (pay-at-clinic removed 2026-08-10) and the processor (Thawani) is never named in the UI |
| `appointment.cancel/reschedule/checkIn` | same (`cancel_appointment_safe`, `reschedule_appointment_atomic`, `checkin_my_appointment`) |
| `appointment.pay(id)` | `payment.createCheckout({appointmentId})` → WebView → `payment.verify` |
| queue numbers on detail screen | `queue.getStatus(appointmentId)` (`people_ahead`, `estimated_wait_minutes`, use `server_time`) |
| `notification.list/unreadCount/markAllRead` | `notification.*` (DB already has `title_ar`/`body_ar`) |
| `review.submit` | `review.submit` |
| `favourite.list()` / `favourite.toggle(kind, refId)` | `favourite.*` — the prototype favourites are **kind-aware** (`doctor` \| `clinic` \| `package`); if the production table is doctor-only, add an `entity_type` column (additive) or a small `favourites_v2` table |
| `ai.ask(message)` | `ai.suggestDoctors` / backend `/api/ai/symptom-check` (streamed) |

## Additive backend work (allowed — additive-only migration policy)

Bilingual/dictionary fields the new UI displays that the DB does not have yet.
All are **new columns / new tables**, no schema forks:

1. `doctors.about_ar`, `doctors.title`, `doctors.title_ar` (title can also be derived client-side).
2. `facilities.area_ar`, `facilities.city_ar`, `facilities.description_ar`.
3. **Service catalog**: today `facilities.services` is `string[]`. The redesigned clinic
   page shows *name_ar + from-price*; add `facility_services(id, facility_id, name, name_ar, price_from, specialty_slug, sort_order)`.
4. **Health packages**: `health_packages(id, facility_id, name, name_ar, price, old_price, tests_count, hours_to_results, popular)` + `health_package_items(package_id, name, name_ar)`.
5. `specialties.name_ar` (labels are client-side i18n today — either works).
6. Lab & prescription Arabic labels stay client-side (dictionary for common test/analyte
   names, like the prototype seed) — no DB change required.

Until 1–5 land, the UI falls back to English for those specific strings via
`localizedName`/`pickLang` — nothing breaks.

## Port sequence (suggested)

1. Copy `src/components/ui/*` into `mobile/src/components/ui-v2/` (namespaced to avoid
   collisions), plus `HScroll`, `Icon` (merge with prod's icon set), `CtaButton`.
2. Merge i18n keys (`en.ts`/`ar.ts` groups are disjoint from prod's except `common`).
3. Copy `app/` screens over prod routes one flow at a time (Home → Explore → Booking →
   Visits → My File → Me), swapping `@/data` imports for prod repositories per the table.
4. Wire guest-gating with prod's `useGuestGate()` and the `(app)` auth gate.
5. Delete the mock layer — prod's `EXPO_PUBLIC_DATA_MODE` hybrid takes over.

## Web preview (dev convenience only)

The demo vehicle is Expo Go on a phone. The `dist/` folder is a static web export used
for quick browser previews (`npx expo export --platform web`).

`metro.config.js` contains a resolver override that pins **zustand** to its CommonJS
files: zustand's ESM build uses `import.meta`, which Metro's classic-script web output
cannot parse (blank page, "Cannot use 'import.meta' outside a module" — in dev *and*
export). Keep the override when porting if the production app ever enables web; native
platforms are unaffected either way. If more `import.meta` offenders appear later,
`node --check <bundle>.js` is a quick way to catch them.

## Known prototype-only simplifications

- Booking is a single 3-step wizard route (`/booking/[doctorId]`); production splits
  steps into routes — either keep the wizard or split during port.
- Queue position is a static mock (3 ahead / 15 min); production uses the live queue API.
- Reschedule/cancel/rate live in bottom-sheets on the appointment detail (kept — it's
  fewer screens than prod's separate routes and tested well).
- `me` (AI) returns canned bilingual answers keyed on symptoms; production streams from
  Groq via `/api/ai/symptom-check`.

## Scope note (2026-08-10)

Labs, prescriptions, documents and video consultations were cut from the app's
scope; their production repositories simply stay unused by this UI. Insurance is
read-only display (`patient_insurance`). Booking collects PDPL consent client-side
(`NewAppointment.consent`) — persist it with the appointment (additive column
`appointments.consent_at timestamptz` suggested) for the production port.

Same-day client revisions: **payment is card-only** (`NewAppointment` carries no
method; production should always follow `book_appointment_atomic` with the card
checkout, and never surface the processor name to patients). Favourites are
kind-aware and listed in ملفي; profile editing goes through
`patient.updateProfile`; family add/remove use the existing `family.*` verbs.
Help & support is fully client-side (i18n FAQ + `tel:`/`mailto:`/WhatsApp links).

## Profile switching (2026-08-11) — the one thing to check on the backend

The UI now reads any family member's file under a single login. Everything is
scoped by an "active patient id" (`"self"` or a family member id) held in
`appStore.activePatientId` and passed into the repositories. Before porting,
confirm on the production side:

1. **Appointments carry the dependent.** The prototype adds
   `Appointment.patient_id`. If production books dependents against a
   `family_member_id` (or `dependent_id`) column, map it to `patient_id` in the
   repository layer — no UI change needed. If it does *not* exist yet, that's an
   additive column plus a filter in `appointment.list`.
2. **RLS must allow it.** The account holder reads their dependents' rows;
   dependents have no login at all. Verify the row-level-security policies on
   `appointments`, `medical_history` and `patient_insurance` permit
   guardian-reads, and never widen them beyond one household.
3. **Insurance dependents.** The prototype derives a per-member number from the
   holder's policy (`member_id-01`, `-02`, …). Replace with the real dependent
   number if `patient_insurance` stores one.
4. Per-person medical history is keyed by person in the mock
   (`HISTORY_BY_PERSON`); newly added members intentionally show a designed
   "no records yet" empty state rather than the holder's file.

## Guest boundary (2026-08-17) — enforce it server-side too

The UI's rule is: browsing is open, **anything touching a patient file requires
a session** (booking, favourites, notifications, records). It is enforced in one
place client-side (`useAuthWall()`, plus a check inside `/booking/[doctorId]` for
deep links). Client-side gating is a UX affordance, not security — on the
production side make sure the same boundary is a *server* boundary:

1. `family.list`, `favourite.*`, `notification.*`, `appointment.*` and
   `medicalHistory/insurance` reads must all reject anonymous callers via RLS,
   not merely be hidden by the app.
2. `book_appointment_atomic` must derive the patient from the session, never
   from a client-supplied id, or a guest session could book against the holder.
   (The prototype's mock did exactly this: a guest booking was written into the
   account holder's list under *their* name.)
3. Public catalogue reads (facilities, doctors, packages, specialties, reviews)
   stay anonymous-readable — that's the part guests are meant to see.

## Catalogue invariants (2026-08-17)

The mock generator now guarantees, and the production data should satisfy:

- Every service a facility lists maps to a specialty (`ClinicService.specialty`),
  and the facility employs at least one doctor of that specialty. The UI relies
  on this to route "Book" without guessing; where it can't, it asks the patient.
- `Clinic.doctors_count` equals the number of doctors the detail screen lists.
  If production stores a denormalised count, verify it against
  `doctor.search({clinicId})` during the port or derive it.
- `HealthPackage.specialty` (+proto) is the specialty that performs the package;
  packages are only offered by facilities that staff it. If production has no
  such column, add it (additive) or map from the package's service lines.

## Round 6 client feedback (2026-08-20)

- **Map must be Google.** The prototype renders Google's public raster tiles
  through Leaflet in a WebView (no API key — fine for a demo, not licensed for
  production). The port must swap `src/components/ClinicMap.tsx` for
  `react-native-maps` with `PROVIDER_GOOGLE` + a billing-enabled Maps API key
  (iOS needs the config plugin & a dev build). Keep the medical-cross pin.
- **Guest booking / silent sign-up.** Booking is open to guests end-to-end;
  just before payment the wizard collects phone + who-for + patient age — plus
  the patient's full name when the visit is for a relative — sends an OTP, and
  verifying it signs the user up (new number) or in (known number) with no
  account language anywhere. Production mapping: `signInWithOtp` on the phone
  number, then `family.add` (relation + typed name + age→DOB) for non-self
  relations, then `book_appointment_atomic`. The typed name fills both language
  slots of the file; production should transliterate the missing script.
- **Consents are asked once, ever** (`appStore.patientConsents` /
  `clinicConsents` / `promoConsent`): PDPL data+terms per patient, clinic
  contact (phone/WA/email, service comms) per clinic, Medilink promotional
  content once per account (granted or declined). Production should persist
  these on the server (consent audit table), not in the client store.
- **No insurance anywhere in the catalogue** — self-paying bookings only.
  `Clinic.accepted_insurances` and the insurance search param were deleted.
  (The patient's own insurance card under Profile stays: display/storage only.)
- **No clinic phone numbers** in listings or details — journeys stay in-app.
- **"Featured" is not a tag** — featured clinics get their own curated home
  section (`discovery.featuredClinics`); the `featured` TagKey was removed.
- **Doctor services beyond consultation** (`Doctor.services` +proto): shown
  collapsed as "+n more services" on the doctor screen. Production needs a
  doctor_services table (or service-menu join) with per-doctor prices.
- **The Me assistant tab is hidden** (TabBar `TABS` array) — route intact.
