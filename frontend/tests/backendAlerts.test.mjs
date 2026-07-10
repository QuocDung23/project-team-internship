import assert from "node:assert/strict";
import test from "node:test";

import {
  mapBackendAlertToFleetEvent,
  mapBackendAlertToMonitorAlert,
} from "../src/app/services/backendAlerts.ts";

const backendAlert = {
  alert_id: "alert-1",
  trip_id: "trip-1",
  alert_type: "drowsy_cnn",
  severity: "critical",
  detection_method: "cnn_classifier",
  ear_value: 0.123,
  consecutive_frame_count: 22,
  cnn_confidence: 0.93,
  cnn_label: "closed",
  alarm_triggered: true,
  occurred_at: "2026-07-05T10:20:30Z",
};

test("maps backend detector alert to fleet event", () => {
  const event = mapBackendAlertToFleetEvent(backendAlert);

  assert.equal(event.id, "alert-1");
  assert.equal(event.type, "drowsiness_alert");
  assert.equal(event.severity, "critical");
  assert.equal(event.ear, 0.123);
  assert.equal(event.acknowledged, false);
});

test("maps backend detector alert to monitoring alert", () => {
  const alert = mapBackendAlertToMonitorAlert({
    ...backendAlert,
    alert_type: "head_nod",
    severity: "warning",
  });

  assert.equal(alert.id, "alert-1");
  assert.equal(alert.severity, "warn");
  assert.equal(alert.title, "Gật đầu / mất tư thế đầu");
  assert.match(alert.detail, /CNN 93%/);
});

test("maps backend tuple alert rows from the current FastAPI response", () => {
  const event = mapBackendAlertToFleetEvent([
    "alert-2",
    "yawning",
    "cnn_classifier",
    "warning",
    0.2,
    9,
    0.61,
    "closed",
    false,
    "2026-07-05T10:21:30Z",
  ]);

  assert.equal(event.id, "alert-2");
  assert.equal(event.type, "yawn_alert");
  assert.equal(event.severity, "warn");
  assert.equal(event.timestamp, Date.parse("2026-07-05T10:21:30Z"));
});
