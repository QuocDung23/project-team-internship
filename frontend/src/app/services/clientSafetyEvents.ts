import type { ClientSafetyEvent, MonitoringAlert } from "../types/monitoring";

function eventTitle(eventType: ClientSafetyEvent["event_type"]): string {
  switch (eventType) {
    case "drowsiness_detected":
      return "Buồn ngủ / mắt nhắm";
    case "yawning_detected":
      return "Ngáp";
    case "head_nodding_detected":
      return "Gật đầu / mất tư thế đầu";
  }
}

function eventSeverity(severity: ClientSafetyEvent["severity"]): MonitoringAlert["severity"] {
  return severity === "high" ? "critical" : "warn";
}

function eventTimestamp(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function eventDetail(event: ClientSafetyEvent): string {
  const parts = [`CNN ${Math.round(event.confidence * 100)}%`];
  const { ear_value, mar_value, pitch_value } = event.details;

  if (typeof ear_value === "number") parts.push(`EAR ${ear_value.toFixed(3)}`);
  if (typeof mar_value === "number") parts.push(`MAR ${mar_value.toFixed(3)}`);
  if (typeof pitch_value === "number") parts.push(`Pitch ${pitch_value.toFixed(1)}°`);

  return parts.join(" · ");
}

export function mapClientSafetyEventToMonitorAlert(event: ClientSafetyEvent): MonitoringAlert {
  return {
    id: event.event_id,
    ts: eventTimestamp(event.occurred_at),
    severity: eventSeverity(event.severity),
    title: eventTitle(event.event_type),
    detail: eventDetail(event),
  };
}
