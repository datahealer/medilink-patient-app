# Medilink · ميديلنك — UX Redesign Prototype

Arabic-first, RTL-first redesign of the Medilink patient app for the Oman market.
Built with **Expo SDK 54 / React Native 0.81 / expo-router 6 / TypeScript** — the same
stack as the production app — and designed so the approved UI ports onto the existing
Supabase/HAMS backend **without backend changes** (see [docs/PORTING.md](docs/PORTING.md)).

> The `brandkit/` and `screenshots/` folders are input material only — nothing in the
> app references them; delete them whenever you like. Fonts and logos the app uses are
> copied into `assets/`.

## Run it (phone — the real demo)

```bash
npm install
npx expo start --tunnel
```

Scan the QR with the **iOS Camera app** → it opens in **Expo Go** (install Expo Go
from the App Store first). The app opens in Arabic by default.

**If the Camera says “no usable data found”:**
- The terminal QR is easily corrupted by font/line-spacing. `--tunnel` mode (above)
  prints an `exp.direct` QR that scans much more reliably — prefer it.
- Bulletproof fallback: open **Expo Go → “Enter URL manually”** and type the
  `exp://…` URL printed right above the QR (LAN mode on this Mac:
  `exp://192.168.100.4:8081` — phone and Mac must be on the same Wi-Fi;
  tunnel mode prints an `exp://….exp.direct` URL that works from any network).
- Zoom the terminal out / maximize the window so the QR is fully visible, then rescan.

## Run it (browser preview)

```bash
npx expo start --web
```

Or serve the pre-built static export in `dist/`:

```bash
python3 -m http.server 8090 --directory dist
```

> `metro.config.js` pins `zustand` to its CommonJS build — its ESM build contains
> `import.meta`, which breaks Metro's classic-script web output with
> “Cannot use 'import.meta' outside a module”. Don't remove that override.
> Regenerate the static export any time with `npx expo export --platform web`.

## Demo script (suggested)

1. **Onboarding** — language-first (العربية preselected), brand slides, slant-edge CTA.
2. **Sign-in** — +968 phone, OTP auto-fills (demo nicety).
3. **Home** — next-visit card, services grid, packages, nearby clinics, top doctors.
4. **Search vs Explore** — the home search bar opens the universal hub
   (`/search`: four doors, grouped results); the **Explore tab** opens the
   clinics browser **map-first**. Tapping a service opens
   `/services/[specialty]` with a **Doctors ⇄ Clinics** switch, because clinics
   offer services too.
5. **Doctor → Book** — 3 steps: patient (family member!), time (Fri greyed = Oman weekend),
   confirm (OMR 3-decimals + 5% VAT, card payment — no processor branding,
   **PDPL consent checkbox**) → confirmation with reference.
6. **Visits** — the pending-payment appointment → «ادفع الآن» → status flips; check-in → queue.
7. **مي (Me)** — the AI health assistant: tap a suggestion, get advice + doctor cards.
8. **الملف (Profile)** — tap the identity card to **switch profiles**: read your
   spouse's, parent's or child's file (their visits, their medical history,
   their insurance) and switch back in one tap. Below it: health records
   (history, insurance) and account (family, favourites, settings).
9. **Details pages** — WhatsApp share + favourite heart on doctor/clinic/package;
   Directions opens Google Maps. Profile → edit profile, help & support (FAQ + contact).
10. **The flip** — Profile → English: the whole app mirrors **instantly**, no restart.
   Then Dark mode. Then back to العربية.

## Where things live

```
app/                 expo-router screens (~30)
src/theme/           brand tokens, light/dark semantic colors, typography (Zarid/Agatho/Manrope)
src/i18n/            typed catalogs (ar.ts is the primary voice), instant-RTL provider
src/components/ui/   design system: icons (custom SVG set), CTA, cards, sheets, date picker…
src/components/      composed pieces: ProfileSwitcher, FavButton, ClinicMap
src/features/        Doctors/Clinics/PackagesBrowser — one browser per entity, reused by every entry point
src/data/            domain types + repository interfaces (mirrors production contract)
src/data/mock/       bilingual Omani generators: 120 doctors, 80 clinics, 30 packages + tags
docs/DESIGN.md       UX decisions & anti-clutter rules
docs/PORTING.md      how this UI drops onto the production backend
```

## The UX rules this app follows (docs/DESIGN.md)

- One job per screen, one primary action (the brand's slant-edge CTA).
- Each screen's search is scoped to that screen (doctors / clinics / packages / everything-hub),
  and no two navigation elements do the same job.
- No ads, no duplicated sections, no "0.0 (0)" ratings, designed empty states.
- Labels under every tab icon, 44pt touch targets, Friday = weekend.
- Western digits, OMR with 3 decimals (baisa), 5% VAT shown at booking.
- Arabic is written first (mildly Omani: حيّاك، نشوفك إن شاء الله) — never translated-sounding.

## Scope decisions (client, 2026-08-10)

- **Out:** video consultations, lab results, prescriptions, documents.
- **Insurance:** display/storage only — claims happen at the clinic.
- Catalog is 10×: 120 doctors, 80 clinics, 30 packages (deterministic bilingual
  generator in `src/data/mock/seed.ts`) with sparse promo tags
  (featured, top rated, {n}% off, near you, last-n-slots…).
- Booking requires PDPL consent (Oman Personal Data Protection Law) before confirm.
- **Payment is card-only** — no pay-at-clinic, and the payment processor is never
  named in the UI.
- Favourites (doctor / clinic / package hearts) collect in الملف ← المفضلة.
- **One login, many files:** the account holder switches between their own and
  each family member's profile; only they can add members or switch. Visits,
  medical history and insurance all follow the active person.
- Section names are general (**Doctors**, **Clinics**) — "highly rated" and
  "near you" are filters, not sections.
