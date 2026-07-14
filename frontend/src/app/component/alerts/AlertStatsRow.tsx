"use client";
import { motion } from "motion/react";
import type { AlertsStats } from "../../types/alerts";

interface AlertStatsRowProps {
  stats: AlertsStats;
}

type StatTone = "neutral" | "critical" | "warn" | "active";

const STAT_CONFIG: Record<StatTone, { gradient: string; ring: string; text: string; glow?: string }> = {
  neutral: { 
    gradient: "from-zinc-500/10 to-zinc-500/5", 
    ring: "ring-zinc-500/20", 
    text: "text-zinc-100",
  },
  critical: { 
    gradient: "from-red-500/15 to-red-500/5", 
    ring: "ring-red-500/30", 
    text: "text-red-400",
    glow: "shadow-[0_0_20px_rgba(239,68,68,0.15)]",
  },
  warn: { 
    gradient: "from-amber-500/15 to-amber-500/5", 
    ring: "ring-amber-500/30", 
    text: "text-amber-400",
    glow: "shadow-[0_0_20px_rgba(245,158,11,0.12)]",
  },
  active: { 
    gradient: "from-emerald-500/15 to-emerald-500/5", 
    ring: "ring-emerald-500/30", 
    text: "text-emerald-400",
    glow: "shadow-[0_0_20px_rgba(52,211,153,0.12)]",
  },
};

const items: ReadonlyArray<{ label: string; key: keyof AlertsStats; tone: StatTone }> = [
  { label: "Total Events", key: "total", tone: "neutral" },
  { label: "Critical", key: "critical", tone: "critical" },
  { label: "Warning", key: "warn", tone: "warn" },
  { label: "Acknowledged", key: "acknowledged", tone: "active" },
];

export default function AlertStatsRow({ stats }: AlertStatsRowProps) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map(({ label, key, tone }, index) => {
        const value = stats[key];
        const config = STAT_CONFIG[tone];
        return (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              duration: 0.5, 
              delay: index * 0.08, 
              ease: [0.32, 0.72, 0, 1] 
            }}
            className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-linear-to-br ${config.gradient} p-px ${config.ring} ${config.glow ?? ""}`}
          >
            <div className="relative rounded-[1.25rem] bg-linear-to-br from-zinc-900/90 to-zinc-950 p-4">
              <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-linear-to-br to-transparent" />
              
              <div className="relative">
                <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                  {label}
                </span>
                <motion.span 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.08 + 0.2 }}
                  className={`mt-2 block font-mono-num text-3xl font-bold ${config.text}`}
                >
                  {value}
                </motion.span>
              </div>
              
              <div className={`absolute -bottom-2 -right-2 h-16 w-16 rounded-full bg-linear-to-br ${config.gradient} opacity-20 blur-xl transition-opacity duration-300 group-hover:opacity-40`} />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
