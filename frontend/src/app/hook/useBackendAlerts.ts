import { useCallback, useEffect, useMemo, useState } from "react";
import type { FleetAlertEvent } from "../types/alerts";
import type { MonitoringAlert } from "../types/monitoring";
import {
  fetchAlerts,
  fetchTripAlerts,
  getActiveTripId,
  getAlertPollMs,
  mapBackendAlertToFleetEvent,
  mapBackendAlertToMonitorAlert,
  type AlertQuery,
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

export function useBackendAlerts(tripId?: string, query: AlertQuery = {}): BackendAlertsState {
  const activeTripId = tripId || query.tripId || getActiveTripId();
  const pollMs = getAlertPollMs();
  const [loaded, setLoaded] = useState<LoadedAlerts | null>(null);
  const [error, setError] = useState<string | null>(null);
  const queryKey = JSON.stringify(query);

  const refresh = useCallback(async () => {
    const parsedQuery = JSON.parse(queryKey) as AlertQuery;
    const hasQuery = Object.values(parsedQuery).some(Boolean);
    if (!activeTripId && !hasQuery) return;

    try {
      const nextAlerts = hasQuery
        ? await fetchAlerts({ ...parsedQuery, tripId: parsedQuery.tripId ?? activeTripId })
        : await fetchTripAlerts(activeTripId);
      setLoaded({ tripId: activeTripId || "all", alerts: nextAlerts });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load alerts");
    }
  }, [activeTripId, queryKey]);

  useEffect(() => {
    const parsedQuery = JSON.parse(queryKey) as AlertQuery;
    const hasQuery = Object.values(parsedQuery).some(Boolean);
    if (!activeTripId && !hasQuery) return;
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
  }, [activeTripId, pollMs, queryKey, refresh]);

  const alerts = loaded && (loaded.tripId === (activeTripId || "all") || !activeTripId)
    ? loaded.alerts
    : null;
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
    isLive: Boolean((activeTripId || Object.values(query).some(Boolean)) && alerts),
    error: activeTripId || Object.values(query).some(Boolean) ? error : null,
    refresh,
  };
}
