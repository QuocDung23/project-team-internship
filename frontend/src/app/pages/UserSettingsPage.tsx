import { motion, useReducedMotion } from "motion/react";
import { useTranslation } from "react-i18next";
import UserAppearanceSettings from "../component/settings/UserAppearanceSettings";
import LanguageSettings from "../component/settings/LanguageSettings";

export default function UserSettingsPage() {
  const reduceMotion = useReducedMotion();
  const { t } = useTranslation("settings");

  return (
    <div className="flex flex-1 flex-col gap-5 p-4 md:gap-6 md:p-6">
      <motion.header
        initial={reduceMotion ? false : { opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="mb-2">
          <span className="text-[11px] font-medium uppercase tracking-[0.15em] text-text-tertiary">
            {t("user.eyebrow")}
          </span>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
          {t("user.title")}
        </h1>
        <p className="mt-1 text-sm text-text-tertiary">
          {t("user.description")}
        </p>
      </motion.header>

      <div className="grid gap-6 lg:grid-cols-1 lg:gap-8">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col gap-6"
        >
          <UserAppearanceSettings />
          <LanguageSettings variant="user" />
        </motion.div>
      </div>
    </div>
  );
}
