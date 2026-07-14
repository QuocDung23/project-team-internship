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
      className="relative overflow-hidden rounded-2xl border border-hairline bg-elevated p-px"
    >
      <div className="relative rounded-[1.375rem] bg-surface p-5">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-accent-warn/5 via-transparent to-transparent" />
        
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-accent-warn/20 ring-1 ring-accent-warn/20">
              <AlertTriangle size={18} className="text-accent-warn" />
              {criticalCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -right-1 -top-1 flex h-3 w-3"
                >
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-critical opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-accent-critical" />
                </motion.span>
              )}
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-text-primary">
                Alert Log
              </h1>
              <p className="mt-0.5 text-xs text-text-tertiary">
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
                  className="inline-flex items-center gap-1.5 rounded-full bg-accent-critical/15 px-3 py-1.5 text-xs font-medium text-accent-critical ring-1 ring-accent-critical/20 backdrop-blur-sm"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-critical shadow-[0_0_6px_rgba(220,38,38,0.8)]" />
                  {criticalCount} critical
                </motion.span>
              )}
              {warnCount > 0 && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.05 }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-accent-warn/15 px-3 py-1.5 text-xs font-medium text-accent-warn ring-1 ring-accent-warn/20 backdrop-blur-sm"
                >
                  {warnCount} warning
                </motion.span>
              )}
              {!hasIncidents && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-active/15 px-3 py-1.5 text-xs font-medium text-accent-active ring-1 ring-accent-active/20 backdrop-blur-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-active" />
                  No new alerts
                </span>
              )}
            </div>
            
            <motion.button
              type="button"
              onClick={onRefresh}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="group relative overflow-hidden rounded-full border border-hairline bg-subtle-bg px-4 py-2 text-xs font-medium text-text-secondary backdrop-blur-sm transition-all hover:border-hairline hover:bg-subtle-bg-hover hover:text-text-primary"
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
