export const SUPPORTED_LANGUAGES = ["en", "vi"] as const;

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export interface LanguageOption {
  value: AppLanguage;
  label: string;
  translationKey:
    | "language.options.en.description"
    | "language.options.vi.description";
}

export const LANGUAGE_OPTIONS: ReadonlyArray<LanguageOption> = [
  {
    value: "en",
    label: "English",
    translationKey: "language.options.en.description",
  },
  {
    value: "vi",
    label: "Tiếng Việt",
    translationKey: "language.options.vi.description",
  },
];
