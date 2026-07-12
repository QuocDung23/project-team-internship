import assert from "node:assert/strict";
import test from "node:test";

import { mapClientSafetyEventToMonitorAlert } from "../src/app/services/clientSafetyEvents.ts";

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
  assert.equal(alert.title, "Buồn ngủ / mắt nhắm");
  assert.match(alert.detail, /CNN 92%/);
  assert.match(alert.detail, /EAR 0.123/);
  assert.match(alert.detail, /MAR 0.456/);
  assert.match(alert.detail, /Pitch 12.3°/);
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
  assert.equal(alert.title, "Ngáp");
  assert.match(alert.detail, /CNN 80%/);
  assert.match(alert.detail, /MAR 0.711/);
  assert.doesNotMatch(alert.detail, /EAR/);
  assert.doesNotMatch(alert.detail, /Pitch/);
});

test("maps head nodding client event title", () => {
  const alert = mapClientSafetyEventToMonitorAlert({
    ...baseEvent,
    event_type: "head_nodding_detected",
    severity: "medium",
  });

  assert.equal(alert.title, "Gật đầu / mất tư thế đầu");
});
