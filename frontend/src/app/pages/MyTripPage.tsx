import { useEffect, useState } from "react";
import {
  completeTrip,
  fetchMyTrips,
  fetchSafetyScore,
  startMyTrip,
  type BackendTrip,
  type SafetyScore,
  bulkIngestSafetyEvents,
} from "../services/backendApi";
import { useBackendAlerts } from "../hook/useBackendAlerts";
import { useMyDriverProfile } from "../hook/useBackendData";
import { useBrowserCNN } from "../hook/useBrowserCNN";

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
  const { videoRef: cnnVideoRef, metrics: cnnMetrics, isRunning: cnnRunning, eventCount: cnnEventCount, start: cnnStart, stop: cnnStop } = useBrowserCNN();

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

  async function handleStartTrip() {
    setIsBusy(true);
    setError("");
    try {
      const newTrip = await startMyTrip();
      await cnnStart(newTrip.trip_id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start trip");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleEndTrip() {
    if (!activeTrip) return;
    setIsBusy(true);
    setError("");
    try {
      const events = cnnStop();
      if (events.length > 0) {
        await bulkIngestSafetyEvents(activeTrip.trip_id, events);
      }
      await completeTrip(activeTrip.trip_id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to end trip");
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
              onClick={() => void handleStartTrip()}
            >
              Start trip
            </button>
            <button
              type="button"
              className="rounded-md border border-hairline px-3 py-2 text-xs font-semibold text-zinc-200 disabled:opacity-50"
              disabled={isBusy || !activeTrip}
              onClick={() => void handleEndTrip()}
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

      <section className={`panel flex flex-col gap-3 p-5 ${activeTrip ? "" : "hidden"}`}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-zinc-100">Live Detection</h2>
          {cnnRunning && (
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
              {cnnEventCount} events
            </span>
          )}
        </div>
        <div className={`relative aspect-[4/3] w-full max-w-[480px] overflow-hidden rounded-md bg-zinc-950 ${cnnRunning ? "" : "hidden"}`}>
          <video
            ref={cnnVideoRef}
            autoPlay
            muted
            playsInline
            className="h-full w-full object-contain"
          />
        </div>
        {cnnRunning && cnnMetrics && (
          <div className="grid grid-cols-4 gap-2 text-sm sm:grid-cols-5">
            <LiveMetric label="EAR" value={cnnMetrics.ear.toFixed(3)} alert={cnnMetrics.earAlert} />
            <LiveMetric label="MAR" value={cnnMetrics.mar.toFixed(3)} alert={cnnMetrics.marAlert} />
            <LiveMetric label="Pitch" value={cnnMetrics.pitch.toFixed(1)} alert={cnnMetrics.poseAlert} />
            <LiveMetric label="DWS" value={`${cnnMetrics.dwsScore}%`} alert={cnnMetrics.dwsScore >= 70} />
            <LiveMetric label="FPS" value={cnnMetrics.fps ? String(cnnMetrics.fps) : "--"} alert={false} />
          </div>
        )}
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

function LiveMetric({ label, value, alert }: { label: string; value: string; alert: boolean }) {
  return (
    <div className="rounded-md border border-hairline bg-zinc-950/40 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</p>
      <p className={`mt-1 font-mono-num text-lg font-semibold ${alert ? "text-rose-400" : "text-zinc-100"}`}>
        {value}
      </p>
    </div>
  );
}
