import { motion, AnimatePresence, Easing } from "motion/react";
import { SPRING, MOTION_EASE } from "../../utils/trips/tripMotion";

export interface LiveAlert {
  id: string;
  title: string;
  severity: "warn" | "critical";
  ts: number;
  detail: string;
}

interface LiveAlertsListProps {
  alerts: LiveAlert[];
  eventCount: number;
}

export default function LiveAlertsList({ alerts, eventCount }: LiveAlertsListProps) {
  return (
    <div className="flex flex-col content-start gap-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-100">Cảnh báo thời gian thực</h3>
        <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 font-mono-num text-[10px] font-semibold text-emerald-400">
          {eventCount} sự kiện
        </span>
      </div>

      {/* Alerts */}
      {alerts.length > 0 ? (
        <div className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {alerts.map((alert, i) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: 16, scale: 0.97 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -16, scale: 0.97 }}
                transition={{
                  ...SPRING,
                  delay: i * 0.04,
                  ease: MOTION_EASE.smooth as Easing,
                }}
                className={`rounded-xl border px-3.5 py-2.5 ${
                  alert.severity === "critical"
                    ? "border-rose-500/30 bg-rose-500/05"
                    : "border-amber-500/30 bg-amber-500/05"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-zinc-100">{alert.title}</p>
                  <span
                    className={`shrink-0 text-[10px] font-semibold uppercase tracking-wider ${
                      alert.severity === "critical" ? "text-rose-300" : "text-amber-300"
                    }`}
                  >
                    {alert.severity}
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  {new Date(alert.ts).toLocaleString()} · {alert.detail}
                </p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-8 text-center">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </div>
          <p className="text-xs text-zinc-500">Chưa có cảnh báo nào</p>
          <p className="mt-0.5 text-[10px] text-zinc-600">Hệ thống đang theo dõi...</p>
        </div>
      )}
    </div>
  );
}
