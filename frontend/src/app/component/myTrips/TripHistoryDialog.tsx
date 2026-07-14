import { X } from "@phosphor-icons/react";
import { motion } from "motion/react";
import type { BackendTrip } from "../../services/backendApi";
import type { MonitoringAlert } from "../../types/monitoring";
import {
  tripTitle,
  routeLabel,
  dateLabel,
  alertCountLabel,
  criticalAlertCountLabel,
} from "../../utils/trips/tripFormatters";
import { SafetyScoreValue } from "../../utils/safetyScore";
import { SPRING } from "../../utils/trips/tripMotion";
import { TripMetric } from "./TripMetric";
import { AlertInfoRow } from "./AlertInfoRow";

interface TripHistoryDialogProps {
  alerts: MonitoringAlert[];
  alertsError: string | null;
  driverName: string;
  isLoadingAlerts: boolean;
  onClose: () => void;
  trip: BackendTrip;
}

export default function TripHistoryDialog({
  alerts,
  alertsError,
  driverName,
  isLoadingAlerts,
  onClose,
  trip,
}: TripHistoryDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <motion.section
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ ...SPRING, delay: 0.05 }}
        className="bezel-shell flex max-h-[92vh] w-full max-w-5xl flex-col"
      >
        <div className="bezel-core relative flex flex-col overflow-hidden">
          <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] px-6 py-4">
            <div className="min-w-0">
              <div className="eyebrow-chip mb-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>Trip record</span>
              </div>
              <h2 className="truncate text-lg font-semibold tracking-[-0.015em] text-zinc-100">
                {tripTitle(trip)}
              </h2>
              <p className="mt-1 truncate text-xs text-zinc-500">
                {routeLabel(trip)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-zinc-300 transition-colors duration-200 hover:bg-white/[0.06] hover:text-zinc-50"
            >
              <X size={14} weight="bold" />
            </button>
          </div>

          <div className="min-h-0 overflow-y-auto px-6 py-5">
            <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
              <TripMetric label="Trip code" value={tripTitle(trip)} />
              <TripMetric label="Status" value={trip.status.replace("_", " ")} />
              <TripMetric label="Driver" value={driverName} />
              <TripMetric label="Route" value={routeLabel(trip)} />
              <TripMetric
                label="Start time"
                value={dateLabel(trip.actual_start_at ?? trip.start_time)}
              />
              <TripMetric
                label="End time"
                value={dateLabel(trip.actual_end_at ?? trip.end_time)}
              />
              <TripMetric
                label="Safety score"
                value={<SafetyScoreValue trip={trip} />}
              />
              <TripMetric label="Alerts" value={alertCountLabel(trip)} />
              <TripMetric
                label="Critical"
                value={criticalAlertCountLabel(trip)}
              />
              <TripMetric
                label="Origin"
                value={trip.origin || "Route not provided"}
              />
              <TripMetric
                label="Destination"
                value={trip.destination || "Route not provided"}
              />
            </div>

            <div className="mt-6">
              <div className="flex items-end justify-between gap-3 pb-3">
                <div>
                  <h3 className="text-sm font-semibold tracking-[-0.01em] text-zinc-100">
                    Trip alerts
                  </h3>
                  <p className="mt-0.5 text-[11px] text-zinc-500">
                    Persisted safety events captured during this trip
                  </p>
                </div>
                <span className="rounded-full border border-white/[0.06] bg-white/[0.02] px-2.5 py-0.5 font-mono-num text-[11px] font-medium text-zinc-400 tabular-nums">
                  {alerts.length}
                </span>
              </div>
              {alertsError ? (
                <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] px-3.5 py-2.5 text-xs text-amber-200">
                  {alertsError}
                </div>
              ) : null}
              {!alertsError && isLoadingAlerts ? (
                <div className="mt-3 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-6 text-center text-xs text-zinc-500">
                  Loading alerts...
                </div>
              ) : null}
              {!alertsError && !isLoadingAlerts && alerts.length === 0 ? (
                <div className="mt-3 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-6 text-center text-xs text-zinc-500">
                  No alerts for this trip.
                </div>
              ) : null}
              <div className="mt-3 grid gap-2">
                {alerts.map((alert) => (
                  <AlertInfoRow key={alert.id} alert={alert} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  );
}