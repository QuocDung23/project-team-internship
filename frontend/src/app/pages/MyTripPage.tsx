import { useCallback, useEffect, useRef, useState } from "react";
import {
  bulkIngestSafetyEvents,
  completeTrip,
  fetchMyTrips,
  startMyTrip,
  buildSafetySummaryFromTrips,
  type BackendTrip,
  type SafetyScore,
  type StartMyTripPayload,
} from "../services/backendApi";
import { useBackendAlerts } from "../hook/useBackendAlerts";
import { useMyDriverProfile } from "../hook/useBackendData";
import { useBrowserCNN } from "../hook/useBrowserCNN";
import { mapClientSafetyEventToMonitorAlert } from "../services/clientSafetyEvents";

const EMPTY_TRIP_FORM: StartMyTripPayload = {
  code: "",
  origin: "",
  destination: "",
};
const ALERT_AUDIO_SRC = "/audio/alert.wav";
const WAKE_AUDIO_SRC = "/audio/hay-tinh-tao.mp3";

export function MyTripPage() {
  const [trips, setTrips] = useState<BackendTrip[]>([]);
  const [tripForm, setTripForm] = useState<StartMyTripPayload>(EMPTY_TRIP_FORM);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const monitoringAttemptedTripIdRef = useRef<string | null>(null);
  const monitoringStartedTripIdRef = useRef<string | null>(null);
  const activeTrip = trips.find((trip) => trip.status === "in_progress") ?? null;
  const completedTrips = trips.filter((trip) => trip.status === "completed");
  const myDriver = useMyDriverProfile(true);
  const tripAlerts = useBackendAlerts(activeTrip?.trip_id, {
    tripId: activeTrip?.trip_id,
  });
  const {
    videoRef: cnnVideoRef,
    metrics: cnnMetrics,
    isRunning: cnnRunning,
    eventCount: cnnEventCount,
    events: cnnEvents,
    start: cnnStart,
    stop: cnnStop,
  } = useBrowserCNN();
  const liveAlerts = cnnEvents.map(mapClientSafetyEventToMonitorAlert).reverse().slice(0, 5);
  const safetySummary = buildSafetySummaryFromTrips(trips);
  const canCloseDialog = !activeTrip && !isBusy;
  const effectiveDialogOpen = dialogOpen || Boolean(activeTrip);
  const escalationActive = useDrowsinessAudio(
    Boolean(cnnMetrics?.drowsinessWarningActive),
    cnnEvents,
    activeTrip?.trip_id ?? null,
  );

  const refresh = useCallback(async () => {
    setError("");
    const nextTrips = await fetchMyTrips();
    setTrips(nextTrips);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refresh().catch((err) => setError(err instanceof Error ? err.message : "Failed to load trips"));
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [refresh]);

  const startMonitoring = useCallback(async (tripId: string) => {
    if (monitoringAttemptedTripIdRef.current === tripId) return;
    monitoringAttemptedTripIdRef.current = tripId;
    try {
      await cnnStart(tripId);
      monitoringStartedTripIdRef.current = tripId;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start camera monitoring");
    }
  }, [cnnStart]);

  useEffect(() => {
    if (!effectiveDialogOpen || !activeTrip) return;
    const timeoutId = window.setTimeout(() => {
      void startMonitoring(activeTrip.trip_id);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [effectiveDialogOpen, activeTrip, startMonitoring]);

  const closeDialog = useCallback(() => {
    if (!canCloseDialog) return;
    setDialogOpen(false);
    setTripForm(EMPTY_TRIP_FORM);
  }, [canCloseDialog]);

  useEffect(() => {
    if (!effectiveDialogOpen || !canCloseDialog) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeDialog();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [effectiveDialogOpen, canCloseDialog, closeDialog]);

  function openNewTripDialog() {
    setError("");
    setTripForm(EMPTY_TRIP_FORM);
    setDialogOpen(true);
  }

  function updateTripForm(field: keyof StartMyTripPayload, value: string) {
    setTripForm((current) => ({ ...current, [field]: value }));
  }

  async function handleStartTrip() {
    setIsBusy(true);
    setError("");
    try {
      const newTrip = await startMyTrip(tripForm);
      setTrips((current) => [newTrip, ...current.filter((trip) => trip.trip_id !== newTrip.trip_id)]);
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
        await tripAlerts.refresh();
      }
      await completeTrip(activeTrip.trip_id);
      monitoringAttemptedTripIdRef.current = null;
      monitoringStartedTripIdRef.current = null;
      await refresh();
      setDialogOpen(false);
      setTripForm(EMPTY_TRIP_FORM);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to end trip");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <section className="panel flex flex-wrap items-center justify-between gap-4 px-5 py-4">
        <div>
          <h1 className="text-base font-semibold tracking-tight text-zinc-100">My Trips</h1>
          <p className="mt-0.5 text-[12px] text-zinc-400">
            {activeTrip ? "Active trip in progress" : `${trips.length} trips recorded`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TripSummary label="Completed" value={String(completedTrips.length)} />
          <TripSummary label="Active" value={activeTrip ? "1" : "0"} />
          <TripSummary label="Avg score" value={safetySummary.averageScore === null ? "-" : String(safetySummary.averageScore)} />
          <TripSummary label="Alerts" value={`${safetySummary.totalAlerts}/${safetySummary.criticalAlerts}`} />
          <button
            type="button"
            className="rounded-md bg-emerald-500 px-3 py-2 text-xs font-semibold text-zinc-950 disabled:opacity-50"
            disabled={isBusy || Boolean(activeTrip)}
            onClick={openNewTripDialog}
          >
            New Trip
          </button>
        </div>
      </section>

      {error ? (
        <section className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-200">
          {error}
        </section>
      ) : null}

      <section className="panel grid gap-3 p-5 text-sm md:grid-cols-3">
        <TripMetric label="Driver" value={myDriver.row?.full_name ?? "-"} />
        <TripMetric label="Email" value={myDriver.row?.email ?? "-"} />
        <TripMetric label="License" value={myDriver.row?.license_number ?? "-"} />
      </section>

      <section className="panel overflow-hidden">
        <div className="grid grid-cols-[1.2fr_0.8fr_1.2fr_1fr_1fr_0.7fr_0.7fr_0.7fr] gap-3 border-b border-hairline px-4 py-2 text-[10px] uppercase tracking-wider text-zinc-500">
          <span>Trip</span>
          <span>Status</span>
          <span>Route</span>
          <span>Started</span>
          <span>Ended</span>
          <span>Score</span>
          <span>Alerts</span>
          <span>Critical</span>
        </div>
        <div className="max-h-[520px] overflow-y-auto">
          {trips.length > 0 ? (
            trips.map((trip) => (
              <TripRow key={trip.trip_id} trip={trip} />
            ))
          ) : (
            <div className="px-4 py-12 text-center text-sm text-zinc-500">No trips yet.</div>
          )}
        </div>
      </section>

      {effectiveDialogOpen ? (
        <TripDialog
          activeTrip={activeTrip}
          canClose={canCloseDialog}
          cnnEventCount={cnnEventCount}
          cnnMetrics={cnnMetrics}
          cnnRunning={cnnRunning}
          cnnVideoRef={cnnVideoRef}
          error={error}
          form={tripForm}
          isBusy={isBusy}
          liveAlerts={liveAlerts}
          onClose={closeDialog}
          onEndTrip={() => void handleEndTrip()}
          onStartTrip={() => void handleStartTrip()}
          onUpdateForm={updateTripForm}
          escalationActive={escalationActive}
        />
      ) : null}
    </div>
  );
}

function useDrowsinessAudio(
  drowsinessActive: boolean,
  events: ReturnType<typeof useBrowserCNN>["events"],
  resetKey: string | null,
): boolean {
  const [escalationState, setEscalationState] = useState<{ active: boolean; key: string | null }>({
    active: false,
    key: null,
  });
  const alertAudioRef = useRef<HTMLAudioElement | null>(null);
  const wakeAudioRef = useRef<HTMLAudioElement | null>(null);
  const countedDrowsinessIdsRef = useRef<Set<string>>(new Set());
  const drowsinessAlertCountRef = useRef(0);
  const escalationPendingRef = useRef(false);
  const escalationPlayingRef = useRef(false);
  const escalationTimeoutRef = useRef<number | null>(null);
  const activeResetKeyRef = useRef<string | null>(resetKey);

  useEffect(() => {
    if (!alertAudioRef.current) {
      const audio = new Audio(ALERT_AUDIO_SRC);
      audio.loop = true;
      audio.preload = "auto";
      alertAudioRef.current = audio;
    }
    if (!wakeAudioRef.current) {
      const audio = new Audio(WAKE_AUDIO_SRC);
      audio.preload = "auto";
      wakeAudioRef.current = audio;
    }
  }, []);

  useEffect(() => {
    const alertAudio = alertAudioRef.current;
    if (!alertAudio) return;

    if (drowsinessActive) {
      void alertAudio.play().catch(() => undefined);
      return;
    }

    alertAudio.pause();
    alertAudio.currentTime = 0;
  }, [drowsinessActive]);

  useEffect(() => {
    if (activeResetKeyRef.current !== resetKey) {
      activeResetKeyRef.current = resetKey;
      countedDrowsinessIdsRef.current = new Set();
      drowsinessAlertCountRef.current = 0;
      escalationPendingRef.current = false;
      escalationPlayingRef.current = false;
    }

    for (const event of events) {
      if (event.event_type !== "drowsiness_detected") continue;
      if (countedDrowsinessIdsRef.current.has(event.event_id)) continue;
      countedDrowsinessIdsRef.current.add(event.event_id);
      drowsinessAlertCountRef.current += 1;
      if (drowsinessAlertCountRef.current >= 3) {
        escalationPendingRef.current = true;
      }
    }

    if (
      escalationPendingRef.current
      && !drowsinessActive
      && !escalationPlayingRef.current
      && escalationTimeoutRef.current === null
    ) {
      const escalationKey = resetKey;
      escalationTimeoutRef.current = window.setTimeout(() => {
        const wakeAudio = wakeAudioRef.current;
        let playsRemaining = 2;
        escalationTimeoutRef.current = null;
        escalationPlayingRef.current = true;
        setEscalationState({ active: true, key: escalationKey });

        const finishEscalation = () => {
          if (wakeAudio) wakeAudio.onended = null;
          drowsinessAlertCountRef.current = 0;
          escalationPendingRef.current = false;
          escalationPlayingRef.current = false;
          setEscalationState({ active: false, key: escalationKey });
        };

        const playNext = () => {
          if (!wakeAudio) {
            window.setTimeout(finishEscalation, 3_000);
            return;
          }
          if (playsRemaining <= 0) {
            finishEscalation();
            return;
          }
          playsRemaining -= 1;
          wakeAudio.pause();
          wakeAudio.currentTime = 0;
          wakeAudio.onended = playNext;
          void wakeAudio.play().catch(() => window.setTimeout(playNext, 500));
        };

        playNext();
      }, 3_000);
    }
  }, [drowsinessActive, events, resetKey]);

  useEffect(() => {
    const alertAudio = alertAudioRef.current;
    const wakeAudio = wakeAudioRef.current;
    if (escalationTimeoutRef.current !== null) {
      window.clearTimeout(escalationTimeoutRef.current);
      escalationTimeoutRef.current = null;
    }
    alertAudio?.pause();
    if (alertAudio) alertAudio.currentTime = 0;
    wakeAudio?.pause();
    if (wakeAudio) wakeAudio.currentTime = 0;
    if (wakeAudio) wakeAudio.onended = null;
    countedDrowsinessIdsRef.current = new Set();
    drowsinessAlertCountRef.current = 0;
    escalationPendingRef.current = false;
    escalationPlayingRef.current = false;
  }, [resetKey]);

  useEffect(() => {
    return () => {
      alertAudioRef.current?.pause();
      wakeAudioRef.current?.pause();
      if (wakeAudioRef.current) wakeAudioRef.current.onended = null;
      if (escalationTimeoutRef.current !== null) {
        window.clearTimeout(escalationTimeoutRef.current);
      }
    };
  }, []);

  return escalationState.active && escalationState.key === resetKey;
}

function TripDialog({
  activeTrip,
  canClose,
  cnnEventCount,
  cnnMetrics,
  cnnRunning,
  cnnVideoRef,
  error,
  form,
  isBusy,
  liveAlerts,
  onClose,
  onEndTrip,
  onStartTrip,
  onUpdateForm,
  escalationActive,
}: {
  activeTrip: BackendTrip | null;
  canClose: boolean;
  cnnEventCount: number;
  cnnMetrics: ReturnType<typeof useBrowserCNN>["metrics"];
  cnnRunning: boolean;
  cnnVideoRef: ReturnType<typeof useBrowserCNN>["videoRef"];
  error: string;
  form: StartMyTripPayload;
  isBusy: boolean;
  liveAlerts: Array<{
    id: string;
    title: string;
    severity: "warn" | "critical";
    ts: number;
    detail: string;
  }>;
  onClose: () => void;
  onEndTrip: () => void;
  onStartTrip: () => void;
  onUpdateForm: (field: keyof StartMyTripPayload, value: string) => void;
  escalationActive: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && canClose) onClose();
      }}
      role="presentation"
    >
      <section className="panel flex max-h-[92vh] w-full max-w-4xl flex-col gap-4 overflow-y-auto p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">
              {activeTrip ? "Active Trip" : "New Trip"}
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              {activeTrip ? "Live detection stays open until the trip ends" : "Add optional trip details before monitoring starts"}
            </p>
          </div>
          {canClose ? (
            <button
              type="button"
              className="rounded-md border border-hairline px-3 py-2 text-xs font-semibold text-zinc-200 disabled:opacity-50"
              disabled={isBusy}
              onClick={onClose}
            >
              Close
            </button>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-200">
            {error}
          </div>
        ) : null}

        {!activeTrip ? (
          <div className="grid gap-3">
            <TextField label="Trip code" value={form.code ?? ""} placeholder="Optional code" onChange={(value) => onUpdateForm("code", value)} />
            <div className="grid gap-3 md:grid-cols-2">
              <TextField label="Origin" value={form.origin ?? ""} placeholder="Optional origin" onChange={(value) => onUpdateForm("origin", value)} />
              <TextField label="Destination" value={form.destination ?? ""} placeholder="Optional destination" onChange={(value) => onUpdateForm("destination", value)} />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-hairline px-3 py-2 text-xs font-semibold text-zinc-200 disabled:opacity-50"
                disabled={isBusy}
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-emerald-500 px-3 py-2 text-xs font-semibold text-zinc-950 disabled:opacity-50"
                disabled={isBusy}
                onClick={onStartTrip}
              >
                Start Trip
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1.35fr_0.85fr]">
            <div className="grid gap-3">
              <div className="grid gap-3 text-sm md:grid-cols-3">
                <TripMetric label="Trip" value={activeTrip.code || activeTrip.trip_id} />
                <TripMetric label="Status" value={activeTrip.status} />
                <TripMetric label="Route" value={routeLabel(activeTrip)} />
              </div>
              <div className={`relative aspect-[4/3] w-full overflow-hidden rounded-md bg-zinc-950 ${cnnRunning ? "" : "hidden"}`}>
                <video ref={cnnVideoRef} autoPlay muted playsInline className="h-full w-full scale-x-[-1] object-contain" />
                {cnnMetrics?.drowsinessWarningActive ? (
                  <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center">
                    <span className="animate-pulse rounded-md bg-red-600/90 px-4 py-2 text-xl font-black uppercase tracking-wide text-white shadow-lg shadow-red-950/40">
                      BUỒN NGỦ
                    </span>
                  </div>
                ) : null}
                {cnnMetrics?.yawnWarningActive ? (
                  <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
                    <span className="rounded-md bg-amber-400/90 px-4 py-2 text-lg font-black uppercase tracking-wide text-zinc-950 shadow-lg shadow-amber-950/30">
                      NGÁP
                    </span>
                  </div>
                ) : null}
                {escalationActive ? (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-red-950/35 px-4">
                    <span className="animate-pulse text-center text-4xl font-black uppercase tracking-wide text-red-100 drop-shadow-[0_4px_18px_rgba(127,29,29,0.95)] sm:text-6xl">
                      HÃY TỈNH TÁO
                    </span>
                  </div>
                ) : null}
              </div>
              {!cnnRunning ? (
                <div className="rounded-md border border-hairline bg-zinc-950/30 px-3 py-8 text-center text-xs text-zinc-500">
                  Waiting for live detection.
                </div>
              ) : null}
              {cnnMetrics ? (
                <div className="grid grid-cols-4 gap-2 text-sm sm:grid-cols-5">
                  <LiveMetric label="EAR" value={cnnMetrics.ear.toFixed(3)} alert={cnnMetrics.earAlert} />
                  <LiveMetric label="MAR" value={cnnMetrics.mar.toFixed(3)} alert={cnnMetrics.marAlert} />
                  <LiveMetric label="Pitch" value={cnnMetrics.pitch.toFixed(1)} alert={cnnMetrics.poseAlert} />
                  <LiveMetric label="DWS" value={`${cnnMetrics.dwsScore}%`} alert={cnnMetrics.dwsScore >= 70} />
                  <LiveMetric label="FPS" value={cnnMetrics.fps ? String(cnnMetrics.fps) : "--"} alert={false} />
                </div>
              ) : null}
            </div>

            <div className="grid content-start gap-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-zinc-100">Live Alerts</h3>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                  {cnnEventCount} events
                </span>
              </div>
              {liveAlerts.length > 0 ? (
                liveAlerts.map((alert) => <AlertInfoRow key={alert.id} alert={alert} />)
              ) : (
                <div className="rounded-md border border-hairline bg-zinc-950/30 px-3 py-4 text-center text-xs text-zinc-500">
                  No live alerts yet.
                </div>
              )}
              <button
                type="button"
                className="mt-2 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200 disabled:opacity-50"
                disabled={isBusy}
                onClick={onEndTrip}
              >
                End Trip
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function TripRow({ trip }: { trip: BackendTrip }) {
  const score = scoreLabel(trip);
  return (
    <div className="grid grid-cols-[1.2fr_0.8fr_1.2fr_1fr_1fr_0.7fr_0.7fr_0.7fr] gap-3 border-b border-hairline px-4 py-3 text-sm text-zinc-300">
      <span className="truncate font-mono-num text-xs text-zinc-100">{trip.code || trip.trip_id}</span>
      <span className={statusClassName(trip.status)}>{trip.status}</span>
      <span className="truncate text-xs text-zinc-500">{routeLabel(trip)}</span>
      <span className="truncate text-xs text-zinc-500">{dateLabel(trip.actual_start_at ?? trip.start_time)}</span>
      <span className="truncate text-xs text-zinc-500">{dateLabel(trip.actual_end_at ?? trip.end_time)}</span>
      <span className="truncate text-xs text-zinc-300">{score}</span>
      <span className="font-mono-num text-xs text-zinc-300">{alertCountLabel(trip)}</span>
      <span className="font-mono-num text-xs text-rose-300">{criticalAlertCountLabel(trip)}</span>
    </div>
  );
}

function TripSummary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-hairline bg-zinc-950/40 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="font-mono-num text-sm font-semibold text-zinc-100">{value}</p>
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

function TextField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-[11px] text-zinc-400">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-md border border-hairline bg-surface-2 px-3 py-2 text-[12px] text-zinc-100 outline-none focus:border-emerald-500/50"
        placeholder={placeholder}
      />
    </label>
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

function AlertInfoRow({
  alert,
}: {
  alert: {
    id: string;
    title: string;
    severity: "warn" | "critical";
    ts: number;
    detail: string;
  };
}) {
  return (
    <div className="rounded-md border border-hairline bg-zinc-950/40 px-3 py-2">
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
  );
}

function dateLabel(value?: string | null): string {
  return value ? new Date(value).toLocaleString() : "-";
}

function routeLabel(trip: BackendTrip): string {
  if (trip.origin && trip.destination) return `${trip.origin} → ${trip.destination}`;
  return trip.origin || trip.destination || "-";
}

function scoreLabel(trip: BackendTrip): string {
  const score = trip.safety_score;
  if (score && typeof score === "object") {
    return `${score.score} (${score.grade})`;
  }
  if (score !== null && score !== undefined && score !== "") {
    return trip.safety_grade ? `${score} (${trip.safety_grade})` : String(score);
  }
  return "-";
}

function alertCountLabel(trip: BackendTrip): string {
  const score = trip.safety_score;
  if (score && typeof score === "object") return String((score as SafetyScore).alert_count);
  if (trip.total_alerts_count !== null && trip.total_alerts_count !== undefined) {
    return String(trip.total_alerts_count);
  }
  return "-";
}

function criticalAlertCountLabel(trip: BackendTrip): string {
  if (trip.critical_alerts_count !== null && trip.critical_alerts_count !== undefined) {
    return String(trip.critical_alerts_count);
  }
  const score = trip.safety_score;
  if (score && typeof score === "object") return String((score as SafetyScore).critical_events);
  return "-";
}

function statusClassName(status: string): string {
  if (status === "in_progress") return "truncate text-xs font-semibold text-emerald-300";
  if (status === "completed") return "truncate text-xs text-zinc-300";
  if (status === "cancelled" || status === "aborted") return "truncate text-xs text-rose-300";
  return "truncate text-xs text-amber-300";
}
