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
  title: string;
  detail: string;
}

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

export function statusWord(s: MetricStatus): string {
  switch (s) {
    case "active":
      return "Binh thuong";
    case "warn":
      return "Can chu y";
    case "critical":
      return "Nguy hiem";
  }
}

export function dwsStatusFn(score: number): MetricStatus {
  if (score >= 70) return "critical";
  if (score >= 30) return "warn";
  return "active";
}

export function dwsLabelFn(score: number): string {
  if (score >= 70) return "Nguy hiem";
  if (score >= 30) return "Can chu y";
  return "Binh thuong";
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
