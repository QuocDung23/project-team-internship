import type { AppLanguage } from "./types";

export const LANGUAGE_STORAGE_KEY = "driver-safety-language";
export const DEFAULT_LANGUAGE: AppLanguage = "en";

export function isAppLanguage(value: string | null | undefined): value is AppLanguage {
  return value === "en" || value === "vi";
}

export function resolveAppLanguage(value: string | null | undefined): AppLanguage {
  if (!value) return DEFAULT_LANGUAGE;
  const baseLanguage = value.toLowerCase().split("-")[0];
  return isAppLanguage(baseLanguage) ? baseLanguage : DEFAULT_LANGUAGE;
}

export function readStoredLanguage(): AppLanguage {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;

  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isAppLanguage(stored) ? stored : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export function writeStoredLanguage(language: AppLanguage): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    return;
  }
}

export function applyLanguage(language: AppLanguage): void {
  if (typeof document === "undefined") return;
  document.documentElement.lang = language;
  document.documentElement.dir = "ltr";
}
