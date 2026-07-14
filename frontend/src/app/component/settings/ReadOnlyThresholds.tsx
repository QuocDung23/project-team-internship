import { motion, useReducedMotion } from "motion/react";
import { READ_ONLY_SETTINGS } from "../../constants/settings/constants";
import ReadOnlyValue from "./ReadOnlyValue";

export default function ReadOnlyThresholds() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className="theme-card rounded-2xl p-6"
    >
      <div className="mb-5">
        <h2 className="text-sm font-semibold text-text-primary">
          Detector Thresholds
        </h2>
        <p className="mt-1 text-xs text-text-tertiary">
          System-defined values, read-only
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {READ_ONLY_SETTINGS.map(([label, value], index) => (
          <ReadOnlyValue
            key={label}
            label={label}
            value={value}
            index={index}
          />
        ))}
      </div>
    </motion.section>
  );
}
