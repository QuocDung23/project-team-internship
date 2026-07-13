import { motion } from "motion/react";
import { SPRING } from "../../utils/trips/tripMotion";

interface LiveMetricTileProps {
  label: string;
  value: string;
  alert: boolean;
  delay?: number;
}

export default function LiveMetricTile({ label, value, alert, delay = 0 }: LiveMetricTileProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ ...SPRING, delay }}
      className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-[1.5px]"
    >
      <div className="relative overflow-hidden rounded-[calc(1rem-1.5px)] bg-gradient-to-br from-zinc-950/80 to-zinc-900/40 px-3.5 py-3">
        {/* Alert glow */}
        {alert && (
          <div
            aria-hidden
            className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 animate-pulse rounded-full opacity-70 blur-2xl"
            style={{ background: "radial-gradient(circle, rgba(244,63,94,0.7) 0%, transparent 70%)" }}
          />
        )}
        <div className="relative">
          <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">{label}</p>
          <p
            className={`mt-1.5 font-mono-num text-xl font-semibold tracking-tight tabular-nums transition-colors duration-300 ${
              alert ? "text-rose-400" : "text-zinc-100"
            }`}
          >
            {value}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
