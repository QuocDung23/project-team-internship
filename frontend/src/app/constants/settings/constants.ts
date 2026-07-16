import type { AlarmSoundOption, BackendSettings } from "../../services/backendApi";

export const DEFAULT_SOUND_CATALOG: AlarmSoundOption[] = [
  { id: "classic", label: "Classic alarm", browser_path: "/alert.wav", runtime_path: "audio/alert.wav" },
  { id: "soft", label: "Soft chime", browser_path: "/alert-soft.wav", runtime_path: "audio/alert-soft.wav" },
  { id: "urgent", label: "Urgent pulse", browser_path: "/alert-urgent.wav", runtime_path: "audio/alert-urgent.wav" },
];

export const DEFAULT_SETTINGS: BackendSettings = {
  alarm_sound_id: "classic",
  alarm_sound_catalog: DEFAULT_SOUND_CATALOG,
  ear_threshold: 0.3,
  ear_consec_frames: 15,
  cnn_confidence_threshold: 0.8,
  preferred_detection_method: "ear_dlib",
  alarm_audio_file: "audio/alert.wav",
  alert_cooldown_seconds: 10,
  enable_no_face_alert: true,
  no_face_timeout_seconds: 5,
  camera_index: 0,
  frame_width: 640,
  frame_height: 480,
  warning_alert_penalty: 5,
  critical_alert_penalty: 10,
  safety_grade_a_min_score: 80,
  safety_grade_b_min_score: 60,
  extra_config: {},
};

export const READ_ONLY_SETTINGS: Array<[SettingsThresholdKey, string]> = [
  ["thresholds.ear", "0.28"],
  ["thresholds.eyeClosureDuration", "2.0s"],
  ["thresholds.eyeClosureFrames", "20"],
  ["thresholds.cnnClosedThreshold", "0.50"],
  ["thresholds.yawnMarThreshold", "0.80"],
  ["thresholds.marFrameThreshold", "0.55"],
  ["thresholds.yawnFrames", "8"],
  ["thresholds.drowsinessPairWindow", "30s"],
  ["thresholds.drowsinessEscalationWindow", "60s"],
  ["thresholds.yawnPairWindow", "20s"],
  ["thresholds.poseDropThreshold", "12 deg"],
  ["thresholds.absoluteNodLimit", "-18 deg"],
  ["thresholds.warningPenalty", "-5"],
  ["thresholds.criticalPenalty", "-10"],
];

type SettingsThresholdKey =
  | "thresholds.ear"
  | "thresholds.eyeClosureDuration"
  | "thresholds.eyeClosureFrames"
  | "thresholds.cnnClosedThreshold"
  | "thresholds.yawnMarThreshold"
  | "thresholds.marFrameThreshold"
  | "thresholds.yawnFrames"
  | "thresholds.drowsinessPairWindow"
  | "thresholds.drowsinessEscalationWindow"
  | "thresholds.yawnPairWindow"
  | "thresholds.poseDropThreshold"
  | "thresholds.absoluteNodLimit"
  | "thresholds.warningPenalty"
  | "thresholds.criticalPenalty";

export function getEditableSettings(settings: BackendSettings) {
  return {
    alarm_sound_id: settings.alarm_sound_id ?? "classic",
    frame_width: settings.frame_width ?? 640,
    frame_height: settings.frame_height ?? 480,
    safety_grade_a_min_score: settings.safety_grade_a_min_score ?? 80,
    safety_grade_b_min_score: settings.safety_grade_b_min_score ?? 60,
  };
}
