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
      whileHover={reduceMotion ? {} : { scale: 1.02, borderColor: "rgba(161, 161, 170, 0.5)" }}
      className="group relative overflow-hidden rounded-xl border border-zinc-800/50 bg-zinc-900/50 px-4 py-3 transition-colors duration-300"
    >
      <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-zinc-500">
        {label}
      </div>
      <motion.div
        className="mt-1.5 font-mono text-sm font-medium tabular-nums text-zinc-200"
        layoutId={`value-${label}`}
      >
        {value}
      </motion.div>
    </motion.div>
  );
}
