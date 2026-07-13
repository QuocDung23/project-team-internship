import type { ClientSafetyEvent } from "../types/monitoring";

export const EAR_THRESHOLD = 0.28;
export const MAR_THRESHOLD = 0.8;
export const DROWSINESS_WARNING_MS = 2_000;
export const DROWSINESS_AGGREGATION_MS = 30_000;
export const YAWN_AGGREGATION_MS = 20_000;

export interface BrowserDetectionState {
  eyeClosureStartedAt: number | null;
  drowsinessWarningActive: boolean;
  drowsinessEventOpen: boolean;
  drowsinessEventTimes: number[];
  yawnOpen: boolean;
  yawnEventTimes: number[];
}

export interface DetectionSample {
  now: number;
  ear: number;
  mar: number;
  rawPitch: number;
  faceDetected: boolean;
}

export interface DetectionAggregateEvent {
  eventType: ClientSafetyEvent["event_type"];
  severity: ClientSafetyEvent["severity"];
  durationMs: number;
}

export interface DetectionDecision {
  pitch: number;
  eyesOpen: boolean;
  mouthClosed: boolean;
  earAlert: boolean;
  marAlert: boolean;
  poseAlert: boolean;
  alarmOn: boolean;
  drowsinessWarningActive: boolean;
  yawnWarningActive: boolean;
  events: DetectionAggregateEvent[];
}

export function createBrowserDetectionState(): BrowserDetectionState {
  return {
    eyeClosureStartedAt: null,
    drowsinessWarningActive: false,
    drowsinessEventOpen: false,
    drowsinessEventTimes: [],
    yawnOpen: false,
    yawnEventTimes: [],
  };
}

export function resetBrowserDetectionState(state: BrowserDetectionState): void {
  state.eyeClosureStartedAt = null;
  state.drowsinessWarningActive = false;
  state.drowsinessEventOpen = false;
  state.drowsinessEventTimes = [];
  state.yawnOpen = false;
  state.yawnEventTimes = [];
}

export function displayPitch(rawPitch: number): number {
  return -rawPitch;
}

function recentTimes(times: number[], now: number, windowMs: number): number[] {
  return times.filter((time) => now - time <= windowMs);
}

export function processDetectionSample(
  state: BrowserDetectionState,
  sample: DetectionSample,
): DetectionDecision {
  const pitch = displayPitch(sample.rawPitch);
  const eyesOpen = sample.faceDetected ? sample.ear >= EAR_THRESHOLD : true;
  const mouthClosed = sample.faceDetected ? sample.mar <= MAR_THRESHOLD : true;
  const events: DetectionAggregateEvent[] = [];

  if (!sample.faceDetected) {
    state.eyeClosureStartedAt = null;
    state.drowsinessWarningActive = false;
    state.drowsinessEventOpen = false;
    state.yawnOpen = false;
    return {
      pitch,
      eyesOpen,
      mouthClosed,
      earAlert: false,
      marAlert: false,
      poseAlert: false,
      alarmOn: false,
      drowsinessWarningActive: false,
      yawnWarningActive: false,
      events,
    };
  }

  if (eyesOpen) {
    state.eyeClosureStartedAt = null;
    state.drowsinessWarningActive = false;
    state.drowsinessEventOpen = false;
  } else {
    state.eyeClosureStartedAt ??= sample.now;
    const closedDurationMs = sample.now - state.eyeClosureStartedAt;
    state.drowsinessWarningActive = closedDurationMs >= DROWSINESS_WARNING_MS;

    if (state.drowsinessWarningActive && !state.drowsinessEventOpen) {
      state.drowsinessEventOpen = true;
      state.drowsinessEventTimes = recentTimes(
        [...state.drowsinessEventTimes, sample.now],
        sample.now,
        DROWSINESS_AGGREGATION_MS,
      );
      if (state.drowsinessEventTimes.length >= 2) {
        events.push({
          eventType: "drowsiness_detected",
          severity: "high",
          durationMs: closedDurationMs,
        });
        state.drowsinessEventTimes = [];
      }
    }
  }

  if (mouthClosed) {
    state.yawnOpen = false;
  } else if (!state.yawnOpen) {
    state.yawnOpen = true;
    state.yawnEventTimes = recentTimes(
      [...state.yawnEventTimes, sample.now],
      sample.now,
      YAWN_AGGREGATION_MS,
    );
    if (state.yawnEventTimes.length >= 2) {
      events.push({
        eventType: "yawning_detected",
        severity: "medium",
        durationMs: 0,
      });
      state.yawnEventTimes = [];
    }
  }

  return {
    pitch,
    eyesOpen,
    mouthClosed,
    earAlert: state.drowsinessWarningActive,
    marAlert: !mouthClosed,
    poseAlert: false,
    alarmOn: state.drowsinessWarningActive,
    drowsinessWarningActive: state.drowsinessWarningActive,
    yawnWarningActive: !mouthClosed,
    events,
  };
}
