import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  fetchMonitoringSnapshot,
  fetchSettings,
  fetchTrips,
  hasUsableStoredAuthToken,
  mapBackendDriverToDriver,
  mapBackendTripToVehicle,
  monitoringStreamUrl,
  updateDriver,
  updateSettings,
  type BackendDriver,
  type BackendMonitoringSnapshot,
  type BackendSettings,
  type BackendTrip,
} from "../services/backendApi";
import {
  overall,
  type DriverSnapshot,
} from "../types/monitoring";

const MONITORING_STALE_AFTER_MS = 3_000;

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

function mapMonitoringSnapshot(input: BackendMonitoringSnapshot): DriverSnapshot {
  const snap: DriverSnapshot = {
    ts: Math.round(input.timestamp * 1000),
    ear: input.ear,
    mar: input.mar,
    pitch: input.pitch,
    fps: input.fps ?? null,
    dwsScore: input.dws_score,
    status: "active",
    eyesOpen: input.eyes_open,
    mouthClosed: input.mouth_closed,
    faceDetected: input.face_detected,
    earAlert: input.ear_alert,
    marAlert: input.mar_alert,
    poseAlert: input.pose_alert,
    alarmOn: input.alarm_on,
  };
  snap.status = overall(snap);
  return snap;
}

export function useBackendMonitoring() {
  const [raw, setRaw] = useState<BackendMonitoringSnapshot | null>(null);
  const [snap, setSnap] = useState<DriverSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pollNow, setPollNow] = useState(() => Date.now());
  const [lastFrameProgressAt, setLastFrameProgressAt] = useState(() => Date.now());
  const lastFrameTimestampRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const nextRaw = await fetchMonitoringSnapshot();
      const now = Date.now();
      setPollNow(now);
      if (nextRaw.available === false) {
        lastFrameTimestampRef.current = null;
        setLastFrameProgressAt(now);
        setRaw(null);
        setSnap(null);
        setError(null);
        return;
      }
      if (
        nextRaw.frame_available &&
        typeof nextRaw.frame_timestamp === "number" &&
        nextRaw.frame_timestamp !== lastFrameTimestampRef.current
      ) {
        lastFrameTimestampRef.current = nextRaw.frame_timestamp;
        setLastFrameProgressAt(now);
      }
      const nextSnap = mapMonitoringSnapshot(nextRaw);
      setRaw(nextRaw);
      setSnap((prev) => (prev?.ts === nextSnap.ts ? prev : nextSnap));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load detector snapshot");
    }
  }, []);

  useEffect(() => {
    const firstLoad = window.setTimeout(() => {
      void refresh();
    }, 0);
    const id = window.setInterval(() => {
      void refresh();
    }, 1000);
    return () => {
      window.clearTimeout(firstLoad);
      window.clearInterval(id);
    };
  }, [refresh]);

  const hasFrame = Boolean(raw?.frame_available);
  const isStale = Boolean(raw?.stale) || !hasFrame || pollNow - lastFrameProgressAt > MONITORING_STALE_AFTER_MS;
  const hasAuthToken = hasUsableStoredAuthToken();

  return {
    raw,
    snap,
    streamUrl: monitoringStreamUrl(),
    hasFrame,
    isStale,
    isLive: Boolean(snap) && !isStale,
    hasAuthToken,
    error,
    refresh,
  };
}
