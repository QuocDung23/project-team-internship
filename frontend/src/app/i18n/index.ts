import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import {
  defaultNamespace,
  namespaces,
  resources,
  SUPPORTED_LANGUAGES,
} from "./config";
import {
  applyLanguage,
  DEFAULT_LANGUAGE,
  readStoredLanguage,
  resolveAppLanguage,
  writeStoredLanguage,
} from "./languageStorage";

let languageChangeListenerAttached = false;

function applyLocalizedMetadata(language: string): void {
  const resolvedLanguage = resolveAppLanguage(language);
  applyLanguage(resolvedLanguage);
  if (typeof document !== "undefined") {
    document.title = i18n.t("meta.title", { lng: resolvedLanguage, ns: "common" });
  }
}

export async function initializeI18n(): Promise<void> {
  const language = readStoredLanguage();

  if (!i18n.isInitialized) {
    await i18n.use(initReactI18next).init({
      resources,
      lng: language,
      fallbackLng: DEFAULT_LANGUAGE,
      supportedLngs: [...SUPPORTED_LANGUAGES],
      ns: [...namespaces],
      defaultNS: defaultNamespace,
      interpolation: { escapeValue: false },
      returnNull: false,
    });
  } else if (resolveAppLanguage(i18n.resolvedLanguage) !== language) {
    await i18n.changeLanguage(language);
  }

  applyLocalizedMetadata(language);

  if (!languageChangeListenerAttached) {
    i18n.on("languageChanged", (nextLanguage) => {
      const resolvedLanguage = resolveAppLanguage(nextLanguage);
      writeStoredLanguage(resolvedLanguage);
      applyLocalizedMetadata(resolvedLanguage);
    });
    languageChangeListenerAttached = true;
  }
}

export { i18n };
export { resolveAppLanguage } from "./languageStorage";
export type { AppLanguage } from "./types";
