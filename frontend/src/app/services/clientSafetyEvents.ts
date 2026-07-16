import {
  EVENT_DETAIL_TRANSLATION_KEYS,
  EVENT_TITLE_TRANSLATION_KEYS,
  type ClientSafetyEvent,
  type MonitoringAlert,
} from "../types/monitoring/index.ts";

const DROWSINESS_PAIR_WINDOW_MS = 30_000;
const DROWSINESS_ESCALATION_WINDOW_MS = 60_000;
const YAWNING_PAIR_WINDOW_MS = 20_000;

function eventSeverity(severity: ClientSafetyEvent["severity"]): MonitoringAlert["severity"] {
  return severity === "high" ? "critical" : "warn";
}

function eventTimestamp(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Date.now();
}

export function mapClientSafetyEventToMonitorAlert(event: ClientSafetyEvent): MonitoringAlert {
  return {
    id: event.event_id,
    ts: eventTimestamp(event.occurred_at),
    severity: eventSeverity(event.severity),
    titleKey: EVENT_TITLE_TRANSLATION_KEYS[event.event_type],
    detailKey: EVENT_DETAIL_TRANSLATION_KEYS[event.event_type],
    detail: "",
  };
}

interface DrowsinessWarningState {
  first: ClientSafetyEvent;
  second: ClientSafetyEvent;
  alertId: string;
}

export function buildLiveMonitoringAlerts(events: ClientSafetyEvent[]): MonitoringAlert[] {
  const alerts: MonitoringAlert[] = [];
  let pendingDrowsiness: ClientSafetyEvent[] = [];
  let pendingYawning: ClientSafetyEvent[] = [];
  let warning: DrowsinessWarningState | null = null;

  for (const event of events) {
    if (event.event_type === "yawning_detected") {
      const eventTs = eventTimestamp(event.occurred_at);
      pendingYawning.push(event);
      pendingYawning = pendingYawning.filter(
        (candidate) => eventTs - eventTimestamp(candidate.occurred_at) <= YAWNING_PAIR_WINDOW_MS,
      );

      if (pendingYawning.length >= 2) {
        const second = pendingYawning[1]!;
        alerts.push(mapClientSafetyEventToMonitorAlert(withSeverity(second, "medium", `yawning-warning-${second.event_id}`)));
        pendingYawning = pendingYawning.slice(2);
      }
      continue;
    }

    if (event.event_type !== "drowsiness_detected") {
      alerts.push(mapClientSafetyEventToMonitorAlert(event));
      continue;
    }

    const eventTs = eventTimestamp(event.occurred_at);
    if (warning) {
      const firstTs = eventTimestamp(warning.first.occurred_at);
      if (eventTs - firstTs <= DROWSINESS_ESCALATION_WINDOW_MS) {
        const warningAlertId = warning.alertId;
        const warningIndex = alerts.findIndex((alert) => alert.id === warningAlertId);
        if (warningIndex >= 0) alerts.splice(warningIndex, 1);
        alerts.push(
          mapClientSafetyEventToMonitorAlert(withSeverity(event, "high", `drowsiness-critical-${event.event_id}`)),
        );
        warning = null;
        pendingDrowsiness = [];
        continue;
      }

      warning = null;
    }

    pendingDrowsiness.push(event);
    pendingDrowsiness = pendingDrowsiness.filter(
      (candidate) => eventTs - eventTimestamp(candidate.occurred_at) <= DROWSINESS_PAIR_WINDOW_MS,
    );

    if (pendingDrowsiness.length >= 2) {
      const first = pendingDrowsiness[0]!;
      const second = pendingDrowsiness[1]!;
      const alertEvent = withSeverity(second, "medium", `drowsiness-warning-${second.event_id}`);
      const alert = mapClientSafetyEventToMonitorAlert(alertEvent);
      alerts.push(alert);
      warning = { first, second, alertId: alert.id };
      pendingDrowsiness = pendingDrowsiness.slice(2);
    }
  }

  return alerts;
}

function withSeverity(
  event: ClientSafetyEvent,
  severity: ClientSafetyEvent["severity"],
  eventId: string,
): ClientSafetyEvent {
  return {
    ...event,
    event_id: eventId,
    severity,
  };
}
