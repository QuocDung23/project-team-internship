import type { FleetAlertEvent, FleetEventSeverity, FleetEventType } from "../types/alerts";
import type { MonitoringAlert, MonitoringEventKey } from "../types/monitoring";
import { apiBaseUrl, apiHeaders, TOKEN_STORAGE_KEY } from "./backendApi.ts";

/**
 * Stable detection-method codes returned by the backend. Components render
 * the user-facing string from `alerts.json` (e.g. `source.browserCnn`).
 * Unknown values pass through as the raw code so the UI can show a generic
 * `source.unknown` label without leaking the payload text.
 */
export type DetectionMethodCode = string;

/**
 * Stable alert-type codes recognized by the UI. Components render the
 * user-facing string from `alerts.json` (e.g. `type.drowsiness`).
 * Unknown backend values fall back to `distraction_alert` and the original
 * code is preserved in `rawType` for diagnostics.
 */
export type BackendAlertTypeCode = string;

export interface BackendAlert {
  alert_id: string;
  trip_id?: string;
  driver_id?: string;
  driver_name?: string | null;
  driver_email?: string | null;
  license_number?: string | null;
  alert_type: BackendAlertTypeCode;
  raw_alert_type?: BackendAlertTypeCode | null;
  status?: string;
  acknowledged?: boolean;
  acknowledged_at?: string | null;
  detection_method: DetectionMethodCode;
  severity: string;
  ear_value?: number | null;
  consecutive_frame_count?: number | null;
  cnn_confidence?: number | null;
  cnn_label?: string | null;
  captured_frame_path?: string | null;
  alarm_triggered?: boolean | null;
  occurred_at?: string | null;
}

/**
 * Neutral payload parts produced by the monitoring mapper. The component
 * owning the rendered string (currently the legacy monitoring view) maps
 * each part to a translation key. The mapper never concatenates
 * language-specific sentences.
 */
export interface MonitoringAlertPayloadParts {
  typeKey: BackendAlertTypeCode;
  rawType: BackendAlertTypeCode | null;
  detectionMethod: DetectionMethodCode;
  ear: number | null;
  frames: number | null;
  confidencePercent: number | null;
  alarmTriggered: boolean;
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

function normalizeRawType(alertType: unknown): BackendAlertTypeCode {
  return typeof alertType === "string" && alertType.trim() !== ""
    ? alertType.trim().toLowerCase()
    : "";
}

export function normalizeBackendAlert(input: BackendAlertInput): BackendAlert {
  if (Array.isArray(input)) {
    if (input.length >= 18) {
      const acknowledged = asBoolean(input[15]);
      return {
        alert_id: asString(input[0], "alert"),
        trip_id: asString(input[1]) || undefined,
        driver_id: asString(input[2]) || undefined,
        alert_type: normalizeRawType(input[3]) || "distraction",
        raw_alert_type: normalizeRawType(input[3]) || null,
        severity: asString(input[4], "warning"),
        detection_method: asString(input[5], "cnn_classifier"),
        ear_value: asNumber(input[6]),
        consecutive_frame_count: asNumber(input[7]),
        cnn_confidence: asNumber(input[8]),
        cnn_label: asString(input[9]) || null,
        captured_frame_path: asString(input[10]) || null,
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
      alert_type: normalizeRawType(input[1]) || "distraction",
      raw_alert_type: normalizeRawType(input[1]) || null,
      detection_method: asString(input[2], "cnn_classifier"),
      severity: asString(input[3], "warning"),
      ear_value: asNumber(input[4]),
      consecutive_frame_count: asNumber(input[5]),
      cnn_confidence: asNumber(input[6]),
      cnn_label: asString(input[7]) || null,
      captured_frame_path: null,
      alarm_triggered: Boolean(input[8]),
      acknowledged: false,
      occurred_at: asString(input[9]) || null,
    };
  }

  return {
    ...input,
    alert_type: normalizeRawType(input.alert_type) || (input.alert_type ?? ""),
    raw_alert_type: normalizeRawType(input.alert_type) || null,
    acknowledged: isAcknowledged(input),
  };
}

function fleetType(alertType: BackendAlertTypeCode): FleetEventType {
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

function severity(value: string): FleetEventSeverity {
  return value === "critical" || value === "high" ? "critical" : "warn";
}

function timestamp(value?: string | null): number {
  const parsed = value ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function detectionMethodCode(value: string | null | undefined): DetectionMethodCode {
  if (typeof value !== "string") return "cnn_classifier";
  const normalized = value.trim().toLowerCase();
  return normalized === "" ? "cnn_classifier" : normalized;
}

function monitoringEventKey(alertType: BackendAlertTypeCode): MonitoringEventKey {
  if (alertType === "yawning" || alertType === "yawning_detected") {
    return "monitoring.eventTitle.yawning";
  }
  if (
    alertType === "head_nod"
    || alertType === "head_nodding_detected"
    || alertType === "driver_inattention"
    || alertType === "camera_issue"
    || alertType === "no_face_detected"
  ) {
    return "monitoring.eventTitle.headNodding";
  }
  return "monitoring.eventTitle.drowsiness";
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
    location: detectionMethodCode(alert.detection_method),
    cnnConfidence: alert.cnn_confidence ?? null,
    cnnLabel: alert.cnn_label ?? null,
    alarmTriggered: Boolean(alert.alarm_triggered),
    capturedFramePath: alert.captured_frame_path ?? null,
    rawType: alert.raw_alert_type ?? alert.alert_type,
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
    titleKey: monitoringEventKey(alert.alert_type),
    detail: JSON.stringify({
      typeKey: alert.alert_type,
      rawType: alert.raw_alert_type ?? null,
      detectionMethod: detectionMethodCode(alert.detection_method),
      ear: alert.ear_value ?? null,
      frames: alert.consecutive_frame_count ?? null,
      confidencePercent: typeof alert.cnn_confidence === "number"
        ? Math.round(alert.cnn_confidence * 100)
        : null,
      alarmTriggered: Boolean(alert.alarm_triggered),
    } satisfies MonitoringAlertPayloadParts),
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
