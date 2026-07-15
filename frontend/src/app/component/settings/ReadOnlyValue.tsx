import { motion, useReducedMotion } from "motion/react";
import { useTranslation } from "react-i18next";

interface ReadOnlyValueProps {
  labelKey: string;
  value: string;
  index?: number;
}

export default function ReadOnlyValue({ labelKey, value, index = 0 }: ReadOnlyValueProps) {
  const reduceMotion = useReducedMotion();
  const { t } = useTranslation("settings");

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: 0.1 + index * 0.03,
        ease: [0.16, 1, 0.3, 1],
      }}
      whileHover={reduceMotion ? {} : { scale: 1.02 }}
      className="group relative overflow-hidden rounded-xl border border-hairline bg-(--theme-subtle-bg) px-4 py-3 transition-colors duration-300 hover:bg-(--theme-subtle-bg-hover)"
    >
      <div className="text-[10px] font-medium uppercase tracking-widest text-text-tertiary">
        {t(labelKey, { defaultValue: labelKey })}
      </div>
      <motion.div
        className="mt-1.5 font-mono text-sm font-medium tabular-nums text-text-primary"
        layoutId={`value-${labelKey}`}
      >
        {value}
      </motion.div>
    </motion.div>
  );
}
