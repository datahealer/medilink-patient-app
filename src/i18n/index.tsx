import React, { createContext, useContext, useMemo } from "react";
import { I18nManager } from "react-native";
import { en, type Messages } from "./en";
import { ar } from "./ar";
import { useAppStore, type Locale } from "@/stores/appStore";

/**
 * RTL strategy (identical to production): the NATIVE layout stays LTR forever;
 * every component mirrors itself from JS via `isRTL`. Language and direction
 * therefore flip instantly with no app restart.
 */
if (I18nManager.isRTL) {
  // Self-heal if a previous build forced native RTL.
  I18nManager.allowRTL(false);
  I18nManager.forceRTL(false);
}

type Leaves<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];

export type MessageKey = Leaves<Messages>;

const catalogs: Record<Locale, Messages> = { en, ar };

function resolve(catalog: Messages, key: string): string {
  const parts = key.split(".");
  let node: unknown = catalog;
  for (const p of parts) {
    if (node && typeof node === "object" && p in (node as Record<string, unknown>)) {
      node = (node as Record<string, unknown>)[p];
    } else {
      return key; // missing key falls back to the raw key, never crashes
    }
  }
  return typeof node === "string" ? node : key;
}

function interpolate(text: string, vars?: Record<string, string | number>): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m));
}

export interface I18n {
  locale: Locale;
  isRTL: boolean;
  dir: "rtl" | "ltr";
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
  setLocale: (l: Locale) => void;
}

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const locale = useAppStore((s) => s.locale);
  const setLocale = useAppStore((s) => s.setLocale);

  const value = useMemo<I18n>(() => {
    const catalog = catalogs[locale];
    return {
      locale,
      isRTL: locale === "ar",
      dir: locale === "ar" ? "rtl" : "ltr",
      t: (key, vars) => interpolate(resolve(catalog, key), vars),
      setLocale,
    };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}

/**
 * Entity-name localization — same contract as production `localizedName()`:
 * Arabic renders only when present AND verified; otherwise English fallback.
 * (All prototype mock entities ship verified Arabic.)
 */
export function localizedName(
  enValue: string,
  arValue: string | null | undefined,
  status: string | null | undefined,
  isRTL: boolean,
): string {
  if (isRTL && arValue && (status === "verified" || status === "admin_entered")) return arValue;
  return enValue;
}

/** Convenience for the prototype's fully-bilingual mock entities. */
export function pickLang(isRTL: boolean, enValue: string, arValue?: string | null): string {
  return isRTL && arValue ? arValue : enValue;
}
