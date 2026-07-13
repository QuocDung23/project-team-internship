import { Save, Loader } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AdminErrorBanner, AdminHeader, AdminPage } from "../component/admin/AdminShell";
import { useBackendSettings } from "../hook/useBackendData";
import type { BackendSettings } from "../services/backendApi";

const DEFAULT_SETTINGS: BackendSettings = {
  ear_threshold: 0.3,
  ear_consec_frames: 15,
  cnn_confidence_threshold: 0.8,
  preferred_detection_method: "ear_dlib",
  alarm_audio_file: "alarm.wav",
  alert_cooldown_seconds: 10,
  enable_no_face_alert: true,
  no_face_timeout_seconds: 5,
  camera_index: 0,
  frame_width: 640,
  frame_height: 480,
  warning_alert_penalty: 3,
  critical_alert_penalty: 8,
  safety_grade_a_min_score: 85,
  safety_grade_b_min_score: 60,
  extra_config: {},
};

export function SettingsPage() {
  const backendSettings = useBackendSettings();
  const [draft, setDraft] = useState<BackendSettings>(DEFAULT_SETTINGS);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (backendSettings.settings) {
      const id = window.setTimeout(() => {
        setDraft(backendSettings.settings!);
      }, 0);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [backendSettings.settings]);

  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(backendSettings.settings ?? DEFAULT_SETTINGS),
    [draft, backendSettings.settings],
  );

  const updateNumber = (key: keyof BackendSettings, value: string) => {
    setDraft((current) => ({ ...current, [key]: Number(value) }));
  };

  const updateString = (key: keyof BackendSettings, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const save = async () => {
    await backendSettings.save({
      ear_threshold: draft.ear_threshold,
      ear_consec_frames: draft.ear_consec_frames,
      cnn_confidence_threshold: draft.cnn_confidence_threshold,
      preferred_detection_method: draft.preferred_detection_method,
      alarm_audio_file: draft.alarm_audio_file,
      alert_cooldown_seconds: draft.alert_cooldown_seconds,
      camera_index: draft.camera_index,
      frame_width: draft.frame_width,
      frame_height: draft.frame_height,
      warning_alert_penalty: draft.warning_alert_penalty,
      critical_alert_penalty: draft.critical_alert_penalty,
      safety_grade_a_min_score: draft.safety_grade_a_min_score,
      safety_grade_b_min_score: draft.safety_grade_b_min_score,
    });
    setLastSavedAt(Date.now());
  };

  return (
    <AdminPage>
      <AdminHeader
        eyebrow="System Settings"
        title="Cài đặt phát hiện"
        description={
          backendSettings.isLive
            ? "Đang đọc / ghi settings từ backend"
            : "Backend chưa sẵn sàng, đang hiển thị giá trị mặc định"
        }
        actions={
          <>
            <span className={isDirty ? "text-[11px] text-amber-300" : "text-[11px] text-emerald-300"}>
              {isDirty
                ? "Unsaved changes"
                : lastSavedAt
                  ? `Saved ${new Date(lastSavedAt).toLocaleTimeString()}`
                  : "No changes"}
            </span>
            <button
              type="button"
              onClick={save}
              disabled={backendSettings.saving || !isDirty}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/15 px-3 py-1.5 text-[11px] font-medium text-emerald-300 ring-1 ring-emerald-500/25 transition-colors hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {backendSettings.saving ? (
                <Loader size={13} className="animate-spin" />
              ) : (
                <Save size={13} strokeWidth={2.5} />
              )}
              Lưu
            </button>
          </>
        }
      />

      <AdminErrorBanner label="Settings unavailable" message={backendSettings.error} />

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="panel grid gap-3 px-5 py-4">
          <h2 className="text-[13px] font-semibold text-zinc-100">
            Ngưỡng phát hiện
          </h2>
          <NumberField label="EAR threshold" value={draft.ear_threshold} step="0.01" onChange={(value) => updateNumber("ear_threshold", value)} />
          <NumberField label="EAR frames" value={draft.ear_consec_frames} step="1" onChange={(value) => updateNumber("ear_consec_frames", value)} />
          <NumberField label="CNN confidence" value={draft.cnn_confidence_threshold} step="0.01" onChange={(value) => updateNumber("cnn_confidence_threshold", value)} />
          <TextField label="Detection method" value={draft.preferred_detection_method ?? "ear_dlib"} onChange={(value) => updateString("preferred_detection_method", value)} />
        </div>

        <div className="panel grid gap-3 px-5 py-4">
          <h2 className="text-[13px] font-semibold text-zinc-100">
            Thiết bị và cảnh báo
          </h2>
          <TextField label="Alarm file" value={draft.alarm_audio_file} onChange={(value) => updateString("alarm_audio_file", value)} />
          <NumberField label="Cooldown seconds" value={draft.alert_cooldown_seconds} step="1" onChange={(value) => updateNumber("alert_cooldown_seconds", value)} />
          <NumberField label="Camera index" value={draft.camera_index ?? 0} step="1" onChange={(value) => updateNumber("camera_index", value)} />
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Frame width" value={draft.frame_width ?? 640} step="1" onChange={(value) => updateNumber("frame_width", value)} />
            <NumberField label="Frame height" value={draft.frame_height ?? 480} step="1" onChange={(value) => updateNumber("frame_height", value)} />
          </div>
        </div>

        <div className="panel grid gap-3 px-5 py-4 lg:col-span-2">
          <h2 className="text-[13px] font-semibold text-zinc-100">
            Tính điểm an toàn
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <NumberField label="Warning penalty" value={draft.warning_alert_penalty ?? 3} step="0.5" onChange={(value) => updateNumber("warning_alert_penalty", value)} />
            <NumberField label="Critical penalty" value={draft.critical_alert_penalty ?? 8} step="0.5" onChange={(value) => updateNumber("critical_alert_penalty", value)} />
            <NumberField label="Grade A min" value={draft.safety_grade_a_min_score ?? 85} step="1" onChange={(value) => updateNumber("safety_grade_a_min_score", value)} />
            <NumberField label="Grade B min" value={draft.safety_grade_b_min_score ?? 60} step="1" onChange={(value) => updateNumber("safety_grade_b_min_score", value)} />
          </div>
        </div>
      </section>
    </AdminPage>
  );
}

function NumberField({
  label,
  value,
  step,
  onChange,
}: {
  label: string;
  value: number;
  step: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-[11px] text-zinc-400">
      {label}
      <input
        type="number"
        value={value}
        step={step}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-md border border-hairline bg-surface-2 px-3 py-2 font-mono-num text-[12px] text-zinc-100 outline-none focus:border-emerald-500/50"
      />
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-[11px] text-zinc-400">
      {label}
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-md border border-hairline bg-surface-2 px-3 py-2 text-[12px] text-zinc-100 outline-none focus:border-emerald-500/50"
      />
    </label>
  );
}
