import assert from "node:assert/strict";
import test from "node:test";

import {
  acknowledgeAlert,
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
  const event = mapBackendAlertToFleetEvent({
    ...backendAlert,
    driver_id: "driver-1",
    driver_name: "Driver One",
    license_number: "LIC-001",
  });

  assert.equal(event.id, "alert-1");
  assert.equal(event.type, "drowsiness_alert");
  assert.equal(event.severity, "critical");
  assert.equal(event.ear, 0.123);
  assert.equal(event.acknowledged, false);
  assert.equal(event.driverId, "driver-1");
  assert.equal(event.driverName, "Driver One");
  assert.equal(event.licensePlate, "LIC-001");
});

test("maps acknowledged backend alert status to fleet event", () => {
  const event = mapBackendAlertToFleetEvent({
    ...backendAlert,
    status: "acknowledged",
  });

  assert.equal(event.acknowledged, true);
});

test("shows browser CNN alerts with a driver-friendly source label", () => {
  const event = mapBackendAlertToFleetEvent({
    ...backendAlert,
    detection_method: "browser_cnn",
  });

  assert.equal(event.location, "Detected via AI camera");
});

test("maps acknowledged tuple alert rows from the current FastAPI response", () => {
  const event = mapBackendAlertToFleetEvent([
    "alert-ack",
    "trip-1",
    "driver-1",
    "drowsiness",
    "warning",
    "cnn_classifier",
    0.2,
    9,
    0.61,
    "closed",
    null,
    null,
    null,
    false,
    null,
    true,
    "2026-07-05T10:21:35Z",
    "2026-07-05T10:21:30Z",
    "2026-07-05T10:21:31Z",
  ]);

  assert.equal(event.id, "alert-ack");
  assert.equal(event.acknowledged, true);
});

test("maps backend detector alert to monitoring alert", () => {
  const alert = mapBackendAlertToMonitorAlert({
    ...backendAlert,
    alert_type: "head_nod",
    severity: "warning",
  });

  assert.equal(alert.id, "alert-1");
  assert.equal(alert.severity, "warn");
  assert.equal(alert.title, "Head Nod / Loss of Head Position");
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

test("maps canonical backend alert types from safety event ingestion", () => {
  const drowsiness = mapBackendAlertToFleetEvent({
    ...backendAlert,
    alert_type: "drowsiness",
    severity: "high",
  });
  const inattention = mapBackendAlertToMonitorAlert({
    ...backendAlert,
    alert_type: "driver_inattention",
  });
  const camera = mapBackendAlertToFleetEvent({
    ...backendAlert,
    alert_type: "camera_issue",
  });

  assert.equal(drowsiness.type, "drowsiness_alert");
  assert.equal(drowsiness.severity, "critical");
  assert.equal(inattention.title, "Head Nod / Loss of Head Position");
  assert.equal(camera.type, "distraction_alert");
});

test("acknowledgeAlert sends PATCH and normalizes response", async () => {
  let request;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    request = { url, init };
    return new Response(JSON.stringify({ ...backendAlert, status: "acknowledged" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const alert = await acknowledgeAlert("alert-1");
    assert.equal(alert.acknowledged, true);
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(request.url, "/api/v1/alerts/alert-1/acknowledge");
  assert.equal(request.init.method, "PATCH");
});
