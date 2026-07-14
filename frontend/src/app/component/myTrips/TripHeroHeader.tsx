import {
  AlertTriangle,
  CheckCircle2,
  Clock4,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { motion } from "motion/react";

const SPRING = {
  type: "spring" as const,
  stiffness: 240,
  damping: 28,
  mass: 0.9,
};

interface TripHeroHeaderProps {
  activeTripCount: number;
  completedCount: number;
  avgScore: number | null;
  totalAlerts: number;
  criticalAlerts: number;
  canStartNew: boolean;
  onNewTrip: () => void;
}

export default function TripHeroHeader({
  activeTripCount,
  completedCount,
  avgScore,
  totalAlerts,
  criticalAlerts,
  canStartNew,
  onNewTrip,
}: TripHeroHeaderProps) {
  const tiles = [
    {
      label: "Completed",
      value: String(completedCount),
      tone:
        "text-emerald-300 bg-emerald-500/10 border-emerald-500/25",
      iconColor: "text-emerald-300",
      icon: <CheckCircle2 size={12} strokeWidth={2} />,
    },
    {
      label: "Active",
      value: String(activeTripCount),
      tone:
        activeTripCount > 0
          ? "text-amber-200 bg-amber-500/10 border-amber-500/25"
          : "text-zinc-200 bg-white/[0.03] border-white/[0.06]",
      iconColor:
        activeTripCount > 0 ? "text-amber-300" : "text-zinc-400",
      icon: <Clock4 size={12} strokeWidth={2} />,
    },
    {
      label: "Avg score",
      value: avgScore === null ? "-" : String(avgScore),
      tone:
        avgScore !== null && avgScore < 60
          ? "text-rose-300 bg-rose-500/10 border-rose-500/25"
          : "text-emerald-300 bg-emerald-500/10 border-emerald-500/25",
      iconColor:
        avgScore !== null && avgScore < 60
          ? "text-rose-300"
          : "text-emerald-300",
      icon: <ShieldCheck size={12} strokeWidth={2} />,
    },
    {
      label: "Alerts",
      value: `${totalAlerts}/${criticalAlerts}`,
      tone:
        criticalAlerts > 0
          ? "text-rose-300 bg-rose-500/10 border-rose-500/25"
          : "text-zinc-200 bg-white/[0.03] border-white/[0.06]",
      iconColor: criticalAlerts > 0 ? "text-rose-300" : "text-zinc-400",
      icon: <AlertTriangle size={12} strokeWidth={2} />,
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay: 0.05 }}
      className="bezel-shell"
    >
      <div className="bezel-core relative px-5 py-5 md:px-6">
        {/* Faint technical grid as ambient texture */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.10]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage:
              "radial-gradient(ellipse at 0% 50%, black 0%, transparent 70%)",
          }}
        />

        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="min-w-0">
            <div className="eyebrow-chip mb-3">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  activeTripCount > 0
                    ? "bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)]"
                    : "bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                }`}
              />
              <span>My Trips</span>
            </div>
            <h1 className="text-[26px] font-semibold leading-[1.1] tracking-[-0.02em] text-zinc-50">
              Driver trips
            </h1>
            <p className="mt-2 text-[13px] text-zinc-400">
              {activeTripCount > 0
                ? `${activeTripCount} active trip in progress`
                : `${completedCount} completed trips recorded`}
            </p>
          </div>

          <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4 lg:w-auto lg:min-w-[460px]">
            {tiles.map((tile, index) => (
              <motion.div
                key={tile.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...SPRING, delay: 0.08 + index * 0.04 }}
                className={`flex flex-col justify-between gap-3 rounded-2xl border px-3 py-2.5 ${tile.tone}`}
              >
                <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.16em]">
                  <span className={tile.iconColor}>{tile.icon}</span>
                  <span className="text-zinc-300/80">{tile.label}</span>
                </div>
                <div className="font-mono-num text-[20px] font-semibold tabular-nums leading-none">
                  {tile.value}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.button
          type="button"
          onClick={onNewTrip}
          whileHover={canStartNew ? { y: -1 } : undefined}
          whileTap={canStartNew ? { scale: 0.97 } : undefined}
          transition={SPRING}
          disabled={!canStartNew}
          className="cta-primary mt-5 w-full sm:w-auto"
        >
          <Plus size={14} strokeWidth={2.5} />
          <span>New Trip</span>
          <span
            aria-hidden
            className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/30 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5"
          >
            <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
              <path
                d="M1 9L9 1M9 1H3M9 1V7"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </motion.button>
      </div>
    </motion.section>
  );
}