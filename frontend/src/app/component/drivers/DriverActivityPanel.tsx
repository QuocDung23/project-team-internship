import { ShieldCheck } from "lucide-react";
import {
  tripAlertLabel,
  tripCriticalAlerts,
  tripScoreLabel,
  shortId,
} from "../../utils/drivers/driverFormHelpers";
import type {
  BackendTrip,
  FleetAlertEvent,
} from "../../utils/drivers/driverFormHelpers";

function DriverActivityStat({
  label,
  value,
  tone = "text-text-primary",
}: {
  label: string;
  value: string | number;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-hairline bg-subtle-bg p-px">
      <div className="rounded-[calc(0.75rem-1px)] bg-surface px-2.5 py-2">
        <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-text-tertiary">
          {label}
        </p>
        <p
          className={`mt-1 font-mono-num text-base font-semibold tabular-nums ${tone}`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

export default function DriverActivityPanel({
  trips,
  alerts,
  hasLinkedTrips,
  averageScore,
  totalAlerts,
  criticalAlerts,
}: {
  trips: BackendTrip[];
  alerts: FleetAlertEvent[];
  hasLinkedTrips: boolean;
  averageScore: number | null;
  totalAlerts: number;
  criticalAlerts: number;
}) {
  return (
    <section className="rounded-2xl border border-hairline bg-subtle-bg p-[1.5px]">
      <div className="grid gap-3 rounded-[calc(1rem-1.5px)] bg-surface-2 p-4">
        <div className="mb-1 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-text-tertiary">
          <ShieldCheck size={12} strokeWidth={2} className="text-accent-active" />
          Recent activity
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <DriverActivityStat label="Trips" value={trips.length} />
          <DriverActivityStat label="Avg score" value={averageScore ?? "-"} />
          <DriverActivityStat
            label="Alerts"
            value={totalAlerts}
            tone={totalAlerts > 0 ? "text-accent-warn" : "text-text-secondary"}
          />
          <DriverActivityStat
            label="Critical"
            value={criticalAlerts}
            tone={criticalAlerts > 0 ? "text-accent-critical" : "text-text-secondary"}
          />
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between border-t border-hairline pt-3">
            <h3 className="text-[12px] font-semibold tracking-tight text-text-primary">
              Trips &amp; Scores
            </h3>
            <span className="font-mono-num text-[10px] uppercase tracking-[0.16em] text-text-tertiary">
              {trips.length}
            </span>
          </div>
          {trips.slice(0, 5).map((trip) => (
            <div
              key={trip.trip_id}
              className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 rounded-xl border border-hairline bg-subtle-bg px-3 py-2.5 transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-subtle-bg-hover"
            >
              <div className="min-w-0">
                <p className="truncate font-mono-num text-[11px] text-text-primary">
                  {trip.code || shortId(trip.trip_id)}
                </p>
                <p className="truncate text-[10px] text-text-tertiary">
                  {trip.origin || "-"} &rarr; {trip.destination || "-"}
                </p>
              </div>
              <span className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary">
                {trip.status}
              </span>
              <span
                className={
                  tripCriticalAlerts(trip) > 0
                    ? "font-mono-num text-[11px] text-accent-critical"
                    : "font-mono-num text-[11px] text-accent-warn"
                }
              >
                {tripAlertLabel(trip)}
              </span>
              <span className="font-mono-num text-[11px] text-accent-active">
                {tripScoreLabel(trip)}
              </span>
            </div>
          ))}
          {trips.length === 0 ? (
            <p className="rounded-xl border border-dashed border-hairline bg-subtle-bg px-3 py-4 text-center text-[11px] text-text-tertiary">
              The driver has no trips yet.
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between border-t border-hairline pt-3">
            <h3 className="text-[12px] font-semibold tracking-tight text-text-primary">
              New alerts
            </h3>
            <span className="font-mono-num text-[10px] uppercase tracking-[0.16em] text-text-tertiary">
              {alerts.length}
            </span>
          </div>
          {alerts.slice(0, 5).map((alert) => (
            <div
              key={alert.id}
              className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-xl border border-hairline bg-subtle-bg px-3 py-2.5 transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-subtle-bg-hover"
            >
              <div className="min-w-0">
                <p className="truncate text-[11px] font-medium text-text-primary">
                  {alert.location}
                </p>
                <p className="truncate text-[10px] text-text-tertiary">
                  {new Date(alert.timestamp).toLocaleString()}
                </p>
              </div>
              <span
                className={
                  alert.severity === "critical"
                    ? "font-mono-num text-[10px] uppercase tracking-[0.14em] text-accent-critical"
                    : "font-mono-num text-[10px] uppercase tracking-[0.14em] text-accent-warn"
                }
              >
                {alert.acknowledged
                  ? "Acknowledged"
                  : alert.severity.charAt(0).toUpperCase() +
                    alert.severity.slice(1)}
              </span>
            </div>
          ))}
          {alerts.length === 0 ? (
            <p className="rounded-xl border border-dashed border-hairline bg-subtle-bg px-3 py-4 text-center text-[11px] text-text-tertiary">
              {hasLinkedTrips
                ? "There are no alerts for this driver's trips yet."
                : "There are no alerts because the driver has no linked trips."}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
