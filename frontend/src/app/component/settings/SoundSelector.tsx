import { Play } from "lucide-react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";

interface SoundSelectorProps {
  sounds: Array<{ id: string; label: string; browser_path: string }>;
  selectedId: string;
  onChange: (id: string) => void;
}

type SoundLabelKey =
  | "runtime.sounds.classic"
  | "runtime.sounds.soft"
  | "runtime.sounds.urgent";

const SOUND_LABEL_KEYS: Record<string, SoundLabelKey> = {
  classic: "runtime.sounds.classic",
  soft: "runtime.sounds.soft",
  urgent: "runtime.sounds.urgent",
};

export default function SoundSelector({
  sounds,
  selectedId,
  onChange,
}: SoundSelectorProps) {
  const { t } = useTranslation("settings");
  const selectedSound = sounds.find((s) => s.id === selectedId) ?? sounds[0];
  const previewTitle = t("runtime.preview");
  const alarmSoundLabel = t("runtime.alarmSound");

  const handlePreview = () => {
    if (selectedSound) {
      void new Audio(selectedSound.browser_path).play();
    }
  };

  const translateSoundLabel = (sound: { id: string; label: string }) => {
    const key = SOUND_LABEL_KEYS[sound.id];
    if (key) {
      const translated = t(key);
      if (translated !== key) return translated;
    }
    return sound.label;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-text-secondary">
          {alarmSoundLabel}
        </label>
        <motion.button
          type="button"
          onClick={handlePreview}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="group inline-flex items-center gap-1.5 rounded-lg bg-(--theme-subtle-bg) px-2.5 py-1 text-[10px] font-medium text-text-secondary ring-1 ring-hairline transition-colors hover:bg-(--theme-subtle-bg-hover) hover:text-text-primary"
          title={previewTitle}
        >
          <Play size={10} fill="currentColor" strokeWidth={2.4} />
          <span>{previewTitle}</span>
        </motion.button>
      </div>

      <motion.select
        value={selectedId}
        onChange={(e) => onChange(e.target.value)}
        whileFocus={{ scale: 1.01 }}
        className="theme-control w-full cursor-pointer rounded-xl px-4 py-2.5 text-sm outline-none transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
      >
        {sounds.map((sound) => (
          <option key={sound.id} value={sound.id}>
            {translateSoundLabel(sound)}
          </option>
        ))}
      </motion.select>
    </div>
  );
}
