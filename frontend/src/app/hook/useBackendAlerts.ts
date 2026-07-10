import { useCallback, useEffect, useMemo, useState } from "react";
import type { FleetAlertEvent } from "../types/alerts";
import type { MonitoringAlert } from "../types/monitoring";
import {
  fetchTripAlerts,
  getActiveTripId,
  getAlertPollMs,
  mapBackendAlertToFleetEvent,
  mapBackendAlertToMonitorAlert,
  type BackendAlert,
} from "../services/backendAlerts";

interface LoadedAlerts {
  tripId: string;
  alerts: BackendAlert[];
}

interface BackendAlertsState {
  fleetEvents: FleetAlertEvent[] | null;
  monitorAlerts: MonitoringAlert[] | null;
  isLive: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useBackendAlerts(tripId?: string): BackendAlertsState {
  const activeTripId = tripId || getActiveTripId();
  const pollMs = getAlertPollMs();
  const [loaded, setLoaded] = useState<LoadedAlerts | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!activeTripId) return;

    try {
      const nextAlerts = await fetchTripAlerts(activeTripId);
      setLoaded({ tripId: activeTripId, alerts: nextAlerts });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load alerts");
    }
  }, [activeTripId]);

  useEffect(() => {
    if (!activeTripId) return;
    const firstLoad = window.setTimeout(() => {
      void refresh();
    }, 0);
    const id = window.setInterval(() => {
      void refresh();
    }, pollMs);
    return () => {
      window.clearTimeout(firstLoad);
      window.clearInterval(id);
    };
  }, [activeTripId, pollMs, refresh]);

  const alerts = loaded?.tripId === activeTripId ? loaded.alerts : null;
  const fleetEvents = useMemo(
    () => alerts?.map(mapBackendAlertToFleetEvent) ?? null,
    [alerts],
  );
  const monitorAlerts = useMemo(
    () => alerts?.map(mapBackendAlertToMonitorAlert) ?? null,
    [alerts],
  );

  return {
    fleetEvents,
    monitorAlerts,
    isLive: Boolean(activeTripId && alerts),
    error: activeTripId ? error : null,
    refresh,
  };
}
