import assert from "node:assert/strict";
import test from "node:test";

import {
  createBrowserDetectionState,
  displayPitch,
  processDetectionSample,
} from "../src/app/hook/browserDetectionLogic.ts";

function sample(state, overrides) {
  return processDetectionSample(state, {
    now: 0,
    ear: 0.32,
    mar: 0.2,
    rawPitch: 0,
    faceDetected: true,
    ...overrides,
  });
}

test("eye closure under 2 seconds does not activate warning or emit event", () => {
  const state = createBrowserDetectionState();

  sample(state, { now: 0, ear: 0.12 });
  const decision = sample(state, { now: 1_999, ear: 0.12 });

  assert.equal(decision.drowsinessWarningActive, false);
  assert.equal(decision.alarmOn, false);
  assert.deepEqual(decision.events, []);
});

test("eye closure at 2 seconds activates warning until eyes reopen", () => {
  const state = createBrowserDetectionState();

  sample(state, { now: 0, ear: 0.12 });
  const active = sample(state, { now: 2_000, ear: 0.12 });
  const stillActive = sample(state, { now: 3_000, ear: 0.12 });
  const cleared = sample(state, { now: 3_100, ear: 0.34 });

  assert.equal(active.drowsinessWarningActive, true);
  assert.equal(active.alarmOn, true);
  assert.equal(stillActive.drowsinessWarningActive, true);
  assert.equal(cleared.drowsinessWarningActive, false);
  assert.equal(cleared.alarmOn, false);
});

test("continuous drowsiness warning emits one candidate until eyes reopen", () => {
  const state = createBrowserDetectionState();

  sample(state, { now: 0, ear: 0.12 });
  const first = sample(state, { now: 2_000, ear: 0.12 });
  const continuous = sample(state, { now: 3_000, ear: 0.12 });

  assert.equal(first.events.length, 1);
  assert.equal(first.events[0].eventType, "drowsiness_detected");
  assert.equal(first.events[0].severity, "medium");
  assert.deepEqual(continuous.events, []);
});

test("reopening eyes allows another drowsiness candidate", () => {
  const state = createBrowserDetectionState();

  sample(state, { now: 0, ear: 0.12 });
  sample(state, { now: 2_000, ear: 0.12 });
  sample(state, { now: 2_100, ear: 0.34 });
  sample(state, { now: 5_000, ear: 0.12 });
  const second = sample(state, { now: 7_000, ear: 0.12 });

  assert.equal(second.events.length, 1);
  assert.equal(second.events[0].eventType, "drowsiness_detected");
});

test("continuous mouth-open period counts as one yawn", () => {
  const state = createBrowserDetectionState();

  const first = sample(state, { now: 0, mar: 0.81 });
  const continuous = sample(state, { now: 500, mar: 0.95 });

  assert.equal(first.yawnWarningActive, true);
  assert.equal(first.events.length, 1);
  assert.equal(first.events[0].eventType, "yawning_detected");
  assert.deepEqual(continuous.events, []);
});

test("MAR at or below 0.8 does not emit a yawn candidate", () => {
  const state = createBrowserDetectionState();

  const threshold = sample(state, { now: 0, mar: 0.8 });
  const below = sample(state, { now: 200, mar: 0.79 });

  assert.equal(threshold.yawnWarningActive, false);
  assert.deepEqual(threshold.events, []);
  assert.deepEqual(below.events, []);
});

test("closing mouth allows another yawn candidate", () => {
  const state = createBrowserDetectionState();

  const first = sample(state, { now: 0, mar: 0.81 });
  sample(state, { now: 200, mar: 0.2 });
  const second = sample(state, { now: 1_000, mar: 0.82 });

  assert.equal(first.events.length, 1);
  assert.equal(second.events.length, 1);
  assert.equal(second.events[0].eventType, "yawning_detected");
  assert.equal(second.events[0].severity, "medium");
});

test("pitch sign is reversed and pitch does not emit pose events", () => {
  const state = createBrowserDetectionState();

  assert.equal(displayPitch(-12), 12);
  assert.equal(displayPitch(8), -8);

  const decision = sample(state, { now: 0, rawPitch: -40 });

  assert.equal(decision.pitch, 40);
  assert.equal(decision.poseAlert, false);
  assert.deepEqual(decision.events, []);
});
