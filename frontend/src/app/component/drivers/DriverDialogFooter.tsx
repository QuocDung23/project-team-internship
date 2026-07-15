import { Plus, Loader } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { SPRING } from "../../utils/drivers/driverFormHelpers";

export default function DriverDialogFooter({
  mode,
  isSaving,
  onCancel,
}: {
  mode: "create" | "manage";
  isSaving: boolean;
  onCancel: () => void;
}) {
  const { t } = useTranslation("drivers");
  return (
    <>
      <motion.button
        type="button"
        onClick={onCancel}
        disabled={isSaving}
        whileTap={{ scale: 0.97 }}
        transition={SPRING}
        aria-label={t("footer.cancel")}
        className="group inline-flex items-center gap-2 rounded-full border border-hairline bg-subtle-bg p-[1.5px] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-hairline hover:bg-subtle-bg-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="rounded-full px-4 py-2 text-[11.5px] font-medium text-text-secondary transition-colors group-hover:text-text-primary">
          {t("footer.cancel")}
        </span>
      </motion.button>
      <motion.button
        type="submit"
        form="driver-form"
        disabled={isSaving}
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.97 }}
        transition={SPRING}
        aria-label={
          mode === "manage" ? t("footer.saveChanges") : t("footer.createDriver")
        }
        className="group inline-flex items-center gap-1.5 rounded-full border border-accent-active/25 bg-subtle-bg p-[1.5px] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-accent-active/40 hover:bg-accent-active/14 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11.5px] font-semibold text-accent-active"
          style={{
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.10), 0 6px 20px -8px var(--theme-shadow)",
          }}
        >
          {isSaving ? (
            <Loader
              size={13}
              strokeWidth={2.5}
              className="animate-spin text-accent-active"
            />
          ) : (
            <Plus size={13} strokeWidth={2.5} className="text-accent-active" />
          )}
          {mode === "manage" ? t("footer.saveChanges") : t("footer.createDriver")}
        </span>
      </motion.button>
    </>
  );
}
