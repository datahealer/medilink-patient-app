import type { I18n } from "@/i18n";

/**
 * Money — OMR is quoted to 3 decimal places (baisa precision), Western digits
 * in both languages (Omani convention). VAT = 5% (shared/src/config/payments.ts).
 */
export const VAT_RATE = 0.05;
export const round3 = (n: number) => Math.round(n * 1000) / 1000;

export function consultationTotal(fee: number) {
  const vat = round3(fee * VAT_RATE);
  return { fee: round3(fee), vat, total: round3(fee + vat) };
}

/**
 * Arabic-Indic (٠–٩) and Extended Arabic-Indic (۰–۹) digits → ASCII, so a
 * number typed on an Arabic keyboard validates and stores like any other.
 * (JS \d only matches ASCII — without this, ٩١٢٣ counts as zero digits.)
 */
export function toWesternDigits(s: string): string {
  return s
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

/**
 * LTR bidi isolate (U+2066 LRI … U+2069 PDI). Phone numbers, masked IDs, and
 * "O+"-style tokens are LTR digit runs split by neutral characters (space, +,
 * •), so RTL layout reorders the groups ("+968 9123 4567" → "4567 9123 968+")
 * unless the whole token is isolated.
 */
export const ltr = (s: string) => `⁦${s}⁩`;

export function formatOMR(amount: number, i18n: Pick<I18n, "isRTL" | "t">): string {
  const value = amount.toFixed(3);
  return i18n.isRTL ? `${value} ر.ع` : `OMR ${value}`;
}

/** "الأحد، 24 أغسطس" / "Sunday, 24 August" from an ISO date. */
export function formatDayDate(iso: string, i18n: Pick<I18n, "isRTL" | "t">): string {
  const d = new Date(`${iso}T12:00:00`);
  const dow = i18n.t(`common.dow${d.getDay()}` as never);
  const month = i18n.t(`common.m${d.getMonth()}` as never);
  const comma = i18n.isRTL ? "،" : ",";
  return `${dow}${comma} ${d.getDate()} ${month}`;
}

/** Short "24 أغسطس" / "24 Aug-style" date. */
export function formatShortDate(iso: string, t: I18n["t"]): string {
  const d = new Date(`${iso}T12:00:00`);
  return `${d.getDate()} ${t(`common.m${d.getMonth()}` as never)}`;
}

/** 12-hour clock: "10:30 صباحاً" / "10:30 AM". */
export function formatTime(hhmm: string, i18n: Pick<I18n, "isRTL" | "t">): string {
  const [hStr, mStr] = hhmm.split(":");
  let h = Number(hStr);
  const suffixKey = h < 12 ? "common.morning" : h < 16 ? "common.afternoon" : "common.evening";
  const ampm = i18n.isRTL ? i18n.t(suffixKey as never) : h < 12 ? "AM" : "PM";
  h = h % 12 || 12;
  return `${h}:${mStr} ${ampm}`;
}

export function isoAddDays(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysUntil(iso: string): number {
  const today = new Date(todayISO() + "T00:00:00");
  const target = new Date(iso + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function ageFrom(dobISO: string): number {
  const dob = new Date(dobISO);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

export function initialsOf(name: string): string {
  const parts = name.replace(/^د\.|^Dr\.?/i, "").trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}
