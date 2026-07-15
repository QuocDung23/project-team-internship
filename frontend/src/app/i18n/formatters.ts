import type { AppLanguage } from "./types";
import { resolveAppLanguage } from "./languageStorage";

export const LANGUAGE_LOCALES: Record<AppLanguage, string> = {
  en: "en-US",
  vi: "vi-VN",
};

export type DateInput = Date | string | number;

function toDate(value: DateInput): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(
  value: DateInput,
  language: AppLanguage,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
): string {
  const date = toDate(value);
  if (!date) return "-";
  return new Intl.DateTimeFormat(LANGUAGE_LOCALES[language], options).format(date);
}

export function formatDateTime(
  value: DateInput,
  language: AppLanguage,
  options: Intl.DateTimeFormatOptions = {
    dateStyle: "medium",
    timeStyle: "short",
  },
): string {
  return formatDate(value, language, options);
}

export function formatTime(
  value: DateInput,
  language: AppLanguage,
  options: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  },
): string {
  return formatDate(value, language, options);
}

export function formatRelativeTime(
  value: DateInput,
  now: DateInput,
  language: AppLanguage,
): string {
  const date = toDate(value);
  const currentDate = toDate(now);
  if (!date || !currentDate) return "-";

  const seconds = Math.round((date.getTime() - currentDate.getTime()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(LANGUAGE_LOCALES[language], {
    numeric: "auto",
  });
  const absoluteSeconds = Math.abs(seconds);

  if (absoluteSeconds < 60) return formatter.format(seconds, "second");
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, "hour");
  const days = Math.round(hours / 24);
  return formatter.format(days, "day");
}

export function formatNumber(
  value: number,
  language: AppLanguage,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(LANGUAGE_LOCALES[language], options).format(value);
}

export function formatPercent(
  value: number,
  language: AppLanguage,
  options?: Intl.NumberFormatOptions,
): string {
  return formatNumber(value, language, { style: "percent", ...options });
}

export function localeFor(language: string | null | undefined): string {
  return LANGUAGE_LOCALES[resolveAppLanguage(language)];
}
