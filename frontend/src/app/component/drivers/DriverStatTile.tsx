import type { ReactNode } from "react";
import { motion } from "motion/react";
import {
  SPRING,
  STAT_TONE_TEXT,
  STAT_TONE_GLOW,
  type StatTone,
} from "../../utils/drivers/driverFormHelpers";

export default function DriverStatTile({
  icon,
  label,
  value,
  tone,
  delay,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  tone: StatTone;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay }}
      whileHover={{ y: -2 }}
      className="group relative overflow-hidden rounded-2xl border border-hairline bg-subtle-bg p-[1.5px]"
    >
      <div className="relative overflow-hidden rounded-[calc(1rem-1.5px)] bg-surface px-3.5 py-3">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-60 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background: `radial-gradient(circle, ${STAT_TONE_GLOW[tone]} 0%, transparent 70%)`,
          }}
        />
        <div className="relative flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.16em] text-text-tertiary">
          <span
            className={`flex h-5 w-5 items-center justify-center rounded-md border border-hairline bg-subtle-bg ${STAT_TONE_TEXT[tone]}`}
          >
            {icon}
          </span>
          {label}
        </div>
        <div
          className={`relative mt-2 font-mono-num text-2xl font-semibold tracking-tight tabular-nums ${STAT_TONE_TEXT[tone]}`}
        >
          {value}
        </div>
      </div>
    </motion.div>
  );
}
