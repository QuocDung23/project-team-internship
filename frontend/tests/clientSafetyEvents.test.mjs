import assert from "node:assert/strict";
import test from "node:test";

import {
  buildLiveMonitoringAlerts,
  mapClientSafetyEventToMonitorAlert,
} from "../src/app/services/clientSafetyEvents.ts";

test("live drowsiness aggregation follows zero warning critical flow", () => {
  const first = {
    ...baseEvent,
    event_id: "drowsy-1",
    severity: "medium",
    occurred_at: "2026-07-12T08:15:00.000Z",
  };
  const second = {
    ...baseEvent,
    event_id: "drowsy-2",
    severity: "medium",
    occurred_at: "2026-07-12T08:15:10.000Z",
  };
  const third = {
    ...baseEvent,
    event_id: "drowsy-3",
    severity: "medium",
    occurred_at: "2026-07-12T08:15:30.000Z",
  };

  assert.deepEqual(buildLiveMonitoringAlerts([first]), []);

  const warningAlerts = buildLiveMonitoringAlerts([first, second]);
  assert.equal(warningAlerts.length, 1);
  assert.equal(warningAlerts[0].id, "drowsiness-warning-drowsy-2");
  assert.equal(warningAlerts[0].severity, "warn");

  const criticalAlerts = buildLiveMonitoringAlerts([first, second, third]);
  assert.equal(criticalAlerts.length, 1);
  assert.equal(criticalAlerts[0].id, "drowsiness-critical-drowsy-3");
  assert.equal(criticalAlerts[0].severity, "critical");
});

test("live monitoring shows yawning notification only after two yawns within 20 seconds", () => {
  const firstYawn = {
    ...baseEvent,
    event_id: "yawn-1",
    event_type: "yawning_detected",
    severity: "medium",
    occurred_at: "2026-07-12T08:15:00.000Z",
  };
  const secondYawn = {
    ...baseEvent,
    event_id: "yawn-2",
    event_type: "yawning_detected",
    severity: "medium",
    occurred_at: "2026-07-12T08:15:10.000Z",
  };

  assert.deepEqual(buildLiveMonitoringAlerts([firstYawn]), []);

  const alerts = buildLiveMonitoringAlerts([firstYawn, secondYawn]);

  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].id, "yawning-warning-yawn-2");
  assert.equal(alerts[0].severity, "warn");
  assert.equal(alerts[0].titleKey, "monitoring.eventTitle.yawning");
});

test("live monitoring does not show yawning notification outside 20 seconds", () => {
  const firstYawn = {
    ...baseEvent,
    event_id: "yawn-1",
    event_type: "yawning_detected",
    severity: "medium",
    occurred_at: "2026-07-12T08:15:00.000Z",
  };
  const secondYawn = {
    ...baseEvent,
    event_id: "yawn-2",
    event_type: "yawning_detected",
    severity: "medium",
    occurred_at: "2026-07-12T08:15:21.000Z",
  };

  assert.deepEqual(buildLiveMonitoringAlerts([firstYawn, secondYawn]), []);
});

test("live drowsiness aggregation leaves head nodding alerts independent", () => {
  const first = {
    ...baseEvent,
    event_id: "drowsy-1",
    severity: "medium",
    occurred_at: "2026-07-12T08:15:00.000Z",
  };
  const second = {
    ...baseEvent,
    event_id: "drowsy-2",
    severity: "medium",
    occurred_at: "2026-07-12T08:15:10.000Z",
  };
  const headNod = {
    ...baseEvent,
    event_id: "head-1",
    event_type: "head_nodding_detected",
    severity: "medium",
    occurred_at: "2026-07-12T08:15:14.000Z",
  };

  const alerts = buildLiveMonitoringAlerts([first, second, headNod]);

  assert.equal(alerts.length, 2);
  assert.equal(alerts[0].id, "drowsiness-warning-drowsy-2");
  assert.equal(alerts[1].id, "head-1");
});

const baseEvent = {
  event_id: "event-1",
  event_type: "drowsiness_detected",
  severity: "high",
  occurred_at: "2026-07-12T08:15:30.000Z",
  confidence: 0.92,
  duration_ms: 600,
  details: {
    ear_value: 0.123,
    mar_value: 0.456,
    pitch_value: 12.3,
    cnn_label: "closed",
    consecutive_frame_count: 9,
  },
};

test("maps drowsiness client event to compact monitoring alert", () => {
  const alert = mapClientSafetyEventToMonitorAlert(baseEvent);

  assert.equal(alert.id, "event-1");
  assert.equal(alert.ts, Date.parse("2026-07-12T08:15:30.000Z"));
  assert.equal(alert.severity, "critical");
  assert.equal(alert.titleKey, "monitoring.eventTitle.drowsiness");
  assert.equal(alert.detailKey, "monitoring.detail.drowsiness");
  assert.equal(alert.detail, "");
});

test("maps medium client event to warning severity and omits unavailable metrics", () => {
  const alert = mapClientSafetyEventToMonitorAlert({
    ...baseEvent,
    event_id: "event-2",
    event_type: "yawning_detected",
    severity: "medium",
    confidence: 0.8,
    details: {
      mar_value: 0.711,
    },
  });

  assert.equal(alert.severity, "warn");
  assert.equal(alert.titleKey, "monitoring.eventTitle.yawning");
  assert.equal(alert.detailKey, "monitoring.detail.yawning");
  assert.equal(alert.detail, "");
});

test("maps head nodding client event title", () => {
  const alert = mapClientSafetyEventToMonitorAlert({
    ...baseEvent,
    event_type: "head_nodding_detected",
    severity: "medium",
  });

  assert.equal(alert.titleKey, "monitoring.eventTitle.headNodding");
});
