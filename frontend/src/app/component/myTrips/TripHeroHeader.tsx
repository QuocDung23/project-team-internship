import { AlertTriangle, CheckCircle2, Clock4, Plus, ShieldCheck } from "lucide-react";
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
      tone: "text-emerald-300",
      icon: <CheckCircle2 size={13} strokeWidth={2} />,
    },
    {
      label: "Active",
      value: String(activeTripCount),
      tone: "text-zinc-200",
      icon: <Clock4 size={13} strokeWidth={2} />,
    },
    {
      label: "Avg score",
      value: avgScore === null ? "-" : String(avgScore),
      tone: avgScore !== null && avgScore < 60 ? "text-rose-300" : "text-emerald-300",
      icon: <ShieldCheck size={13} strokeWidth={2} />,
    },
    {
      label: "Alerts",
      value: `${totalAlerts}/${criticalAlerts}`,
      tone: criticalAlerts > 0 ? "text-rose-300" : "text-zinc-200",
      icon: <AlertTriangle size={13} strokeWidth={2} />,
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay: 0.05 }}
      className="relative overflow-hidden rounded-[24px] border border-white/[0.06] bg-white/[0.02] p-[1.5px]"
    >
      <div className="relative overflow-hidden rounded-[calc(1.5rem-1.5px)] border border-white/[0.05] bg-zinc-950/70 px-5 py-5 md:px-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="font-mono-num text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-300">
                My Trips
              </span>
            </div>
            <h1 className="text-2xl font-semibold leading-tight text-zinc-50">
              Driver trips
            </h1>
            <p className="mt-2 text-[13px] text-zinc-400">
              {activeTripCount > 0
                ? `${activeTripCount} active trip in progress`
                : `${completedCount} completed trips recorded`}
            </p>
          </div>

          <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4 lg:w-auto lg:min-w-[420px]">
            {tiles.map((tile, index) => (
              <motion.div
                key={tile.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...SPRING, delay: 0.08 + index * 0.04 }}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3 py-3"
              >
                <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                  <span className={tile.tone}>{tile.icon}</span>
                  {tile.label}
                </div>
                <div className={`mt-2 font-mono-num text-xl font-semibold tabular-nums ${tile.tone}`}>
                  {tile.value}
                </div>
              </motion.div>
            ))}
          </div>

          <motion.button
            type="button"
            onClick={onNewTrip}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            transition={SPRING}
            disabled={!canStartNew}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/15 px-4 py-2.5 text-[12px] font-semibold text-emerald-100 transition hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus size={14} strokeWidth={2.5} />
            New Trip
          </motion.button>
        </div>
      </div>
    </motion.section>
  );
}
