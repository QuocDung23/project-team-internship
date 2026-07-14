import { RefreshCw } from "lucide-react";
import { motion } from "motion/react";
import { formatTime } from "../../hook/useTicker";

interface DashboardHeaderProps {
  now: number;
  connected: boolean;
}

export default function DashboardHeader({
  now,
  connected,
}: DashboardHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
      className="rounded-xl border border-white/5 bg-white/3 px-5 py-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[15px] font-semibold tracking-tight text-zinc-100">
            Fleet Overview
          </h1>
          <p className="mt-0.5 text-[12px] text-zinc-400">
            Active shifts across 3 regions, continuously synced from central backend
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-lg border border-white/5 bg-white/3 px-3 py-1.5 text-[11px] text-zinc-400">
            <RefreshCw size={11} className="text-zinc-500" />
            <span className="font-mono-num tabular-nums text-zinc-300">
              {formatTime(now)}
            </span>
          </span>

          <span
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium ring-1 ${
              connected
                ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20"
                : "bg-amber-500/10 text-amber-300 ring-amber-500/20"
            }`}
          >
            <motion.span
              animate={{ scale: connected ? [1, 1.3, 1] : 1 }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className={`h-1.5 w-1.5 rounded-full ${
                connected ? "bg-emerald-400" : "bg-amber-400"
              }`}
            />
            {connected ? "Live" : "Connecting"}
          </span>
        </div>
      </div>
    </motion.header>
  );
}
