export type MetricKind = "ear" | "mar" | "pitch";
export type MetricStatus = "active" | "warn" | "critical";

export interface MetricSample {
  ts: number;
  value: number;
}

export interface MetricSeries {
  kind: MetricKind;
  unit: string;
  samples: MetricSample[];
}

export interface DriverSnapshot {
  ts: number;
  ear: number;
  mar: number;
  pitch: number;
  fps: number | null;
  dwsScore: number;
  status: MetricStatus;
  eyesOpen: boolean;
  mouthClosed: boolean;
  faceDetected: boolean;
  earAlert: boolean;
  marAlert: boolean;
  poseAlert: boolean;
  alarmOn: boolean;
  drowsinessWarningActive: boolean;
  yawnWarningActive: boolean;
}

export interface MonitoringAlert {
  id: string;
  ts: number;
  severity: "warn" | "critical";
  titleKey: MonitoringEventKey;
  detail: string;
}

export type MonitoringEventKey =
  | "monitoring.eventTitle.drowsiness"
  | "monitoring.eventTitle.yawning"
  | "monitoring.eventTitle.headNodding";

export const EVENT_TITLE_TRANSLATION_KEYS = {
  drowsiness_detected: "monitoring.eventTitle.drowsiness",
  yawning_detected: "monitoring.eventTitle.yawning",
  head_nodding_detected: "monitoring.eventTitle.headNodding",
} as const satisfies Record<ClientSafetyEvent["event_type"], MonitoringEventKey>;

export const MONITORING_SEVERITY_TRANSLATION_KEYS = {
  warn: "monitoring.severity.warn",
  critical: "monitoring.severity.critical",
} as const satisfies Record<MonitoringAlert["severity"], string>;

export type MonitoringSeries = Record<MetricKind, MetricSeries>;

export function emptyMonitoringSeries(): MonitoringSeries {
  return {
    ear: { kind: "ear", unit: "", samples: [] },
    mar: { kind: "mar", unit: "", samples: [] },
    pitch: { kind: "pitch", unit: "deg", samples: [] },
  };
}

export function bucket(value: number, warn: number, critical: number): MetricStatus {
  if (value <= critical) return "critical";
  if (value <= warn) return "warn";
  return "active";
}

export function bucketReverse(value: number, warn: number, critical: number): MetricStatus {
  if (value >= critical) return "critical";
  if (value >= warn) return "warn";
  return "active";
}

export function bucketAbs(value: number, warn: number, critical: number): MetricStatus {
  const abs = Math.abs(value);
  if (abs >= critical) return "critical";
  if (abs >= warn) return "warn";
  return "active";
}

export function overall(s: DriverSnapshot): MetricStatus {
  if (s.earAlert || s.marAlert || s.poseAlert || !s.faceDetected) return "critical";
  return "active";
}

export type MonitoringStatusKey =
  | "monitoring.status.active"
  | "monitoring.status.warn"
  | "monitoring.status.critical";

export const MONITORING_STATUS_KEYS: Record<MetricStatus, MonitoringStatusKey> = {
  active: "monitoring.status.active",
  warn: "monitoring.status.warn",
  critical: "monitoring.status.critical",
} as const;

export function statusWord(s: MetricStatus): MonitoringStatusKey {
  switch (s) {
    case "active":
      return "monitoring.status.active";
    case "warn":
      return "monitoring.status.warn";
    case "critical":
      return "monitoring.status.critical";
  }
}

export function dwsStatusFn(score: number): MetricStatus {
  if (score >= 70) return "critical";
  if (score >= 30) return "warn";
  return "active";
}

export function dwsLabelFn(score: number): MonitoringStatusKey {
  if (score >= 70) return "monitoring.status.critical";
  if (score >= 30) return "monitoring.status.warn";
  return "monitoring.status.active";
}

export interface ClientSafetyEvent {
  event_id: string;
  event_type: "drowsiness_detected" | "yawning_detected" | "head_nodding_detected";
  severity: "medium" | "high";
  occurred_at: string;
  confidence: number;
  duration_ms: number;
  details: {
    ear_value?: number;
    mar_value?: number;
    pitch_value?: number;
    cnn_label?: string;
    consecutive_frame_count?: number;
  };
}
