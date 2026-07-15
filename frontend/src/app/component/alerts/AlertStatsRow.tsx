"use client";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import type { AlertsStats } from "../../types/alerts";

interface AlertStatsRowProps {
  stats: AlertsStats;
}

type StatTone = "neutral" | "critical" | "warn" | "active";

const STAT_CONFIG: Record<StatTone, { gradient: string; ring: string; text: string; glow?: string }> = {
  neutral: {
    gradient: "from-text-tertiary/10 to-text-tertiary/5",
    ring: "ring-text-tertiary/20",
    text: "text-text-primary",
  },
  critical: {
    gradient: "from-accent-critical/15 to-accent-critical/5",
    ring: "ring-accent-critical/30",
    text: "text-accent-critical",
    glow: "shadow-[0_0_20px_rgba(220,38,38,0.15)]",
  },
  warn: {
    gradient: "from-accent-warn/15 to-accent-warn/5",
    ring: "ring-accent-warn/30",
    text: "text-accent-warn",
    glow: "shadow-[0_0_20px_rgba(245,158,11,0.12)]",
  },
  active: {
    gradient: "from-accent-active/15 to-accent-active/5",
    ring: "ring-accent-active/30",
    text: "text-accent-active",
    glow: "shadow-[0_0_20px_rgba(16,185,129,0.12)]",
  },
};

type LabelKey = "stats.total" | "stats.critical" | "stats.warning" | "stats.acknowledged";

const items: ReadonlyArray<{ labelKey: LabelKey; key: keyof AlertsStats; tone: StatTone }> = [
  { labelKey: "stats.total", key: "total", tone: "neutral" },
  { labelKey: "stats.critical", key: "critical", tone: "critical" },
  { labelKey: "stats.warning", key: "warn", tone: "warn" },
  { labelKey: "stats.acknowledged", key: "acknowledged", tone: "active" },
];

export default function AlertStatsRow({ stats }: AlertStatsRowProps) {
  const { t } = useTranslation("alerts");
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map(({ labelKey, key, tone }, index) => {
        const value = stats[key];
        const config = STAT_CONFIG[tone];
        return (
          <motion.div
            key={labelKey}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.5,
              delay: index * 0.08,
              ease: [0.32, 0.72, 0, 1],
            }}
            className={`group relative overflow-hidden rounded-2xl border border-hairline bg-linear-to-br ${config.gradient} p-px ${config.ring} ${config.glow ?? ""}`}
          >
            <div className="relative rounded-[1.25rem] bg-surface p-4">
              <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-linear-to-br to-transparent" />

              <div className="relative">
                <span className="text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
                  {t(labelKey)}
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
