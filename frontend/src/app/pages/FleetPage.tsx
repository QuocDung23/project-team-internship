import { useEffect, useMemo, useState } from "react";
import { useBackendAlerts } from "../hook/useBackendAlerts";
import { useBackendTrips } from "../hook/useBackendData";
import { fetchSafetyScore, type BackendTrip, type SafetyScore } from "../services/backendApi";

function FleetPage() {
  const backendTrips = useBackendTrips(false);
  const trips = useMemo(() => backendTrips.trips ?? [], [backendTrips.trips]);
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
    if (!selectedTrip || selectedTrip.status !== "completed") {
      return;
    }
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
    <div className="flex flex-1 flex-col gap-4 overflow-hidden p-4 md:p-6">
      <header className="panel flex flex-wrap items-center justify-between gap-4 px-5 py-4">
        <div>
          <h1 className="text-base font-semibold tracking-tight text-zinc-100">Safety Trips</h1>
          <p className="mt-0.5 text-[12px] text-zinc-400">
            Active and completed driver safety trips
          </p>
        </div>
        <span className="font-mono-num text-xs text-zinc-500">{trips.length} trips</span>
      </header>

      {backendTrips.error && (
        <section className="panel border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-200">
          Backend unavailable: {backendTrips.error}
        </section>
      )}

      <section className="panel overflow-hidden">
        <div className="grid grid-cols-[1.4fr_0.8fr_1fr_1fr_0.7fr_0.7fr] border-b border-hairline px-4 py-2 text-[10px] uppercase tracking-wider text-zinc-500">
          <span>Trip</span>
          <span>Status</span>
          <span>Started</span>
          <span>Completed</span>
          <span>Score</span>
          <span>Alerts</span>
        </div>
        <div className="max-h-[360px] overflow-y-auto">
          {trips.length > 0 ? (
            trips.map((trip) => (
              <TripRow
                key={trip.trip_id}
                trip={trip}
                selected={trip.trip_id === selectedTrip?.trip_id}
                onSelect={() => setSelectedTripId(trip.trip_id)}
              />
            ))
          ) : (
            <div className="px-4 py-10 text-center text-sm text-zinc-500">No trips yet.</div>
          )}
        </div>
      </section>

      {selectedTrip ? (
        <section className="panel grid gap-4 p-5 lg:grid-cols-[1fr_1.2fr]">
          <div className="grid gap-3 text-sm">
            <h2 className="text-sm font-semibold text-zinc-100">Trip Details</h2>
            <TripMetric label="Trip ID" value={selectedTrip.trip_id} />
            <TripMetric label="Code" value={selectedTrip.code ?? "-"} />
            <TripMetric label="Status" value={selectedTrip.status} />
            <TripMetric label="Driver ID" value={selectedTrip.driver_id ?? selectedTrip.assignment?.driver_id ?? "-"} />
            <TripMetric label="Safety score" value={score ? `${score.score} (${score.grade})` : "-"} />
            <TripMetric label="Alerts" value={String(selectedTrip.total_alerts_count ?? score?.alert_count ?? "-")} />
            <TripMetric label="Critical alerts" value={String(selectedTrip.critical_alerts_count ?? score?.critical_events ?? "-")} />
          </div>
          <div className="grid content-start gap-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-100">Alerts</h2>
              <span className="font-mono-num text-xs text-zinc-500">
                {alerts.monitorAlerts?.length ?? 0}
              </span>
            </div>
            {(alerts.monitorAlerts ?? []).slice(0, 8).map((alert) => (
              <div key={alert.id} className="rounded-md border border-hairline bg-zinc-950/40 px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-zinc-100">{alert.title}</p>
                  <span className={alert.severity === "critical" ? "text-xs text-rose-300" : "text-xs text-amber-300"}>
                    {alert.severity}
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  {new Date(alert.ts).toLocaleString()} · {alert.detail}
                </p>
              </div>
            ))}
            {alerts.monitorAlerts?.length === 0 ? (
              <div className="rounded-md border border-hairline bg-zinc-950/30 px-3 py-4 text-center text-xs text-zinc-500">
                No alerts for this trip.
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function TripRow({
  trip,
  selected,
  onSelect,
}: {
  trip: BackendTrip;
  selected: boolean;
  onSelect: () => void;
}) {
  const endedAt = trip.end_time ?? trip.actual_end_at ?? "";
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "grid w-full grid-cols-[1.4fr_0.8fr_1fr_1fr_0.7fr_0.7fr] gap-3 border-b border-hairline px-4 py-3 text-left text-sm transition",
        selected ? "bg-emerald-500/10 text-zinc-100" : "text-zinc-300 hover:bg-surface-2/50",
      ].join(" ")}
    >
      <span className="truncate font-mono-num text-xs">{trip.code || trip.trip_id}</span>
      <span className="truncate text-xs">{trip.status}</span>
      <span className="truncate text-xs text-zinc-500">
        {trip.actual_start_at ? new Date(trip.actual_start_at).toLocaleString() : "-"}
      </span>
      <span className="truncate text-xs text-zinc-500">
        {endedAt ? new Date(endedAt).toLocaleString() : "-"}
      </span>
      <span className="truncate text-xs text-zinc-300">{tripScoreLabel(trip)}</span>
      <span className="font-mono-num text-xs text-zinc-300">{String(trip.total_alerts_count ?? "-")}</span>
    </button>
  );
}

function tripScoreLabel(trip: BackendTrip): string {
  if (trip.safety_score && typeof trip.safety_score === "object") {
    return `${trip.safety_score.score} (${trip.safety_score.grade})`;
  }
  if (trip.safety_score !== null && trip.safety_score !== undefined) {
    return trip.safety_grade ? `${trip.safety_score} (${trip.safety_grade})` : String(trip.safety_score);
  }
  return "-";
}

function TripMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-hairline bg-zinc-950/40 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-1 truncate text-zinc-100">{value}</p>
    </div>
  );
}

export default FleetPage;
