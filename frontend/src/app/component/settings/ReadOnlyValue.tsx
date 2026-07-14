import { motion, useReducedMotion } from "motion/react";

interface ReadOnlyValueProps {
  label: string;
  value: string;
  index?: number;
}

export default function ReadOnlyValue({ label, value, index = 0 }: ReadOnlyValueProps) {
  const reduceMotion = useReducedMotion();

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
      className="group relative overflow-hidden rounded-xl border border-hairline bg-[var(--theme-subtle-bg)] px-4 py-3 transition-colors duration-300 hover:bg-[var(--theme-subtle-bg-hover)]"
    >
      <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-text-tertiary">
        {label}
      </div>
      <motion.div
        className="mt-1.5 font-mono text-sm font-medium tabular-nums text-text-primary"
        layoutId={`value-${label}`}
      >
        {value}
      </motion.div>
    </motion.div>
  );
}
