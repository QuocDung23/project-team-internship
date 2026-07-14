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
      gradient: "from-accent-critical/12 to-accent-critical/4",
      border: "border-accent-critical/25",
      ring: "ring-accent-critical/10",
      iconBg: "from-accent-critical/30 to-accent-critical/15",
      iconColor: "text-accent-critical",
    },
    warn: {
      gradient: "from-accent-warn/10 to-accent-warn/4",
      border: "border-accent-warn/20",
      ring: "ring-accent-warn/10",
      iconBg: "from-accent-warn/20 to-accent-warn/10",
      iconColor: "text-accent-warn",
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
      <div className="relative rounded-[1.25rem] bg-surface p-4">
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
                <p className="text-sm font-medium text-text-primary">
                  {event.driverName}
                </p>
                <p className="font-mono-num text-xs text-text-tertiary">
                  {event.licensePlate}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1.5">
              <StatusBadge
                tone={isCritical ? "critical" : "warn"}
                label={SEVERITY_LABELS[event.severity]}
              />
              <span className="font-mono-num text-xs text-text-tertiary">
                {formatTime(event.timestamp)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-secondary">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-subtle-bg px-2.5 py-1 ">
              <Truck size={11} />
              {event.driverName}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={11} className="text-text-tertiary" />
              {event.location}
            </span>
            {event.ear > 0 && (
              <span className="font-mono-num rounded-full bg-subtle-bg px-2.5 py-1  ">
                EAR:{" "}
                <span
                  className={
                    event.ear < 0.17 ? "text-accent-critical" : "text-text-secondary"
                  }
                >
                  {event.ear.toFixed(3)}
                </span>
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-full bg-subtle-bg px-2.5 py-1  ">
              {ALERT_TYPE_LABELS[event.type]}
            </span>
          </div>

          {event.acknowledged ? (
            <div className="flex items-center gap-1.5 text-xs text-accent-active">
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
              className="group/btn relative overflow-hidden rounded-xl border border-accent-active/25 bg-linear-to-r from-accent-active/10 to-accent-active/5 min-w-[140px] px-4 py-2 text-xs font-medium text-accent-active transition-all hover:border-accent-active/40 hover:from-accent-active/20 hover:to-accent-active/10 disabled:cursor-not-allowed disabled:opacity-50"
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
