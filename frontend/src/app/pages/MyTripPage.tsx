import { useCallback, useEffect, useRef, useState } from "react";
import {
  bulkIngestSafetyEvents,
  completeTrip,
  fetchMyTrips,
  startMyTrip,
  buildSafetySummaryFromTrips,
  type BackendTrip,
  type StartMyTripPayload,
} from "../services/backendApi";
import { useBackendAlerts } from "../hook/useBackendAlerts";
import { useMyDriverProfile } from "../hook/useBackendData";
import { useBrowserCNN } from "../hook/useBrowserCNN";
import { mapClientSafetyEventToMonitorAlert } from "../services/clientSafetyEvents";
import TripHeroHeader from "../component/myTrips/TripHeroHeader";
import TripDriverInfo from "../component/myTrips/TripDriverInfo";
import TripTable from "../component/myTrips/TripTable";
import TripDialog from "../component/myTrips/TripDialog";

const EMPTY_TRIP_FORM: StartMyTripPayload = {
  code: "",
  origin: "",
  destination: "",
};

export default function MyTripPage() {
  const [trips, setTrips] = useState<BackendTrip[]>([]);
  const [tripForm, setTripForm] = useState<StartMyTripPayload>(EMPTY_TRIP_FORM);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const monitoringAttemptedTripIdRef = useRef<string | null>(null);
  const monitoringStartedTripIdRef = useRef<string | null>(null);

  const activeTrip =
    trips.find((trip) => trip.status === "in_progress") ?? null;
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

  const liveAlerts = cnnEvents
    .map(mapClientSafetyEventToMonitorAlert)
    .reverse()
    .slice(0, 5);
  const safetySummary = buildSafetySummaryFromTrips(trips);
  const canCloseDialog = !activeTrip && !isBusy;
  const effectiveDialogOpen = dialogOpen || Boolean(activeTrip);

  const refresh = useCallback(async () => {
    setError("");
    const nextTrips = await fetchMyTrips();
    setTrips(nextTrips);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refresh().catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load trips"),
      );
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [refresh]);

  const startMonitoring = useCallback(
    async (tripId: string) => {
      if (monitoringAttemptedTripIdRef.current === tripId) return;
      monitoringAttemptedTripIdRef.current = tripId;
      try {
        await cnnStart(tripId);
        monitoringStartedTripIdRef.current = tripId;
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to start camera monitoring",
        );
      }
    },
    [cnnStart],
  );

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
      setTrips((current) => [
        newTrip,
        ...current.filter((trip) => trip.trip_id !== newTrip.trip_id),
      ]);
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
      <TripHeroHeader
        activeTripCount={activeTrip ? 1 : 0}
        completedCount={completedTrips.length}
        avgScore={safetySummary.averageScore}
        totalAlerts={safetySummary.totalAlerts}
        criticalAlerts={safetySummary.criticalAlerts}
        canStartNew={!isBusy && !activeTrip}
        onNewTrip={openNewTripDialog}
      />

      {error ? (
        <section className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-200">
          {error}
        </section>
      ) : null}

      <TripDriverInfo driver={myDriver.row} isLoading={!myDriver.isLive} />

      <TripTable trips={trips} />

      <TripDialog
        open={effectiveDialogOpen}
        activeTrip={activeTrip}
        canClose={canCloseDialog}
        isBusy={isBusy}
        error={error}
        form={tripForm}
        cnnVideoRef={cnnVideoRef}
        cnnRunning={cnnRunning}
        cnnMetrics={cnnMetrics}
        cnnEventCount={cnnEventCount}
        liveAlerts={liveAlerts}
        onClose={closeDialog}
        onEndTrip={() => void handleEndTrip()}
        onStartTrip={() => void handleStartTrip()}
        onUpdateForm={updateTripForm}
      />
    </div>
  );
}
