import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AdminEmptyState, AdminErrorBanner, AdminHeader, AdminPage, AdminStatStrip } from "../component/admin/AdminShell";
import { StatusBadge } from "../component/monitoring/StatusBadge";
import { useBackendAlerts } from "../hook/useBackendAlerts";
import { useBackendTrips } from "../hook/useBackendData";
import { buildSafetySummaryFromTrips, fetchSafetyScore, type BackendTrip, type SafetyScore } from "../services/backendApi";
import type { MonitoringAlert } from "../types/monitoring";
import { SafetyScoreValue } from "../utils/safetyScore";

function FleetPage() {
  const backendTrips = useBackendTrips(false);
  const trips = useMemo(() => backendTrips.trips ?? [], [backendTrips.trips]);
  const safety = useMemo(() => buildSafetySummaryFromTrips(trips), [trips]);
  const [selectedTripId, setSelectedTripId] = useState<string>("");
  const selectedTrip = useMemo(
    () => trips.find((trip) => trip.trip_id === selectedTripId) ?? trips[0] ?? null,
    [selectedTripId, trips],
  );
  const alerts = useBackendAlerts(selectedTrip?.trip_id, { tripId: selectedTrip?.trip_id });
  const [loadedScore, setLoadedScore] = useState<{
    tripId: string;
    score: SafetyScore;
  } | null>(null);
  const score = loadedScore?.tripId === selectedTrip?.trip_id
    ? loadedScore?.score ?? null
    : selectedTrip && typeof selectedTrip.safety_score === "object"
      ? selectedTrip.safety_score
      : null;

  useEffect(() => {
    if (!selectedTrip || selectedTrip.status !== "completed") return;
    let active = true;
    void fetchSafetyScore(selectedTrip.trip_id)
      .then((nextScore) => {
        if (active) setLoadedScore({ tripId: selectedTrip.trip_id, score: nextScore });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [selectedTrip]);

  return (
    <AdminPage scroll>
      <AdminHeader
        eyebrow="Safety"
        title="Trip Safety"
        description="Active and completed driver safety trips with score and alert summaries"
        actions={<span className="rounded-lg bg-subtle-bg px-2.5 py-1 font-mono-num text-[11px] text-text-secondary">{trips.length} trips</span>}
      />
      <AdminErrorBanner label="Trips unavailable" message={backendTrips.error} />
      <AdminErrorBanner label="Alerts unavailable" message={alerts.error} />

      <AdminStatStrip
        items={[
          {
            label: "Active",
            value: trips.filter((trip) => trip.status === "in_progress").length,
            tone: "active",
            detail: "Trips in progress",
          },
          {
            label: "Completed",
            value: trips.filter((trip) => trip.status === "completed").length,
            detail: "Completed trips",
          },
          {
            label: "Alerts",
            value: safety.totalAlerts,
            tone: safety.totalAlerts > 0 ? "warn" : "active",
            detail: `${safety.criticalAlerts} critical`,
          },
          {
            label: "Avg Score",
            value: safety.averageScore ?? "-",
            tone: safety.averageScore !== null && safety.averageScore < 60 ? "critical" : "active",
            detail: `${safety.scoredTrips} scored`,
          },
        ]}
      />

      <section className="grid gap-4 xl:h-[calc(100vh-17rem)] xl:min-h-[520px] xl:grid-cols-[1.25fr_0.9fr]">
        <TripTable trips={trips} selectedTripId={selectedTrip?.trip_id ?? ""} onSelect={setSelectedTripId} />
        {selectedTrip ? (
          <TripDetails trip={selectedTrip} score={score} alerts={alerts.monitorAlerts ?? []} />
        ) : (
          <AdminEmptyState title="No trips yet" detail="Trips will appear after drivers start monitoring sessions." />
        )}
      </section>
    </AdminPage>
  );
}

function TripTable({
  trips,
  selectedTripId,
  onSelect,
}: {
  trips: BackendTrip[];
  selectedTripId: string;
  onSelect: (tripId: string) => void;
}) {
  return (
    <section className="panel flex min-h-[420px] min-w-0 flex-col overflow-hidden xl:min-h-0">
      <div className="grid shrink-0 grid-cols-[1.15fr_0.75fr_1.2fr_1fr_0.65fr_0.65fr] gap-3 border-b border-hairline px-4 py-2.5 text-[10px] uppercase tracking-wider text-text-tertiary">
        <span>Trip</span>
        <span>Status</span>
        <span>Driver</span>
        <span>Started</span>
        <span>Score</span>
        <span>Alerts</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {trips.length > 0 ? (
          trips.map((trip) => (
            <button
              key={trip.trip_id}
              type="button"
              onClick={() => onSelect(trip.trip_id)}
              className={[
                "grid w-full grid-cols-[1.15fr_0.75fr_1.2fr_1fr_0.65fr_0.65fr] gap-3 border-b border-hairline px-4 py-3 text-left text-sm transition-all duration-200",
                trip.trip_id === selectedTripId 
                  ? "bg-accent-active/10 text-text-primary ring-1 ring-inset ring-accent-active/20" 
                  : "text-text-secondary hover:bg-subtle-bg-hover hover:text-text-primary",
              ].join(" ")}
            >
              <span className="truncate font-mono-num text-xs">{tripTitle(trip)}</span>
              <span className="truncate text-xs">{trip.status}</span>
              <span className="min-w-0">
                <span className="block truncate text-xs text-text-primary">{driverName(trip)}</span>
                <span className="block truncate font-mono-num text-[10px] text-text-tertiary">{driverContext(trip)}</span>
              </span>
              <span className="truncate font-mono-num text-xs text-text-tertiary">{formatDate(trip.actual_start_at ?? trip.start_time)}</span>
              <span className="truncate text-xs text-text-secondary"><SafetyScoreValue trip={trip} /></span>
              <span className="font-mono-num text-xs text-text-secondary">{String(trip.total_alerts_count ?? "-")}</span>
            </button>
          ))
        ) : (
          <div className="px-4 py-10">
            <AdminEmptyState title="No trips yet" detail="Started trips will appear in this table." />
          </div>
        )}
      </div>
    </section>
  );
}

function TripDetails({
  trip,
  score,
  alerts,
}: {
  trip: BackendTrip;
  score: SafetyScore | null;
  alerts: MonitoringAlert[];
}) {
  return (
    <section className="panel flex min-h-[420px] min-w-0 flex-col overflow-hidden xl:min-h-0">
      <div className="shrink-0 border-b border-hairline px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-text-primary">{tripTitle(trip)}</h2>
            <p className="mt-1 truncate text-[11px] text-text-tertiary">{routeLabel(trip)}</p>
          </div>
          <StatusBadge tone={trip.status === "in_progress" ? "active" : trip.status === "completed" ? "neutral" : "warn"} label={trip.status} />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <div className="grid gap-2">
          <TripMetric label="Driver" value={driverName(trip)} detail={driverContext(trip)} />
          <div className="grid grid-cols-2 gap-2">
            <TripMetric label="Trip Code" value={tripTitle(trip)} />
            <TripMetric label="Route" value={routeLabel(trip)} />
            <TripMetric label="Score" value={<SafetyScoreValue trip={trip} score={score} />} />
            <TripMetric label="Alerts" value={`${String(trip.total_alerts_count ?? score?.alert_count ?? "-")} total`} detail={`${String(trip.critical_alerts_count ?? score?.critical_events ?? "-")} critical`} />
            <TripMetric label="Started" value={formatDate(trip.actual_start_at ?? trip.start_time)} />
            <TripMetric label="Ended" value={formatDate(trip.actual_end_at ?? trip.end_time)} />
          </div>
        </div>

        <div className="mt-4 grid gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-semibold text-text-primary">All Alerts</h3>
            <span className="rounded-md bg-subtle-bg px-2 py-0.5 font-mono-num text-[10px] text-text-tertiary">{alerts.length}</span>
          </div>
          {alerts.map((alert) => (
            <div key={alert.id} className="group overflow-hidden rounded-xl border border-hairline bg-subtle-bg px-4 py-3 transition-colors duration-200 hover:border-hairline">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-medium text-text-primary">{alert.title}</p>
                <StatusBadge tone={alert.severity === "critical" ? "critical" : "warn"} label={alert.severity} withDot={false} />
              </div>
              <p className="mt-1.5 truncate font-mono-num text-[10px] text-text-tertiary">
                {new Date(alert.ts).toLocaleString()} · {alert.detail}
              </p>
            </div>
          ))}
          {alerts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-hairline bg-subtle-bg py-8 text-center">
              <p className="text-[12px] text-text-tertiary">No alerts for this trip</p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function TripMetric({ label, value, detail }: { label: string; value: ReactNode; detail?: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-hairline bg-subtle-bg px-3 py-2.5 transition-colors duration-200 hover:border-hairline">
      <p className="text-[10px] uppercase tracking-wider text-text-tertiary">{label}</p>
      <p className="mt-1 truncate text-sm text-text-primary">{value}</p>
      {detail ? <p className="mt-0.5 truncate font-mono-num text-[10px] text-text-tertiary">{detail}</p> : null}
    </div>
  );
}

function driverName(trip: BackendTrip): string {
  return trip.driver_name ?? trip.driver_email ?? "Unassigned";
}

function driverContext(trip: BackendTrip): string {
  return trip.driver_email ?? "No driver context";
}

function routeLabel(trip: BackendTrip): string {
  if (trip.origin && trip.destination) return `${trip.origin} → ${trip.destination}`;
  return trip.origin || trip.destination || "Route not provided";
}

function tripTitle(trip: BackendTrip): string {
  return trip.code || "Trip without code";
}

function formatDate(value?: string | null): string {
  return value ? new Date(value).toLocaleString() : "-";
}

export default FleetPage;
