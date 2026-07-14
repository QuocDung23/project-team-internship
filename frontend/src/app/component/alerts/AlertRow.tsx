"use client";
import { motion } from "motion/react";
import { AlertTriangle, CheckCircle, MapPin, Truck } from "lucide-react";
import type { FleetAlertEvent } from "../../types/alerts";
import { formatTime } from "../../hook/useTicker";
import { StatusBadge } from "../monitoring/StatusBadge";
import {
  ALERT_TYPE_ICONS,
  ALERT_TYPE_LABELS,
  SEVERITY_LABELS,
} from "../../constants/alerts";

interface AlertRowProps {
  event: FleetAlertEvent;
  isAcknowledging?: boolean;
  onAcknowledge?: (event: FleetAlertEvent) => void;
}

export default function AlertRow({
  event,
  isAcknowledging = false,
  onAcknowledge,
}: AlertRowProps) {
  const isCritical = event.severity === "critical";
  const config = {
    critical: {
      gradient: "from-red-500/12 to-red-500/4",
      border: "border-red-500/25",
      ring: "ring-red-500/10",
      iconBg: "from-red-500/30 to-red-500/15",
      iconColor: "text-red-300",
    },
    warn: {
      gradient: "from-amber-500/10 to-amber-500/4",
      border: "border-amber-500/20",
      ring: "ring-amber-500/10",
      iconBg: "from-amber-500/20 to-amber-500/10",
      iconColor: "text-amber-300",
    },
  };
  const style = config[event.severity];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
      className={`group relative overflow-hidden rounded-2xl border bg-linear-to-br ${style.gradient} p-px ${style.border} ${style.ring}`}
    >
      <div className="relative rounded-[1.25rem] bg-linear-to-br from-zinc-900/95 to-zinc-950 p-4">
        <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-linear-to-br from-white/3 to-transparent" />

        <div className="relative flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br ${style.iconBg} ${style.border}`}
              >
                <span className={style.iconColor}>
                  {ALERT_TYPE_ICONS[event.type] ?? <AlertTriangle size={15} />}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-100">
                  {event.driverName}
                </p>
                <p className="font-mono-num text-xs text-zinc-500">
                  {event.licensePlate}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1.5">
              <StatusBadge
                tone={isCritical ? "critical" : "warn"}
                label={SEVERITY_LABELS[event.severity]}
              />
              <span className="font-mono-num text-xs text-zinc-500">
                {formatTime(event.timestamp)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-400">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 ">
              <Truck size={11} />
              {event.driverName}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={11} className="text-zinc-500" />
              {event.location}
            </span>
            {event.ear > 0 && (
              <span className="font-mono-num rounded-full bg-white/5 px-2.5 py-1  ">
                EAR:{" "}
                <span
                  className={
                    event.ear < 0.17 ? "text-red-300" : "text-zinc-300"
                  }
                >
                  {event.ear.toFixed(3)}
                </span>
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1  ">
              {ALERT_TYPE_LABELS[event.type]}
            </span>
          </div>

          {event.acknowledged ? (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <CheckCircle size={13} fill="currentColor" />
              Acknowledged
            </div>
          ) : onAcknowledge ? (
            <motion.button
              type="button"
              onClick={() => onAcknowledge(event)}
              disabled={isAcknowledging}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="group/btn relative overflow-hidden rounded-xl border border-emerald-500/25 bg-linear-to-r from-emerald-500/10 to-emerald-500/5 min-w-[140px] px-4 py-2 text-xs font-medium text-emerald-300 transition-all hover:border-emerald-500/40 hover:from-emerald-500/20 hover:to-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ width: "fit-content", maxWidth: 200 }}
            >
              <span className="relative flex items-center justify-center gap-2 w-full">
                <CheckCircle
                  size={13}
                  className="transition-transform group-hover/btn:scale-110"
                />
                {isAcknowledging ? "Acknowledging..." : "Acknowledge"}
              </span>
            </motion.button>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}
