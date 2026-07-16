import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercent,
  formatRelativeTime,
  formatTime,
  type DateInput,
} from "./formatters";
import { resolveAppLanguage } from "./languageStorage";

export function useAppLocale() {
  const { i18n } = useTranslation();
  const language = resolveAppLanguage(i18n.resolvedLanguage ?? i18n.language);

  return useMemo(
    () => ({
      language,
      formatDate: (value: DateInput, options?: Intl.DateTimeFormatOptions) =>
        formatDate(value, language, options),
      formatDateTime: (value: DateInput, options?: Intl.DateTimeFormatOptions) =>
        formatDateTime(value, language, options),
      formatTime: (value: DateInput, options?: Intl.DateTimeFormatOptions) =>
        formatTime(value, language, options),
      formatRelativeTime: (value: DateInput, now: DateInput = Date.now()) =>
        formatRelativeTime(value, now, language),
      formatNumber: (value: number, options?: Intl.NumberFormatOptions) =>
        formatNumber(value, language, options),
      formatPercent: (value: number, options?: Intl.NumberFormatOptions) =>
        formatPercent(value, language, options),
    }),
    [language],
  );
}
