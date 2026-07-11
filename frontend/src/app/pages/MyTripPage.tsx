import { useEffect, useState } from "react";
import {
  completeTrip,
  fetchMyTrips,
  fetchSafetyScore,
  startMyTrip,
  type BackendTrip,
  type SafetyScore,
} from "../services/backendApi";
import { useBackendAlerts } from "../hook/useBackendAlerts";
import { useMyDriverProfile } from "../hook/useBackendData";

export function MyTripPage() {
  const [trips, setTrips] = useState<BackendTrip[]>([]);
  const [score, setScore] = useState<SafetyScore | null>(null);
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const activeTrip = trips.find((trip) => trip.status === "in_progress") ?? null;
  const latestTrip = activeTrip ?? trips[0] ?? null;
  const tripForAlerts = activeTrip ?? latestTrip;
  const endedAt = latestTrip?.end_time ?? latestTrip?.actual_end_at ?? "";
  const myDriver = useMyDriverProfile(true);
  const tripAlerts = useBackendAlerts(tripForAlerts?.trip_id, {
    tripId: tripForAlerts?.trip_id,
  });
  const alerts = (tripAlerts.monitorAlerts ?? []).slice(0, 8);

  async function refresh() {
    setError("");
    const nextTrips = await fetchMyTrips();
    setTrips(nextTrips);
    const tripForScore = nextTrips.find((trip) => trip.status === "completed") ?? null;
    if (tripForScore) {
      setScore(await fetchSafetyScore(tripForScore.trip_id));
    } else {
      setScore(null);
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refresh().catch((err) => setError(err instanceof Error ? err.message : "Failed to load trip"));
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  async function run(action: () => Promise<unknown>) {
    setIsBusy(true);
    setError("");
    try {
      await action();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Trip action failed");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <section className="panel flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-zinc-100">My Trip</h1>
            <p className="text-xs text-zinc-500">
              {activeTrip ? "Trip in progress" : latestTrip ? "Latest trip" : "No trips yet"}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-md bg-emerald-500 px-3 py-2 text-xs font-semibold text-zinc-950 disabled:opacity-50"
              disabled={isBusy || Boolean(activeTrip)}
              onClick={() => void run(() => startMyTrip())}
            >
              Start trip
            </button>
            <button
              type="button"
              className="rounded-md border border-hairline px-3 py-2 text-xs font-semibold text-zinc-200 disabled:opacity-50"
              disabled={isBusy || !activeTrip}
              onClick={() => activeTrip && void run(() => completeTrip(activeTrip.trip_id))}
            >
              End trip
            </button>
          </div>
        </div>

        {error ? <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-200">{error}</div> : null}

        <div className="grid gap-3 text-sm md:grid-cols-4">
          <TripMetric label="Trip" value={latestTrip?.code || latestTrip?.trip_id || "-"} />
          <TripMetric label="Status" value={latestTrip?.status ?? "-"} />
          <TripMetric label="Started" value={latestTrip?.actual_start_at ? new Date(latestTrip.actual_start_at).toLocaleString() : "-"} />
          <TripMetric label="Ended" value={endedAt ? new Date(endedAt).toLocaleString() : "-"} />
        </div>
      </section>

      <section className="panel grid gap-3 p-5 text-sm md:grid-cols-3">
        <TripMetric label="Driver" value={myDriver.row?.full_name ?? "-"} />
        <TripMetric label="Email" value={myDriver.row?.email ?? "-"} />
        <TripMetric label="License" value={myDriver.row?.license_number ?? "-"} />
      </section>

      <section className="panel grid gap-3 p-5 text-sm md:grid-cols-3">
        <TripMetric label="Safety score" value={score ? String(score.score) : latestTrip?.safety_score ? String(latestTrip.safety_score) : "-"} />
        <TripMetric label="Grade" value={score?.grade ?? latestTrip?.safety_grade ?? "-"} />
        <TripMetric label="Alerts" value={score ? String(score.alert_count) : "-"} />
      </section>

      <section className="panel flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Trip Alert History</h2>
            <p className="text-xs text-zinc-500">
              {tripForAlerts ? "Alerts recorded for this safety trip" : "Start a trip to collect alerts"}
            </p>
          </div>
          <span className="font-mono-num text-xs text-zinc-500">{alerts.length}</span>
        </div>
        {tripAlerts.error ? (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-200">
            {tripAlerts.error}
          </div>
        ) : null}
        {alerts.length > 0 ? (
          <div className="grid gap-2">
            {alerts.map((alert) => (
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
          </div>
        ) : (
          <div className="rounded-md border border-hairline bg-zinc-950/30 px-3 py-4 text-center text-xs text-zinc-500">
            No alerts for this trip.
          </div>
        )}
      </section>
    </div>
  );
}

function TripMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-hairline bg-zinc-950/40 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-1 truncate text-zinc-100">{value}</p>
    </div>
  );
}
