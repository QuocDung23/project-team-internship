import type { ClientSafetyEvent } from "../types/monitoring";

export const EAR_THRESHOLD = 0.28;
export const MAR_THRESHOLD = 0.8;
export const DROWSINESS_WARNING_MS = 2_000;

export interface BrowserDetectionState {
  eyeClosureStartedAt: number | null;
  drowsinessWarningActive: boolean;
  drowsinessEventOpen: boolean;
  yawnOpen: boolean;
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
    yawnOpen: false,
  };
}

export function resetBrowserDetectionState(state: BrowserDetectionState): void {
  state.eyeClosureStartedAt = null;
  state.drowsinessWarningActive = false;
  state.drowsinessEventOpen = false;
  state.yawnOpen = false;
}

export function displayPitch(rawPitch: number): number {
  return -rawPitch;
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
      events.push({
        eventType: "drowsiness_detected",
        severity: "medium",
        durationMs: closedDurationMs,
      });
    }
  }

  if (mouthClosed) {
    state.yawnOpen = false;
  } else if (!state.yawnOpen) {
    state.yawnOpen = true;
    events.push({
      eventType: "yawning_detected",
      severity: "medium",
      durationMs: 0,
    });
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
