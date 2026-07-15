import { Languages } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useTranslation } from "react-i18next";
import { resolveAppLanguage } from "../../i18n";
import { LANGUAGE_OPTIONS } from "../../i18n/types";

interface LanguageSettingsProps {
  variant?: "admin" | "user";
}

export default function LanguageSettings({
  variant = "admin",
}: LanguageSettingsProps) {
  const reduceMotion = useReducedMotion();
  const { t, i18n } = useTranslation("settings");
  const currentLanguage = resolveAppLanguage(
    i18n.resolvedLanguage ?? i18n.language,
  );
  const isUserVariant = variant === "user";

  const content = (
    <>
      <div
        className={
          isUserVariant
            ? "flex items-center gap-3 border-b border-hairline px-5 py-4"
            : "mb-5"
        }
      >
        {isUserVariant ? (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-hairline bg-subtle-bg text-accent-active">
            <Languages size={18} strokeWidth={1.7} />
          </div>
        ) : null}
        <div>
          <h2
            className={
              isUserVariant
                ? "section-headline text-base"
                : "text-sm font-semibold text-text-primary"
            }
          >
            {t("language.title")}
          </h2>
          <p
            className={
              isUserVariant
                ? "section-subline"
                : "mt-1 text-xs text-text-tertiary"
            }
          >
            {t("language.description")}
          </p>
        </div>
      </div>

      <div className={isUserVariant ? "grid grid-cols-2 gap-3 p-5" : "grid grid-cols-2 gap-2 rounded-2xl border border-hairline bg-surface-2 p-1.5"}>
        {LANGUAGE_OPTIONS.map((option) => {
          const selected = option.value === currentLanguage;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => void i18n.changeLanguage(option.value)}
              aria-pressed={selected}
              className={[
                "group relative flex min-h-24 flex-col justify-between text-left transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-active/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
                isUserVariant
                  ? "rounded-2xl border p-4"
                  : "rounded-xl px-3 py-3",
                selected
                  ? isUserVariant
                    ? "border-accent-active/40 bg-accent-active/8 shadow-[0_8px_24px_-12px_var(--theme-shadow)]"
                    : "bg-surface text-text-primary shadow-[0_14px_36px_-28px_var(--theme-shadow)] ring-1 ring-hairline"
                  : isUserVariant
                    ? "border-hairline bg-subtle-bg hover:bg-subtle-bg-hover"
                    : "text-text-secondary hover:bg-(--theme-subtle-bg-hover) hover:text-text-primary",
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-8 w-8 items-center justify-center rounded-full font-mono-num text-[10px] font-semibold uppercase transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
                  selected
                    ? "bg-accent-active/12 text-accent-active ring-1 ring-accent-active/25"
                    : "theme-icon-shell text-text-tertiary group-hover:text-text-primary",
                ].join(" ")}
                aria-hidden="true"
              >
                {option.value}
              </span>
              <span className="mt-3">
                <span className="block text-[12px] font-semibold text-text-primary">
                  {option.label}
                </span>
                <span className="mt-0.5 block text-[10px] leading-relaxed text-text-tertiary">
                  {t(option.translationKey)}
                </span>
              </span>
              {selected ? (
                <motion.span
                  initial={reduceMotion ? false : { scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-3 top-3 h-2 w-2 rounded-full bg-accent-active"
                  aria-hidden="true"
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </>
  );

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: 0.25,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={isUserVariant ? "bezel-shell overflow-hidden" : "theme-card rounded-2xl p-6"}
    >
      {isUserVariant ? <div className="bezel-core relative">{content}</div> : content}
    </motion.section>
  );
}
