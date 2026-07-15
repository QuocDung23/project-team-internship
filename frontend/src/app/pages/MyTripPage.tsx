import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  bulkIngestSafetyEvents,
  completeTrip,
  fetchMyTrips,
  startOrResumeMyTrip,
  buildSafetySummaryFromTrips,
  type BackendTrip,
  type StartMyTripPayload,
} from "../services/backendApi";
import { useBackendAlerts } from "../hook/useBackendAlerts";
import { useMyDriverProfile } from "../hook/useBackendData";
import { useBrowserCNN } from "../hook/useBrowserCNN";
import { buildLiveMonitoringAlerts } from "../services/clientSafetyEvents";
import {
  generateTripCode,
  tripFormWarnings,
} from "../utils/trips/tripFormatters";
import { EMPTY_TRIP_FORM } from "../utils/trips/tripFormConstants";
import TripHeroHeader from "../component/myTrips/TripHeroHeader";
import TripDriverInfo from "../component/myTrips/TripDriverInfo";
import TripRow from "../component/myTrips/TripRow";
import TripDialog from "../component/myTrips/TripDialog";
import TripHistoryDialog from "../component/myTrips/TripHistoryDialog";
import useDrowsinessAudio from "../hook/useDrowsinessAudio";

export default function MyTripPage() {
  const { t } = useTranslation(["trips", "common"]);
  const [trips, setTrips] = useState<BackendTrip[]>([]);
  const [tripForm, setTripForm] = useState<StartMyTripPayload>(EMPTY_TRIP_FORM);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedHistoryTripId, setSelectedHistoryTripId] = useState<
    string | null
  >(null);
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const monitoringAttemptedTripIdRef = useRef<string | null>(null);
  const monitoringStartedTripIdRef = useRef<string | null>(null);
  const activeTrip =
    trips.find((trip) => trip.status === "in_progress") ?? null;
  const selectedHistoryTrip = useMemo(
    () => trips.find((trip) => trip.trip_id === selectedHistoryTripId) ?? null,
    [selectedHistoryTripId, trips],
  );
  const completedTrips = trips.filter((trip) => trip.status === "completed");
  const myDriver = useMyDriverProfile(true);
  const tripAlerts = useBackendAlerts(activeTrip?.trip_id, {
    tripId: activeTrip?.trip_id,
  });
  const historyAlerts = useBackendAlerts(selectedHistoryTrip?.trip_id, {
    tripId: selectedHistoryTrip?.trip_id,
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
  const liveAlerts = buildLiveMonitoringAlerts(cnnEvents).reverse().slice(0, 5);
  const safetySummary = buildSafetySummaryFromTrips(trips);
  const canCloseDialog = !activeTrip && !isBusy;
  const effectiveDialogOpen = dialogOpen || Boolean(activeTrip);
  const escalationActive = useDrowsinessAudio(
    Boolean(cnnMetrics?.drowsinessWarningActive),
    cnnEvents,
    activeTrip?.trip_id ?? null,
  );

  const handleRefreshError = useCallback(
    (err: unknown) => {
      setError(err instanceof Error ? err.message : t("trips:pages.myTrip.errors.loadTrips"));
    },
    [t],
  );

  const handleStartMonitoringError = useCallback(
    (err: unknown) => {
      setError(
        err instanceof Error ? err.message : t("trips:pages.myTrip.errors.camera"),
      );
    },
    [t],
  );

  const handleStartTripError = useCallback(
    (err: unknown) => {
      setError(err instanceof Error ? err.message : t("trips:pages.myTrip.errors.startTrip"));
    },
    [t],
  );

  const handleEndTripError = useCallback(
    (err: unknown) => {
      setError(err instanceof Error ? err.message : t("trips:pages.myTrip.errors.endTrip"));
    },
    [t],
  );

  const refresh = useCallback(async () => {
    setError("");
    const nextTrips = await fetchMyTrips();
    setTrips(nextTrips);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refresh().catch(handleRefreshError);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [refresh, handleRefreshError]);

  const startMonitoring = useCallback(
    async (tripId: string) => {
      if (monitoringAttemptedTripIdRef.current === tripId) return;
      monitoringAttemptedTripIdRef.current = tripId;
      try {
        await cnnStart(tripId);
        monitoringStartedTripIdRef.current = tripId;
      } catch (err) {
        handleStartMonitoringError(err);
      }
    },
    [cnnStart, handleStartMonitoringError],
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
    setTripForm({ ...EMPTY_TRIP_FORM, code: generateTripCode(trips) });
    setDialogOpen(true);
  }

  function updateTripForm(field: keyof StartMyTripPayload, value: string) {
    setTripForm((current) => ({ ...current, [field]: value }));
  }

  async function handleStartTrip() {
    const warnings = tripFormWarnings(tripForm);
    const blockingWarning = warnings.find((warning) => warning.blocking);
    if (blockingWarning) {
      setError(
        t(blockingWarning.key, blockingWarning.params) ??
          t("trips:form.invalid"),
      );
      return;
    }
    setIsBusy(true);
    setError("");
    try {
      const result = await startOrResumeMyTrip(tripForm);
      setTrips(result.trips);
      setDialogOpen(true);
      if (!result.resumed) await refresh();
    } catch (err) {
      handleStartTripError(err);
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
      handleEndTripError(err);
    } finally {
      setIsBusy(false);
    }
  }

  const historyEyebrow = t("trips:pages.myTrip.history.eyebrow");
  const historyTitle = t("trips:pages.myTrip.history.title");
  const historySubtitle = t("trips:pages.myTrip.history.subtitle");
  const historyTotalLabel = t("trips:pages.myTrip.history.totalCount", { count: trips.length });
  const historyColumns = {
    tripId: t("trips:pages.myTrip.history.columns.tripId"),
    route: t("trips:pages.myTrip.history.columns.route"),
    startTime: t("trips:pages.myTrip.history.columns.startTime"),
    endTime: t("trips:pages.myTrip.history.columns.endTime"),
    safetyScore: t("trips:pages.myTrip.history.columns.safetyScore"),
  };
  const historyEmpty = t("trips:pages.myTrip.history.empty");
  return (
    <div className="flex flex-1 flex-col gap-5 p-4 md:gap-6 md:p-6">
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
        <section className="rounded-2xl border border-accent-warn/30 bg-accent-warn/5 px-4 py-3 text-[12px] text-accent-warn">
          {error}
        </section>
      ) : null}

      <TripDriverInfo driver={myDriver.row} isLoading={!myDriver.isLive} />

      <section className="bezel-shell overflow-hidden">
        <div className="bezel-core relative">
          <div className="flex items-end justify-between gap-3 border-b border-hairline px-5 py-4">
            <div>
              <div className="eyebrow-chip mb-2">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-active" />
                <span>{historyEyebrow}</span>
              </div>
              <h2 className="section-headline">{historyTitle}</h2>
              <p className="section-subline">
                {historySubtitle}
              </p>
            </div>
            <span className="rounded-full border border-hairline bg-subtle-bg px-2.5 py-1 font-mono-num text-[11px] font-medium text-text-secondary tabular-nums">
              {historyTotalLabel}
            </span>
          </div>
          <div className="grid grid-cols-[1.1fr_1.4fr_1fr_1fr_0.85fr_auto] gap-4 border-b border-hairline bg-subtle-bg px-5 py-2.5 text-[10px] font-medium uppercase tracking-[0.16em] text-text-tertiary">
            <span>{historyColumns.tripId}</span>
            <span>{historyColumns.route}</span>
            <span>{historyColumns.startTime}</span>
            <span>{historyColumns.endTime}</span>
            <span>{historyColumns.safetyScore}</span>
            <span aria-hidden className="w-7" />
          </div>
          <div className="max-h-[520px] overflow-y-auto">
            {trips.length > 0 ? (
              trips.map((trip) => (
                <TripRow
                  key={trip.trip_id}
                  trip={trip}
                  onSelect={setSelectedHistoryTripId}
                />
              ))
            ) : (
              <div className="px-4 py-14 text-center text-sm text-text-tertiary">
                {historyEmpty}
              </div>
            )}
          </div>
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
          driverName={
            myDriver.row?.full_name ??
            activeTrip?.driver_name ??
            activeTrip?.driver_email ??
            "-"
          }
          onClose={closeDialog}
          onEndTrip={() => void handleEndTrip()}
          onStartTrip={() => void handleStartTrip()}
          onUpdateForm={updateTripForm}
          escalationActive={escalationActive}
        />
      ) : null}

      {selectedHistoryTrip ? (
        <TripHistoryDialog
          alerts={historyAlerts.monitorAlerts ?? []}
          alertsError={
            historyAlerts.error instanceof Error
              ? historyAlerts.error.message
              : historyAlerts.error
                ? String(historyAlerts.error)
                : null
          }
          driverName={
            myDriver.row?.full_name ??
            selectedHistoryTrip.driver_name ??
            selectedHistoryTrip.driver_email ??
            "-"
          }
          isLoadingAlerts={!historyAlerts.isLive && !historyAlerts.error}
          onClose={() => setSelectedHistoryTripId(null)}
          trip={selectedHistoryTrip}
        />
      ) : null}
    </div>
  );
}
