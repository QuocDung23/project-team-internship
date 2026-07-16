import type { Driver } from "../types";
import type {
  FleetKpi,
  VehicleQueueStats,
  VehicleSnapshot,
} from "../types/fleets";
import type { ClientSafetyEvent } from "../types/monitoring";

export interface BackendDriver {
  driver_id: string;
  driver_code?: string | null;
  full_name: string;
  license_number: string;
  phone?: string | null;
  email?: string | null;
  baseline_ear?: number | string | null;
  status?: string | null;
  total_alerts_count?: number | string | null;
}

export const TOKEN_STORAGE_KEY = "drowsiness_access_token";
const API_REQUEST_TIMEOUT_MS = 10_000;

export interface AuthUser {
  user_id: string;
  full_name: string;
  email: string;
  role: "admin" | "driver";
  status: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: AuthUser;
}

export interface BackendTrip {
  trip_id: string;
  code?: string | null;
  driver_id?: string | null;
  driver_name?: string | null;
  driver_email?: string | null;
  vehicle_plate?: string | null;
  assignment?: {
    driver_id?: string | null;
    vehicle_id?: string | null;
  } | null;
  monitoring_session?: {
    monitoring_session_id: string;
    trip_id: string;
    status: string;
  } | null;
  start_time?: string | null;
  actual_start_at?: string | null;
  planned_start_at?: string | null;
  end_time?: string | null;
  actual_end_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  origin?: string | null;
  destination?: string | null;
  status: string;
  total_alerts_count?: number | string | null;
  critical_alerts_count?: number | string | null;
  safety_score?: SafetyScore | number | string | null;
  safety_grade?: string | null;
}

export interface SafetyScore {
  safety_score_id: string;
  trip_id: string;
  score: number;
  grade: string;
  total_events: number;
  warning_events: number;
  critical_events: number;
  alert_count: number;
  calculation_version: string;
  explanation: Record<string, unknown>;
  calculated_at: string;
}

export interface StartMyTripPayload {
  code?: string;
  origin?: string;
  destination?: string;
}

export interface StartMyTripResult {
  trip: BackendTrip;
  trips: BackendTrip[];
  resumed: boolean;
}

export interface BackendSettings {
  setting_id?: string;
  scope?: string;
  alarm_sound_id?: string;
  alarm_sound_catalog?: AlarmSoundOption[];
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

export interface AlarmSoundOption {
  id: string;
  label: string;
  browser_path: string;
  runtime_path: string;
}

export interface BackendMonitoringSnapshot {
  available?: true;
  trip_id?: string | null;
  timestamp: number;
  received_at?: number;
  frame_available?: boolean;
  frame_timestamp?: number;
  snapshot_seq?: number;
  server_time?: number;
  snapshot_received_at?: number | null;
  frame_received_at?: number | null;
  age_seconds?: number | null;
  snapshot_age_seconds?: number | null;
  frame_age_seconds?: number | null;
  stale?: boolean;
  health?: "online" | "stale" | "offline" | string;
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
  server_time?: number;
  age_seconds?: number | null;
  stale?: boolean;
  health?: "offline" | "stale" | string;
}

export interface BrowserMonitoringSnapshotPayload {
  trip_id?: string | null;
  timestamp: number;
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
  ear_counter?: number;
  mar_counter?: number;
  pose_counter?: number;
  cnn_enabled: boolean;
}

function apiEnv(name: string): string | undefined {
  return import.meta.env?.[name];
}

export function apiBaseUrl(): string {
  return apiEnv("VITE_API_BASE_URL")?.replace(/\/$/, "") || "/api/v1";
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    return JSON.parse(globalThis.atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function isAccessTokenUsable(token: string, nowSeconds = Date.now() / 1000): boolean {
  const trimmed = token.trim();
  if (!trimmed) return false;
  const payload = decodeJwtPayload(trimmed);
  if (!payload) return false;
  const expiresAt = payload.exp;
  if (typeof expiresAt !== "number") return true;
  return expiresAt > nowSeconds + 30;
}

export function hasUsableStoredAuthToken(): boolean {
  if (typeof window === "undefined") return false;
  const token = window.localStorage.getItem(TOKEN_STORAGE_KEY)?.trim() ?? "";
  if (!token) return false;
  if (isAccessTokenUsable(token)) return true;
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  return false;
}

export function apiAuthToken(): string {
  const envToken = apiEnv("VITE_API_BEARER_TOKEN")?.trim();
  if (envToken) return envToken;
  if (typeof window === "undefined") return "";
  const token = window.localStorage.getItem(TOKEN_STORAGE_KEY)?.trim() ?? "";
  if (!token) return "";
  if (isAccessTokenUsable(token)) return token;
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  window.dispatchEvent(new Event("drowsiness:unauthorized"));
  return "";
}

export function apiHeaders(headers?: Record<string, string>): Record<string, string> {
  const token = apiAuthToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(headers ?? {}),
  };
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
  if (value === "inactive" || value === "suspended") return "disable";
  return "idle";
}

export function mapBackendDriverToDriver(input: BackendDriver): Driver {
  const alerts = asNumber(input.total_alerts_count, 0);
  const status = backendStatusToDriver(input.status);
  const ear = asNumber(input.baseline_ear, 0.3);
  const fallbackCode = asString(input.driver_id, "driver").slice(0, 8).toUpperCase();
  return {
    id: asString(input.driver_id, "driver"),
    driverCode: asString(input.driver_code, fallbackCode),
    name: asString(input.full_name, "Unknown driver"),
    email: asString(input.email, "-"),
    phone: asString(input.phone, "-"),
    licenseNumber: asString(input.license_number, "-"),
    licensePlate: "Unassigned",
    team: "Backend",
    status,
    ear,
    eyeState: ear < 0.22 ? "closed" : "open",
    position: { lat: 0, lng: 0 },
    lastUpdate: Date.now(),
    totalAlerts: alerts,
    criticalAlerts: 0,
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
  const startedAt = input.start_time ?? input.actual_start_at ?? input.planned_start_at;
  const startedAtMs = startedAt ? Date.parse(startedAt) : NaN;
  return {
    id: asString(input.trip_id, "trip"),
    driverId: asString(input.driver_id ?? input.assignment?.driver_id, "driver"),
    driverName: asString(input.driver_name, "Unknown driver"),
    licensePlate: asString(input.vehicle_plate, "No plate"),
    team: "Active trips",
    status: tripStatusToVehicle(input.status),
    waitMinutes: input.status === "scheduled" && Number.isFinite(startedAtMs)
      ? Math.max(0, Math.round((Date.now() - startedAtMs) / 60_000))
      : 0,
    loadProgress: 0,
    speedKmh: 0,
    fuelPercent: 0,
    engineTemp: 0,
    lastUpdate: Date.now(),
  };
}

function activeTripDriverId(trip: BackendTrip): string | null {
  if (trip.status !== "in_progress") return null;
  return trip.driver_id ?? trip.assignment?.driver_id ?? null;
}

export function deriveDriverStatuses(drivers: Driver[], trips: BackendTrip[]): Driver[] {
  return drivers.map((driver) => {
    const linkedTrips = getTripsForDriver(driver.id, trips);
    const activeTrip = linkedTrips.find((trip) => trip.status === "in_progress");
    const vehiclePlate = displayVehiclePlate(activeTrip ?? latestTripWithPlate(linkedTrips));
    const totalAlerts = linkedTrips.reduce((sum, trip) => sum + asNumber(trip.total_alerts_count, 0), 0);
    const criticalAlerts = linkedTrips.reduce((sum, trip) => sum + asNumber(trip.critical_alerts_count, 0), 0);
    if (driver.status === "disable") {
      return {
        ...driver,
        licensePlate: vehiclePlate,
        totalAlerts,
        criticalAlerts,
      };
    }
    return {
      ...driver,
      status: activeTrip && activeTripDriverId(activeTrip) === driver.id ? "driving" : "idle",
      licensePlate: vehiclePlate,
      totalAlerts,
      criticalAlerts,
    };
  });
}

export function getTripsForDriver(driverId: string | null | undefined, trips: BackendTrip[]): BackendTrip[] {
  if (!driverId) return [];
  return trips.filter((trip) => (
    trip.driver_id === driverId || trip.assignment?.driver_id === driverId
  ));
}

function latestTripWithPlate(trips: BackendTrip[]): BackendTrip | null {
  const datedTrips = trips
    .filter((trip) => Boolean(trip.vehicle_plate))
    .map((trip) => ({ trip, time: tripTime(trip) }))
    .sort((a, b) => b.time - a.time);
  return datedTrips[0]?.trip ?? null;
}

function tripTime(trip: BackendTrip): number {
  const raw = trip.actual_start_at ?? trip.planned_start_at ?? trip.actual_end_at ?? trip.updated_at ?? trip.created_at;
  const parsed = raw ? Date.parse(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

function displayVehiclePlate(trip: BackendTrip | null): string {
  return formatVietnamesePlate(trip?.vehicle_plate) ?? "Unassigned";
}

export function formatVietnamesePlate(value: string | null | undefined): string | null {
  const raw = value?.trim().toUpperCase();
  if (!raw) return null;
  const compact = raw.replace(/[^0-9A-Z]/g, "");
  const match = compact.match(/^(\d{2})([A-Z]{1,2})(\d{3})(\d{2})$/);
  if (!match) return raw;
  return `${match[1]}${match[2]}-${match[3]}.${match[4]}`;
}

export interface SafetySummary {
  averageScore: number | null;
  scoredTrips: number;
  totalAlerts: number;
  criticalAlerts: number;
}

function tripSafetyScoreValue(trip: BackendTrip): number | null {
  const score = trip.safety_score;
  if (score && typeof score === "object") return score.score;
  const parsed = asNumber(score, NaN);
  return Number.isFinite(parsed) ? parsed : null;
}

export function buildSafetySummaryFromTrips(trips: BackendTrip[]): SafetySummary {
  const scores = trips
    .filter((trip) => trip.status === "completed")
    .map(tripSafetyScoreValue)
    .filter((score): score is number => score !== null);
  const averageScore = scores.length > 0
    ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
    : null;

  return {
    averageScore,
    scoredTrips: scores.length,
    totalAlerts: trips.reduce((sum, trip) => sum + asNumber(trip.total_alerts_count, 0), 0),
    criticalAlerts: trips.reduce((sum, trip) => sum + asNumber(trip.critical_alerts_count, 0), 0),
  };
}

export function normalizeBackendSettings(input: Partial<BackendSettings>): BackendSettings {
  const fallbackSoundCatalog: AlarmSoundOption[] = [
    { id: "classic", label: "Classic alarm", browser_path: "/alert.wav", runtime_path: "audio/alert.wav" },
    { id: "soft", label: "Soft chime", browser_path: "/alert-soft.wav", runtime_path: "audio/alert-soft.wav" },
    { id: "urgent", label: "Urgent pulse", browser_path: "/alert-urgent.wav", runtime_path: "audio/alert-urgent.wav" },
  ];
  const soundCatalog = Array.isArray(input.alarm_sound_catalog) && input.alarm_sound_catalog.length > 0
    ? input.alarm_sound_catalog
    : fallbackSoundCatalog;
  const soundId = asString(input.alarm_sound_id, asString(input.extra_config?.alarm_sound_id, "classic"));
  return {
    setting_id: input.setting_id,
    scope: input.scope,
    alarm_sound_id: soundCatalog.some((sound) => sound.id === soundId) ? soundId : "classic",
    alarm_sound_catalog: soundCatalog,
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
    warning_alert_penalty: 5,
    critical_alert_penalty: 10,
    safety_grade_a_min_score: asNumber(input.safety_grade_a_min_score, 80),
    safety_grade_b_min_score: asNumber(input.safety_grade_b_min_score, 60),
    extra_config: input.extra_config ?? {},
  };
}

interface JsonRequestInit {
  method?: string;
  body?: string;
  headers?: Record<string, string>;
}

export class BackendApiError extends Error {
  status: number;
  detail: string;
  path: string;

  constructor({ status, detail, path }: { status: number; detail: string; path: string }) {
    super(detail || `Backend request failed: ${status}`);
    this.name = "BackendApiError";
    this.status = status;
    this.detail = detail;
    this.path = path;
  }
}

function backendErrorDetail(input: unknown, fallback: string): string {
  if (input && typeof input === "object" && "detail" in input) {
    const detail = (input as { detail?: unknown }).detail;
    if (typeof detail === "string" && detail.trim() !== "") return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      return detail
        .map((item) => {
          if (item && typeof item === "object" && "msg" in item) {
            const message = (item as { msg?: unknown }).msg;
            return typeof message === "string" ? message : "";
          }
          return typeof item === "string" ? item : "";
        })
        .filter(Boolean)
        .join("; ") || fallback;
    }
  }
  return fallback;
}

async function requestJson<T>(path: string, init?: JsonRequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), API_REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}${path}`, {
      headers: apiHeaders(init?.headers),
      signal: controller.signal,
      ...init,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Backend request timed out. Check that the backend server is running.", { cause: error });
    }
    throw error;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
      window.dispatchEvent(new Event("drowsiness:unauthorized"));
    }
    let errorBody: unknown;
    try {
      errorBody = await response.json();
    } catch {
      errorBody = null;
    }
    throw new BackendApiError({
      status: response.status,
      detail: backendErrorDetail(errorBody, `Backend request failed: ${response.status}`),
      path,
    });
  }
  return (await response.json()) as T;
}

export async function loginUser(email: string, password: string): Promise<LoginResponse> {
  return requestJson<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  return requestJson<AuthUser>("/auth/me");
}

export async function fetchDrivers(): Promise<BackendDriver[]> {
  const data = await requestJson<{ drivers?: BackendDriver[] } | BackendDriver[]>("/drivers");
  return Array.isArray(data) ? data : data.drivers ?? [];
}

export async function fetchMyDriverProfile(): Promise<BackendDriver> {
  return requestJson<BackendDriver>("/drivers/me");
}

export async function createDriver(payload: {
  full_name: string;
  license_number: string;
  phone?: string;
  email: string;
  password: string;
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
    full_name?: string;
    license_number?: string;
    phone?: string;
    email?: string;
    status?: string;
  },
): Promise<{ success: boolean }> {
  return requestJson(`/drivers/${encodeURIComponent(driverId)}`, {
    method: "PATCH",
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

export async function fetchMyTrips(): Promise<BackendTrip[]> {
  const data = await requestJson<{ trips?: BackendTrip[] } | BackendTrip[]>("/trips/my");
  return Array.isArray(data) ? data : data.trips ?? [];
}

export async function fetchTrips(): Promise<BackendTrip[]> {
  const data = await requestJson<{ trips?: BackendTrip[] } | BackendTrip[]>("/trips");
  return Array.isArray(data) ? data : data.trips ?? [];
}

function compactOptionalTextPayload<T extends object>(payload: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(payload)
      .map(([key, value]) => [key, typeof value === "string" ? value.trim() : value])
      .filter(([, value]) => value !== undefined && value !== ""),
  ) as Partial<T>;
}

export async function startMyTrip(payload: StartMyTripPayload = {}): Promise<BackendTrip> {
  return requestJson<BackendTrip>("/trips/start-my-trip", {
    method: "POST",
    body: JSON.stringify(compactOptionalTextPayload(payload)),
  });
}

export function findActiveTrip(trips: BackendTrip[]): BackendTrip | null {
  return trips.find((trip) => trip.status === "in_progress") ?? null;
}

export function isDriverActiveTripConflict(error: unknown): boolean {
  return (
    error instanceof BackendApiError
    && error.status === 409
    && error.detail.toLocaleLowerCase().includes("driver already has an active trip")
  );
}

export async function startOrResumeMyTrip(payload: StartMyTripPayload = {}): Promise<StartMyTripResult> {
  const existingTrips = await fetchMyTrips();
  const existingActiveTrip = findActiveTrip(existingTrips);
  if (existingActiveTrip) {
    return { trip: existingActiveTrip, trips: existingTrips, resumed: true };
  }

  try {
    const trip = await startMyTrip(payload);
    return { trip, trips: [trip, ...existingTrips.filter((item) => item.trip_id !== trip.trip_id)], resumed: false };
  } catch (error) {
    if (!isDriverActiveTripConflict(error)) throw error;
    const recoveredTrips = await fetchMyTrips();
    const recoveredActiveTrip = findActiveTrip(recoveredTrips);
    if (recoveredActiveTrip) {
      return { trip: recoveredActiveTrip, trips: recoveredTrips, resumed: true };
    }
    throw error;
  }
}

export async function completeTrip(tripId: string): Promise<BackendTrip> {
  return requestJson<BackendTrip>(`/trips/${encodeURIComponent(tripId)}/complete`, {
    method: "POST",
  });
}

export async function fetchSafetyScore(tripId: string): Promise<SafetyScore> {
  return requestJson<SafetyScore>(`/trips/${encodeURIComponent(tripId)}/safety-score`);
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

export async function postMonitoringSnapshot(payload: BrowserMonitoringSnapshotPayload): Promise<BackendMonitoringSnapshot> {
  return requestJson<BackendMonitoringSnapshot>("/monitoring/snapshot", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function postMonitoringFrame(frameJpeg: Blob): Promise<{ ok: boolean; frame_seq: number }> {
  const token = apiAuthToken();
  const response = await fetch(`${apiBaseUrl()}/monitoring/frame`, {
    method: "POST",
    headers: {
      "Content-Type": "image/jpeg",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: frameJpeg,
  });
  if (!response.ok) {
    throw new BackendApiError({
      status: response.status,
      detail: `Monitoring frame publish failed: ${response.status}`,
      path: "/monitoring/frame",
    });
  }
  return (await response.json()) as { ok: boolean; frame_seq: number };
}

export function monitoringFrameUrl(frameTimestamp?: number): string {
  const suffix = frameTimestamp ? `?t=${encodeURIComponent(String(frameTimestamp))}` : "";
  return `${apiBaseUrl()}/monitoring/frame${suffix}`;
}

export function monitoringStreamUrl(): string {
  return `${apiBaseUrl()}/monitoring/stream`;
}

export function monitoringEventsUrl(): string {
  return `${apiBaseUrl()}/monitoring/events`;
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

export async function bulkIngestSafetyEvents(
  tripId: string,
  events: ClientSafetyEvent[],
): Promise<{ ingested: number; results: { event_id: string; ok: boolean; error?: string }[] }> {
  const payload = events.map((e) => ({ ...e, trip_id: tripId, source: "browser_cnn" }));
  return requestJson("/safety-events/bulk-ingest", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
