"use client";
import { motion } from "motion/react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface AlertHeaderProps {
  criticalCount: number;
  warnCount: number;
  onRefresh: () => void;
}

export default function AlertHeader({
  criticalCount,
  warnCount,
  onRefresh,
}: AlertHeaderProps) {
  const hasIncidents = criticalCount > 0 || warnCount > 0;
  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
      className="relative overflow-hidden rounded-2xl border border-white/6 bg-linear-to-br from-zinc-900/90 to-zinc-950/95 p-px"
    >
      <div className="relative rounded-[1.375rem] bg-linear-to-br from-zinc-900/95 to-zinc-950 p-5">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-amber-500/5 via-transparent to-transparent" />
        
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-amber-500/20 to-amber-500/5 ring-1 ring-amber-500/20">
              <AlertTriangle size={18} className="text-amber-400" />
              {criticalCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -right-1 -top-1 flex h-3 w-3"
                >
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
                </motion.span>
              )}
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-zinc-100">
                Alert Log
              </h1>
              <p className="mt-0.5 text-xs text-zinc-500">
                Real-time alert stream · continuously updated
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {criticalCount > 0 && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-linear-to-r from-red-500/15 to-red-500/5 px-3 py-1.5 text-xs font-medium text-red-300 ring-1 ring-red-500/20 backdrop-blur-sm"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400 shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
                  {criticalCount} critical
                </motion.span>
              )}
              {warnCount > 0 && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.05 }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-linear-to-r from-amber-500/15 to-amber-500/5 px-3 py-1.5 text-xs font-medium text-amber-300 ring-1 ring-amber-500/20 backdrop-blur-sm"
                >
                  {warnCount} warning
                </motion.span>
              )}
              {!hasIncidents && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-linear-to-r from-emerald-500/15 to-emerald-500/5 px-3 py-1.5 text-xs font-medium text-emerald-300 ring-1 ring-emerald-500/20 backdrop-blur-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  No new alerts
                </span>
              )}
            </div>
            
            <motion.button
              type="button"
              onClick={onRefresh}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="group relative overflow-hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-zinc-300 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10 hover:text-zinc-100"
            >
              <span className="relative flex items-center gap-2">
                <RefreshCw size={13} className="transition-transform group-hover:rotate-180" />
                Refresh
              </span>
            </motion.button>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
