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

export const READ_ONLY_SETTINGS: Array<[string, string]> = [
  ["EAR threshold", "0.28"],
  ["Eye closure duration", "2.0s"],
  ["Eye closure frames", "20"],
  ["CNN closed threshold", "0.50"],
  ["Yawn MAR threshold", "0.80"],
  ["MAR frame threshold", "0.55"],
  ["Yawn frames", "8"],
  ["Drowsiness pair window", "30s"],
  ["Drowsiness escalation window", "60s"],
  ["Yawn pair window", "20s"],
  ["Pose drop threshold", "12 deg"],
  ["Absolute nod limit", "-18 deg"],
  ["Warning penalty", "-5"],
  ["Critical penalty", "-10"],
];

export function getEditableSettings(settings: BackendSettings) {
  return {
    alarm_sound_id: settings.alarm_sound_id ?? "classic",
    frame_width: settings.frame_width ?? 640,
    frame_height: settings.frame_height ?? 480,
    safety_grade_a_min_score: settings.safety_grade_a_min_score ?? 80,
    safety_grade_b_min_score: settings.safety_grade_b_min_score ?? 60,
  };
}
