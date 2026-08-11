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
| `patient.getMedicalHistory()` | `medicalHistory.get()` |
| `patient.getInsurance()` | **new** — read `patient_insurance` (table exists; add a small shared api fn) |
| `family.list/add/remove` | `family.list/add/remove` |
| `discovery.listSpecialties/featuredClinics/searchClinics/getClinic` | `discovery.*` (same names) |
| `discovery.searchPackages/getPackage` | **new** — see “Additive backend work” |
| `doctor.search/get/reviews` | `doctor.search/get/reviews` |
| `doctor.top()` | `doctor.search({ topRated: true, limit: 6 })` |
| `appointment.list("upcoming"\|"past")` | `appointment.list(tab)` |
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
