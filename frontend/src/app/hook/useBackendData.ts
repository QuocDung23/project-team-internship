import { useCallback, useEffect, useMemo, useState } from "react";
import type { Driver } from "../types";
import type {
  FleetKpi,
  VehicleQueueStats,
  VehicleSnapshot,
} from "../types/fleets";
import {
  buildFleetKpiFromTrips,
  buildVehicleStatsFromTrips,
  createDriver,
  deleteDriver,
  fetchActiveTrips,
  fetchDrivers,
  fetchMonitoringSnapshot,
  fetchMyDriverProfile,
  fetchSettings,
  fetchTrips,
  mapBackendDriverToDriver,
  mapBackendTripToVehicle,
  monitoringEventsUrl,
  updateDriver,
  updateSettings,
  type BackendDriver,
  type BackendMonitoringSnapshot,
  type BackendMonitoringUnavailable,
  type BackendSettings,
  type BackendTrip,
} from "../services/backendApi";

export function useBackendDrivers(enabled = true) {
  const [rows, setRows] = useState<BackendDriver[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setRows(null);
      setError(null);
      return;
    }
    try {
      const next = await fetchDrivers();
      setRows(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load drivers");
    }
  }, [enabled]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(id);
  }, [refresh]);

  const drivers = useMemo<Driver[] | null>(
    () => rows?.map(mapBackendDriverToDriver) ?? null,
    [rows],
  );

  return {
    rows,
    drivers,
    isLive: Boolean(rows),
    error,
    refresh,
    createDriver: async (payload: Parameters<typeof createDriver>[0]) => {
      await createDriver(payload);
      await refresh();
    },
    updateDriver: async (driverId: string, payload: Parameters<typeof updateDriver>[1]) => {
      await updateDriver(driverId, payload);
      await refresh();
    },
    deleteDriver: async (driverId: string) => {
      await deleteDriver(driverId);
      await refresh();
    },
  };
}

export function useMyDriverProfile(enabled = true) {
  const [row, setRow] = useState<BackendDriver | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setRow(null);
      setError(null);
      return;
    }
    try {
      const next = await fetchMyDriverProfile();
      setRow(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load driver profile");
    }
  }, [enabled]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(id);
  }, [refresh]);

  const driver = useMemo<Driver | null>(
    () => (row ? mapBackendDriverToDriver(row) : null),
    [row],
  );

  return { row, driver, isLive: Boolean(row), error, refresh };
}

export function useBackendTrips(activeOnly = false, enabled = true) {
  const [trips, setTrips] = useState<BackendTrip[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setTrips(null);
      setError(null);
      return;
    }
    try {
      const next = activeOnly ? await fetchActiveTrips() : await fetchTrips();
      setTrips(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load trips");
    }
  }, [activeOnly, enabled]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(id);
  }, [refresh]);

  const vehicles = useMemo<VehicleSnapshot[] | null>(
    () => trips?.map(mapBackendTripToVehicle) ?? null,
    [trips],
  );
  const stats = useMemo<VehicleQueueStats | null>(
    () => (vehicles ? buildVehicleStatsFromTrips(vehicles) : null),
    [vehicles],
  );
  const kpi = useMemo<FleetKpi | null>(
    () => (trips ? buildFleetKpiFromTrips(trips) : null),
    [trips],
  );

  return { trips, vehicles, stats, kpi, isLive: Boolean(trips), error, refresh };
}

export function useBackendSettings() {
  const [settings, setSettings] = useState<BackendSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const next = await fetchSettings();
      setSettings(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(id);
  }, [refresh]);

  const save = useCallback(async (changes: Partial<BackendSettings>) => {
    setSaving(true);
    try {
      const next = await updateSettings(changes);
      setSettings(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }, []);

  return { settings, isLive: Boolean(settings), error, saving, refresh, save };
}

export function useMonitoringSnapshot(pollMs = 500) {
  const [snapshot, setSnapshot] = useState<
    BackendMonitoringSnapshot | BackendMonitoringUnavailable | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await fetchMonitoringSnapshot();
      setSnapshot(next);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load detector monitoring",
      );
    }
  }, []);

  useEffect(() => {
    let closed = false;
    let intervalId: number | null = null;
    let fallbackId: number | null = null;
    let initialLoadId: number | null = null;
    let eventSource: EventSource | null = null;

    const startPolling = () => {
      if (closed || intervalId !== null) return;
      initialLoadId = window.setTimeout(() => {
        void refresh();
      }, 0);
      intervalId = window.setInterval(() => {
        void refresh();
      }, pollMs);
    };

    if (typeof EventSource === "undefined") {
      startPolling();
      return () => {
        closed = true;
        if (initialLoadId !== null) window.clearTimeout(initialLoadId);
        if (intervalId !== null) window.clearInterval(intervalId);
      };
    }

    initialLoadId = window.setTimeout(() => {
      void refresh();
    }, 0);
    eventSource = new EventSource(monitoringEventsUrl());
    fallbackId = window.setTimeout(startPolling, 2500);

    eventSource.addEventListener("snapshot", (event) => {
      if (closed) return;
      if (fallbackId !== null) {
        window.clearTimeout(fallbackId);
        fallbackId = null;
      }
      try {
        setSnapshot(JSON.parse(event.data) as BackendMonitoringSnapshot | BackendMonitoringUnavailable);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to parse detector monitoring");
      }
    });
    eventSource.addEventListener("keepalive", () => {
      if (fallbackId !== null) {
        window.clearTimeout(fallbackId);
        fallbackId = null;
      }
    });
    eventSource.onerror = () => {
      if (closed) return;
      eventSource?.close();
      eventSource = null;
      startPolling();
    };

    return () => {
      closed = true;
      if (fallbackId !== null) window.clearTimeout(fallbackId);
      if (initialLoadId !== null) window.clearTimeout(initialLoadId);
      if (intervalId !== null) window.clearInterval(intervalId);
      eventSource?.close();
    };
  }, [pollMs, refresh]);

  return {
    snapshot,
    isLive: Boolean(snapshot && snapshot.available !== false && !snapshot.stale),
    error,
    refresh,
  };
}
