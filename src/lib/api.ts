import { Platform } from "react-native";

import { env } from "@/config/env";
import { getAccessToken } from "@/lib/supabase";

/**
 * Thin client for the MediLink backend (payments, queue status) — adapted from
 * production `mobile/src/services/api.ts`. Every request carries the Supabase
 * access token as a Bearer credential.
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const REQUEST_TIMEOUT_MS = 20_000;

/** Android emulator reaches the host at 10.0.2.2, not localhost. */
function resolveBaseUrl(): string {
  const base = (env.API_URL || "").trim().replace(/\/+$/, "");
  if (Platform.OS === "android") {
    return base.replace(/^(https?:\/\/)(localhost|127\.0\.0\.1)(?=[:/]|$)/i, "$110.0.2.2");
  }
  return base;
}

export async function apiFetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const base = resolveBaseUrl();
  const url = path.startsWith("http") ? path : `${base}${path.startsWith("/") ? "" : "/"}${path}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, { ...init, headers, signal: controller.signal });
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    const detail = aborted ? `timed out after ${REQUEST_TIMEOUT_MS / 1000}s` : e instanceof Error ? e.message : String(e);
    throw new ApiError(
      0,
      `Couldn't reach the API server at ${url} (${detail}). EXPO_PUBLIC_API_URL must be a host ` +
        `this device can see — a LAN IP (not "localhost") for a physical phone.`,
      { url, cause: detail },
    );
  } finally {
    clearTimeout(timer);
  }

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await res.json().catch(() => null) : await res.text();
  if (!res.ok) {
    const message = (isJson && payload && (payload as { error?: string }).error) || `Request failed (${res.status})`;
    throw new ApiError(res.status, typeof message === "string" ? message : `Request failed (${res.status})`, payload);
  }
  return payload as T;
}
