import type { FleetAlertEvent } from "../types/alerts";
import type { MonitoringAlert } from "../types/monitoring";
import { apiBaseUrl, apiHeaders, TOKEN_STORAGE_KEY } from "./backendApi.ts";

export interface BackendAlert {
  alert_id: string;
  trip_id?: string;
  driver_id?: string;
  driver_name?: string | null;
  driver_email?: string | null;
  license_number?: string | null;
  alert_type: string;
  status?: string;
  acknowledged?: boolean;
  acknowledged_at?: string | null;
  detection_method: string;
  severity: string;
  ear_value?: number | null;
  consecutive_frame_count?: number | null;
  cnn_confidence?: number | null;
  cnn_label?: string | null;
  alarm_triggered?: boolean | null;
  occurred_at?: string | null;
}

export type BackendAlertInput = BackendAlert | unknown[];

export interface AlertQuery {
  tripId?: string;
  driverId?: string;
  severity?: string;
  alertType?: string;
  status?: string;
}

function apiEnv(name: string): string | undefined {
  return import.meta.env?.[name];
}

export function getActiveTripId(): string {
  return apiEnv("VITE_ACTIVE_TRIP_ID")?.trim() ?? "";
}

export function getAlertPollMs(): number {
  const raw = Number(apiEnv("VITE_ALERT_POLL_MS"));
  return Number.isFinite(raw) && raw > 0 ? raw : 2200;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() !== "" ? value : fallback;
}

function asBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.trim().toLowerCase() === "true";
  return Boolean(value);
}

function isAcknowledged(alert: Pick<BackendAlert, "acknowledged" | "status">): boolean {
  if (typeof alert.acknowledged === "boolean") return alert.acknowledged;
  return alert.status === "acknowledged" || alert.status === "resolved";
}

export function normalizeBackendAlert(input: BackendAlertInput): BackendAlert {
  if (Array.isArray(input)) {
    if (input.length >= 18) {
      const acknowledged = asBoolean(input[15]);
      return {
        alert_id: asString(input[0], "alert"),
        trip_id: asString(input[1]) || undefined,
        driver_id: asString(input[2]) || undefined,
        alert_type: asString(input[3], "distraction"),
        severity: asString(input[4], "warning"),
        detection_method: asString(input[5], "cnn_classifier"),
        ear_value: asNumber(input[6]),
        consecutive_frame_count: asNumber(input[7]),
        cnn_confidence: asNumber(input[8]),
        cnn_label: asString(input[9]) || null,
        alarm_triggered: Boolean(input[13]),
        acknowledged,
        acknowledged_at: asString(input[16]) || null,
        occurred_at: asString(input[17]) || null,
        driver_name: asString(input[19]) || null,
        driver_email: asString(input[20]) || null,
        license_number: asString(input[21]) || null,
      };
    }

    return {
      alert_id: asString(input[0], "alert"),
      alert_type: asString(input[1], "distraction"),
      detection_method: asString(input[2], "cnn_classifier"),
      severity: asString(input[3], "warning"),
      ear_value: asNumber(input[4]),
      consecutive_frame_count: asNumber(input[5]),
      cnn_confidence: asNumber(input[6]),
      cnn_label: asString(input[7]) || null,
      alarm_triggered: Boolean(input[8]),
      acknowledged: false,
      occurred_at: asString(input[9]) || null,
    };
  }

  return {
    ...input,
    acknowledged: isAcknowledged(input),
  };
}

function fleetType(alertType: string): FleetAlertEvent["type"] {
  if (
    alertType === "drowsiness"
    || alertType === "drowsy_cnn"
    || alertType === "drowsiness_detected"
    || alertType === "eyes_closed"
  ) {
    return "drowsiness_alert";
  }
  if (alertType === "yawning" || alertType === "yawning_detected") return "yawn_alert";
  if (
    alertType === "driver_inattention"
    || alertType === "camera_issue"
    || alertType === "head_nod"
    || alertType === "head_nodding_detected"
    || alertType === "no_face_detected"
  ) {
    return "distraction_alert";
  }
  return "distraction_alert";
}

function severity(value: string): "warn" | "critical" {
  return value === "critical" || value === "high" ? "critical" : "warn";
}

function timestamp(value?: string | null): number {
  const parsed = value ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function alertTitle(alertType: string): string {
  switch (alertType) {
    case "drowsiness":
    case "drowsiness_detected":
    case "drowsy_cnn":
    case "eyes_closed":
      return "Buồn ngủ / mắt nhắm";
    case "yawning":
    case "yawning_detected":
      return "Ngáp";
    case "driver_inattention":
    case "head_nod":
    case "head_nodding_detected":
      return "Gật đầu / mất tư thế đầu";
    case "camera_issue":
    case "no_face_detected":
      return "Không phát hiện khuôn mặt";
    default:
      return "Cảnh báo mất tập trung";
  }
}

function alertDetail(alert: BackendAlert): string {
  const parts: string[] = [];
  if (typeof alert.ear_value === "number") {
    parts.push(`EAR ${alert.ear_value.toFixed(3)}`);
  }
  if (typeof alert.consecutive_frame_count === "number") {
    parts.push(`${alert.consecutive_frame_count} khung hình`);
  }
  if (typeof alert.cnn_confidence === "number") {
    parts.push(`CNN ${Math.round(alert.cnn_confidence * 100)}%`);
  }
  if (alert.alarm_triggered) parts.push("đã phát cảnh báo âm thanh");
  return parts.length > 0 ? parts.join(" · ") : alert.detection_method;
}

function detectionMethodLabel(value: string): string {
  switch (value) {
    case "browser_cnn":
      return "Phát hiện qua camera AI";
    default:
      return value;
  }
}

export function mapBackendAlertToFleetEvent(
  input: BackendAlertInput,
): FleetAlertEvent {
  const alert = normalizeBackendAlert(input);
  return {
    id: alert.alert_id,
    type: fleetType(alert.alert_type),
    driverId: alert.driver_id ?? alert.trip_id ?? "unknown-driver",
    driverName: alert.driver_name ?? alert.driver_email ?? "Unknown driver",
    licensePlate: alert.license_number ?? "No license",
    ear: alert.ear_value ?? 0,
    timestamp: timestamp(alert.occurred_at),
    acknowledged: isAcknowledged(alert),
    severity: severity(alert.severity),
    location: detectionMethodLabel(alert.detection_method),
  };
}

export function mapBackendAlertToMonitorAlert(
  input: BackendAlertInput,
): MonitoringAlert {
  const alert = normalizeBackendAlert(input);
  return {
    id: alert.alert_id,
    ts: timestamp(alert.occurred_at),
    severity: severity(alert.severity),
    title: alertTitle(alert.alert_type),
    detail: alertDetail(alert),
  };
}

export async function fetchTripAlerts(tripId: string): Promise<BackendAlert[]> {
  return fetchAlerts({ tripId });
}

export async function acknowledgeAlert(alertId: string): Promise<BackendAlert> {
  const response = await fetch(`${apiBaseUrl()}/alerts/${encodeURIComponent(alertId)}/acknowledge`, {
    method: "PATCH",
    headers: apiHeaders(),
  });
  if (!response.ok) {
    if (response.status === 401) {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
      window.dispatchEvent(new Event("drowsiness:unauthorized"));
    }
    throw new Error(`Failed to acknowledge alert: ${response.status}`);
  }
  return normalizeBackendAlert(await response.json());
}

export async function fetchAlerts(query: AlertQuery = {}): Promise<BackendAlert[]> {
  const params = new URLSearchParams();
  if (query.tripId) params.set("trip_id", query.tripId);
  if (query.driverId) params.set("driver_id", query.driverId);
  if (query.severity && query.severity !== "all") params.set("severity", query.severity);
  if (query.alertType && query.alertType !== "all") params.set("alert_type", query.alertType);
  if (query.status && query.status !== "all") params.set("status", query.status);

  const suffix = params.toString() ? `?${params.toString()}` : "";
  const response = await fetch(`${apiBaseUrl()}/alerts${suffix}`, { headers: apiHeaders() });
  if (!response.ok) {
    if (response.status === 401) {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
      window.dispatchEvent(new Event("drowsiness:unauthorized"));
    }
    throw new Error(`Failed to load alerts: ${response.status}`);
  }
  const rows = (await response.json()) as BackendAlertInput[];
  return rows.map(normalizeBackendAlert);
}
