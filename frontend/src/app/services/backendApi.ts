import type { Driver } from "../types";
import type {
  FleetKpi,
  VehicleQueueStats,
  VehicleSnapshot,
} from "../types/fleets";

export interface BackendDriver {
  driver_id: string;
  full_name: string;
  license_number: string;
  phone?: string | null;
  email?: string | null;
  baseline_ear?: number | string | null;
  status?: string | null;
  total_alerts_count?: number | string | null;
}

export interface BackendTrip {
  trip_id: string;
  driver_id: string;
  driver_name?: string | null;
  vehicle_plate?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  status: string;
  total_alerts_count?: number | string | null;
  critical_alerts_count?: number | string | null;
  safety_score?: number | string | null;
  safety_grade?: string | null;
}

export interface BackendSettings {
  setting_id?: string;
  scope?: string;
  ear_threshold: number;
  ear_consec_frames: number;
  cnn_confidence_threshold: number;
  preferred_detection_method?: string;
  alarm_audio_file: string;
  alert_cooldown_seconds: number;
  enable_no_face_alert?: boolean;
  no_face_timeout_seconds?: number;
  camera_index?: number;
  frame_width?: number;
  frame_height?: number;
  warning_alert_penalty?: number;
  critical_alert_penalty?: number;
  safety_grade_a_min_score?: number;
  safety_grade_b_min_score?: number;
  extra_config?: Record<string, unknown>;
}

export interface BackendMonitoringSnapshot {
  available?: true;
  trip_id?: string | null;
  timestamp: number;
  received_at?: number;
  frame_available?: boolean;
  frame_timestamp?: number;
  fps?: number | null;
  ear: number;
  mar: number;
  pitch: number;
  dws_score: number;
  eyes_open: boolean;
  mouth_closed: boolean;
  face_detected: boolean;
  ear_alert: boolean;
  mar_alert: boolean;
  pose_alert: boolean;
  alarm_on: boolean;
  ear_counter: number;
  mar_counter: number;
  pose_counter: number;
  ear_threshold?: number | null;
  mar_threshold?: number | null;
  pitch_delta_threshold?: number | null;
  cnn_confidence?: number | null;
  cnn_enabled: boolean;
}

export interface BackendMonitoringUnavailable {
  available: false;
}

function apiEnv(name: string): string | undefined {
  return import.meta.env?.[name];
}

export function apiBaseUrl(): string {
  return apiEnv("VITE_API_BASE_URL")?.replace(/\/$/, "") || "/api";
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() !== "" ? value : fallback;
}

function backendStatusToDriver(value: string | null | undefined): Driver["status"] {
  if (value === "suspended") return "critical";
  if (value === "inactive") return "offline";
  return "active";
}

export function mapBackendDriverToDriver(input: BackendDriver): Driver {
  const alerts = asNumber(input.total_alerts_count, 0);
  const status = backendStatusToDriver(input.status);
  const ear = asNumber(input.baseline_ear, 0.3);
  return {
    id: asString(input.driver_id, "driver"),
    name: asString(input.full_name, "Unknown driver"),
    phone: asString(input.phone, "-"),
    licensePlate: asString(input.license_number, "-"),
    team: "Backend",
    status,
    ear,
    eyeState: ear < 0.22 ? "closed" : "open",
    position: { lat: 0, lng: 0 },
    lastUpdate: Date.now(),
    totalAlerts: alerts,
    onPhone: false,
    seatbelt: true,
  };
}

function tripStatusToVehicle(value: string): VehicleSnapshot["status"] {
  switch (value) {
    case "scheduled":
      return "waiting";
    case "in_progress":
      return "in_transit";
    case "completed":
      return "idle";
    case "cancelled":
    case "emergency_stopped":
      return "maintenance";
    default:
      return "idle";
  }
}

export function mapBackendTripToVehicle(input: BackendTrip): VehicleSnapshot {
  const startedAt = input.start_time ? Date.parse(input.start_time) : NaN;
  return {
    id: asString(input.trip_id, "trip"),
    driverId: asString(input.driver_id, "driver"),
    driverName: asString(input.driver_name, "Unknown driver"),
    licensePlate: asString(input.vehicle_plate, "No plate"),
    team: "Active trips",
    status: tripStatusToVehicle(input.status),
    waitMinutes: input.status === "scheduled" && Number.isFinite(startedAt)
      ? Math.max(0, Math.round((Date.now() - startedAt) / 60_000))
      : 0,
    loadProgress: 0,
    speedKmh: 0,
    fuelPercent: 0,
    engineTemp: 0,
    lastUpdate: Date.now(),
  };
}

export function normalizeBackendSettings(input: Partial<BackendSettings>): BackendSettings {
  return {
    setting_id: input.setting_id,
    scope: input.scope,
    ear_threshold: asNumber(input.ear_threshold, 0.3),
    ear_consec_frames: asNumber(input.ear_consec_frames, 15),
    cnn_confidence_threshold: asNumber(input.cnn_confidence_threshold, 0.8),
    preferred_detection_method: asString(input.preferred_detection_method, "ear_dlib"),
    alarm_audio_file: asString(input.alarm_audio_file, "alarm.wav"),
    alert_cooldown_seconds: asNumber(input.alert_cooldown_seconds, 10),
    enable_no_face_alert: input.enable_no_face_alert ?? true,
    no_face_timeout_seconds: asNumber(input.no_face_timeout_seconds, 5),
    camera_index: asNumber(input.camera_index, 0),
    frame_width: asNumber(input.frame_width, 640),
    frame_height: asNumber(input.frame_height, 480),
    warning_alert_penalty: asNumber(input.warning_alert_penalty, 3),
    critical_alert_penalty: asNumber(input.critical_alert_penalty, 8),
    safety_grade_a_min_score: asNumber(input.safety_grade_a_min_score, 85),
    safety_grade_b_min_score: asNumber(input.safety_grade_b_min_score, 60),
    extra_config: input.extra_config ?? {},
  };
}

interface JsonRequestInit {
  method?: string;
  body?: string;
  headers?: Record<string, string>;
}

async function requestJson<T>(path: string, init?: JsonRequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!response.ok) {
    throw new Error(`Backend request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function fetchDrivers(): Promise<BackendDriver[]> {
  const data = await requestJson<{ drivers?: BackendDriver[] } | BackendDriver[]>("/drivers");
  return Array.isArray(data) ? data : data.drivers ?? [];
}

export async function createDriver(payload: {
  full_name: string;
  license_number: string;
  phone?: string;
  email?: string;
  status?: string;
}): Promise<{ driver_id: string }> {
  return requestJson("/drivers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateDriver(
  driverId: string,
  payload: {
    full_name: string;
    license_number: string;
    phone?: string;
    email?: string;
    status?: string;
  },
): Promise<{ success: boolean }> {
  return requestJson(`/drivers/${encodeURIComponent(driverId)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteDriver(driverId: string): Promise<{ success: boolean }> {
  return requestJson(`/drivers/${encodeURIComponent(driverId)}`, {
    method: "DELETE",
  });
}

export async function fetchActiveTrips(): Promise<BackendTrip[]> {
  const data = await requestJson<{ trips?: BackendTrip[] } | BackendTrip[]>("/trips/active");
  return Array.isArray(data) ? data : data.trips ?? [];
}

export async function fetchTrips(): Promise<BackendTrip[]> {
  const data = await requestJson<{ trips?: BackendTrip[] } | BackendTrip[]>("/trips");
  return Array.isArray(data) ? data : data.trips ?? [];
}

export async function fetchSettings(): Promise<BackendSettings> {
  return normalizeBackendSettings(await requestJson<Partial<BackendSettings>>("/settings"));
}

export async function updateSettings(payload: Partial<BackendSettings>): Promise<BackendSettings> {
  return normalizeBackendSettings(
    await requestJson<Partial<BackendSettings>>("/settings", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  );
}

export async function fetchMonitoringSnapshot(): Promise<BackendMonitoringSnapshot | BackendMonitoringUnavailable> {
  return requestJson<BackendMonitoringSnapshot | BackendMonitoringUnavailable>("/monitoring/snapshot");
}

export function monitoringFrameUrl(frameTimestamp?: number): string {
  const suffix = frameTimestamp ? `?t=${encodeURIComponent(String(frameTimestamp))}` : "";
  return `${apiBaseUrl()}/monitoring/frame${suffix}`;
}

export function monitoringStreamUrl(): string {
  return `${apiBaseUrl()}/monitoring/stream`;
}

export function buildFleetKpiFromTrips(trips: BackendTrip[]): FleetKpi {
  return {
    totalVehicles: trips.length,
    activeVehicles: trips.filter((trip) => trip.status === "in_progress").length,
    idleVehicles: trips.filter((trip) => trip.status === "scheduled").length,
    maintenanceVehicles: trips.filter((trip) => trip.status === "emergency_stopped").length,
    todayTrips: trips.length,
    totalDistanceKm: 0,
    fuelLitersUsed: 0,
    avgSpeedKmh: 0,
  };
}

export function buildVehicleStatsFromTrips(vehicles: VehicleSnapshot[]): VehicleQueueStats {
  const waitingCount = vehicles.filter((v) => v.status === "waiting").length;
  const loadingCount = vehicles.filter((v) => v.status === "loading").length;
  const transitCount = vehicles.filter((v) => v.status === "in_transit").length;
  const queueByTeam: Record<string, number> = {};
  vehicles.forEach((vehicle) => {
    if (vehicle.status === "waiting" || vehicle.status === "loading") {
      queueByTeam[vehicle.team] = (queueByTeam[vehicle.team] ?? 0) + 1;
    }
  });
  return {
    waitingCount,
    loadingCount,
    transitCount,
    completedToday: 0,
    avgWaitMinutes: waitingCount > 0
      ? Math.round(
          vehicles
            .filter((v) => v.status === "waiting")
            .reduce((sum, v) => sum + v.waitMinutes, 0) / waitingCount,
        )
      : 0,
    queueByTeam,
  };
}
