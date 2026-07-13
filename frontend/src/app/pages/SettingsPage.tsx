import { Loader, Play, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AdminErrorBanner, AdminHeader, AdminPage } from "../component/admin/AdminShell";
import { useBackendSettings } from "../hook/useBackendData";
import type { AlarmSoundOption, BackendSettings } from "../services/backendApi";

const DEFAULT_SOUND_CATALOG: AlarmSoundOption[] = [
  { id: "classic", label: "Classic alarm", browser_path: "/alert.wav", runtime_path: "audio/alert.wav" },
  { id: "soft", label: "Soft chime", browser_path: "/alert-soft.wav", runtime_path: "audio/alert-soft.wav" },
  { id: "urgent", label: "Urgent pulse", browser_path: "/alert-urgent.wav", runtime_path: "audio/alert-urgent.wav" },
];

const DEFAULT_SETTINGS: BackendSettings = {
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

const READ_ONLY_SETTINGS: Array<[string, string]> = [
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

export function SettingsPage() {
  const backendSettings = useBackendSettings();
  const [draft, setDraft] = useState<BackendSettings>(DEFAULT_SETTINGS);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (backendSettings.settings) {
      const id = window.setTimeout(() => {
        setDraft(backendSettings.settings!);
        setValidationError(null);
      }, 0);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [backendSettings.settings]);

  const persisted = backendSettings.settings ?? DEFAULT_SETTINGS;
  const soundCatalog = draft.alarm_sound_catalog?.length ? draft.alarm_sound_catalog : DEFAULT_SOUND_CATALOG;
  const selectedSound = soundCatalog.find((sound) => sound.id === draft.alarm_sound_id) ?? soundCatalog[0]!;

  const editableDraft = useMemo(() => editableSettings(draft), [draft]);
  const editablePersisted = useMemo(() => editableSettings(persisted), [persisted]);
  const isDirty = useMemo(
    () => JSON.stringify(editableDraft) !== JSON.stringify(editablePersisted),
    [editableDraft, editablePersisted],
  );

  const updateNumber = (key: keyof BackendSettings, value: string) => {
    setDraft((current) => ({ ...current, [key]: Number(value) }));
  };

  const updateSound = (value: string) => {
    setDraft((current) => ({ ...current, alarm_sound_id: value }));
  };

  const previewSound = () => {
    void new Audio(selectedSound.browser_path).play();
  };

  const save = async () => {
    const width = draft.frame_width ?? 0;
    const height = draft.frame_height ?? 0;
    const gradeA = draft.safety_grade_a_min_score ?? 80;
    const gradeB = draft.safety_grade_b_min_score ?? 60;

    if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
      setValidationError("Frame width and height must be positive integers.");
      return;
    }
    if (gradeA < 0 || gradeA > 100 || gradeB < 0 || gradeB > 100 || gradeA < gradeB) {
      setValidationError("Grade cutoffs must be between 0 and 100, with Grade A at least Grade B.");
      return;
    }

    setValidationError(null);
    await backendSettings.save({
      alarm_sound_id: draft.alarm_sound_id ?? "classic",
      frame_width: width,
      frame_height: height,
      safety_grade_a_min_score: gradeA,
      safety_grade_b_min_score: gradeB,
    });
    setLastSavedAt(Date.now());
  };

  return (
    <AdminPage>
      <AdminHeader
        eyebrow="System Settings"
        title="Detection settings"
        description={
          backendSettings.isLive
            ? "Supported runtime settings are loaded from the backend"
            : "Backend is unavailable, showing defaults"
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
              Save
            </button>
          </>
        }
      />

      <AdminErrorBanner label="Settings unavailable" message={backendSettings.error ?? validationError} />

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="panel grid gap-3 px-5 py-4">
          <h2 className="text-[13px] font-semibold text-zinc-100">Read-only detector thresholds</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {READ_ONLY_SETTINGS.map(([label, value]) => (
              <ReadOnlyValue key={label} label={label} value={value} />
            ))}
          </div>
        </div>

        <div className="panel grid gap-3 px-5 py-4">
          <h2 className="text-[13px] font-semibold text-zinc-100">Runtime controls</h2>
          <label className="grid gap-1 text-[11px] text-zinc-400">
            Alert sound
            <div className="flex gap-2">
              <select
                value={draft.alarm_sound_id ?? "classic"}
                onChange={(event) => updateSound(event.target.value)}
                className="min-w-0 flex-1 rounded-md border border-hairline bg-surface-2 px-3 py-2 text-[12px] text-zinc-100 outline-none focus:border-emerald-500/50"
              >
                {soundCatalog.map((sound) => (
                  <option key={sound.id} value={sound.id}>
                    {sound.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={previewSound}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-hairline bg-surface-2 text-zinc-200 transition-colors hover:border-emerald-500/50 hover:text-emerald-300"
                title="Preview alert sound"
              >
                <Play size={14} fill="currentColor" />
              </button>
            </div>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Frame width" value={draft.frame_width ?? 640} step="1" onChange={(value) => updateNumber("frame_width", value)} />
            <NumberField label="Frame height" value={draft.frame_height ?? 480} step="1" onChange={(value) => updateNumber("frame_height", value)} />
          </div>
        </div>

        <div className="panel grid gap-3 px-5 py-4 lg:col-span-2">
          <h2 className="text-[13px] font-semibold text-zinc-100">Safety score grades</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <NumberField label="Grade A minimum" value={draft.safety_grade_a_min_score ?? 80} step="1" onChange={(value) => updateNumber("safety_grade_a_min_score", value)} />
            <NumberField label="Grade B minimum" value={draft.safety_grade_b_min_score ?? 60} step="1" onChange={(value) => updateNumber("safety_grade_b_min_score", value)} />
          </div>
        </div>
      </section>
    </AdminPage>
  );
}

function editableSettings(settings: BackendSettings) {
  return {
    alarm_sound_id: settings.alarm_sound_id ?? "classic",
    frame_width: settings.frame_width ?? 640,
    frame_height: settings.frame_height ?? 480,
    safety_grade_a_min_score: settings.safety_grade_a_min_score ?? 80,
    safety_grade_b_min_score: settings.safety_grade_b_min_score ?? 60,
  };
}

function ReadOnlyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-hairline bg-surface-2 px-3 py-2">
      <div className="text-[11px] text-zinc-500">{label}</div>
      <div className="mt-1 font-mono-num text-[12px] text-zinc-100">{value}</div>
    </div>
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
