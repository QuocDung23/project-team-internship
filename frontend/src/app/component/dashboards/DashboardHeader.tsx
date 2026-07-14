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
      className="rounded-xl border border-hairline bg-subtle-bg px-5 py-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[15px] font-semibold tracking-tight text-text-primary">
            Fleet Overview
          </h1>
          <p className="mt-0.5 text-[12px] text-text-secondary">
            Active shifts across 3 regions, continuously synced from central backend
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-lg border border-hairline bg-subtle-bg px-3 py-1.5 text-[11px] text-text-secondary">
            <RefreshCw size={11} className="text-text-tertiary" />
            <span className="font-mono-num tabular-nums text-text-primary">
              {formatTime(now)}
            </span>
          </span>

          <span
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium ring-1 ${
              connected
                ? "bg-accent-active/10 text-accent-active ring-accent-active/20"
                : "bg-accent-warn/10 text-accent-warn ring-accent-warn/20"
            }`}
          >
            <motion.span
              animate={{ scale: connected ? [1, 1.3, 1] : 1 }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className={`h-1.5 w-1.5 rounded-full ${
                connected ? "bg-accent-active" : "bg-accent-warn"
              }`}
            />
            {connected ? "Live" : "Connecting"}
          </span>
        </div>
      </div>
    </motion.header>
  );
}
