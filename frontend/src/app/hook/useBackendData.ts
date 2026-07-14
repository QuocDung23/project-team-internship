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
  fetchMyDriverProfile,
  fetchSettings,
  fetchTrips,
  mapBackendDriverToDriver,
  mapBackendTripToVehicle,
  updateDriver,
  updateSettings,
  type BackendDriver,
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

