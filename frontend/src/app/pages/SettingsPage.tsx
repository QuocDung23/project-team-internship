import { useEffect, useMemo, useState } from "react";
import { AdminErrorBanner, AdminPage } from "../component/admin/AdminShell";
import { useBackendSettings } from "../hook/useBackendData";
import {
  DEFAULT_SETTINGS,
  getEditableSettings,
} from "../constants/settings/constants";
import SettingsHeader from "../component/settings/SettingsHeader";
import ReadOnlyThresholds from "../component/settings/ReadOnlyThresholds";
import RuntimeControls from "../component/settings/RuntimeControls";
import SafetyGrades from "../component/settings/SafetyGrades";

export default function SettingsPage() {
  const backendSettings = useBackendSettings();
  const [draft, setDraft] = useState(DEFAULT_SETTINGS);
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
  const soundCatalog = draft.alarm_sound_catalog?.length
    ? draft.alarm_sound_catalog
    : (DEFAULT_SETTINGS.alarm_sound_catalog ?? []);

  const editableDraft = useMemo(() => getEditableSettings(draft), [draft]);
  const editablePersisted = useMemo(
    () => getEditableSettings(persisted),
    [persisted],
  );

  const isDirty = useMemo(
    () => JSON.stringify(editableDraft) !== JSON.stringify(editablePersisted),
    [editableDraft, editablePersisted],
  );

  const handleNumberChange = (key: keyof typeof draft, value: string) => {
    setDraft((current) => ({ ...current, [key]: Number(value) }));
  };

  const handleSoundChange = (id: string) => {
    setDraft((current) => ({ ...current, alarm_sound_id: id }));
  };

  const handleSave = async () => {
    const width = draft.frame_width ?? 0;
    const height = draft.frame_height ?? 0;
    const gradeA = draft.safety_grade_a_min_score ?? 80;
    const gradeB = draft.safety_grade_b_min_score ?? 60;

    if (
      !Number.isInteger(width) ||
      width <= 0 ||
      !Number.isInteger(height) ||
      height <= 0
    ) {
      setValidationError("Frame width and height must be positive integers.");
      return;
    }

    if (
      gradeA < 0 ||
      gradeA > 100 ||
      gradeB < 0 ||
      gradeB > 100 ||
      gradeA < gradeB
    ) {
      setValidationError(
        "Grade cutoffs must be between 0 and 100, with Grade A at least Grade B.",
      );
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
      <SettingsHeader
        isDirty={isDirty}
        lastSavedAt={lastSavedAt}
        isSaving={backendSettings.saving}
        isLive={backendSettings.isLive}
        onSave={handleSave}
      />

      <AdminErrorBanner
        label="Settings unavailable"
        message={backendSettings.error ?? validationError}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ReadOnlyThresholds />

        <RuntimeControls
          soundCatalog={soundCatalog}
          selectedSoundId={draft.alarm_sound_id ?? "classic"}
          frameWidth={draft.frame_width ?? 640}
          frameHeight={draft.frame_height ?? 480}
          onSoundChange={handleSoundChange}
          onFrameWidthChange={(v) => handleNumberChange("frame_width", v)}
          onFrameHeightChange={(v) => handleNumberChange("frame_height", v)}
        />

        <div className="lg:col-span-2">
          <SafetyGrades
            gradeAMin={draft.safety_grade_a_min_score ?? 80}
            gradeBMin={draft.safety_grade_b_min_score ?? 60}
            onGradeAChange={(v) =>
              handleNumberChange("safety_grade_a_min_score", v)
            }
            onGradeBChange={(v) =>
              handleNumberChange("safety_grade_b_min_score", v)
            }
          />
        </div>
      </div>
    </AdminPage>
  );
}
