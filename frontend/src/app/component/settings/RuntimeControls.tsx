import { motion, useReducedMotion } from "motion/react";
import NumberField from "./NumberField";
import SoundSelector from "./SoundSelector";
import type { AlarmSoundOption } from "../../services/backendApi";

interface RuntimeControlsProps {
  soundCatalog: AlarmSoundOption[];
  selectedSoundId: string;
  frameWidth: number;
  frameHeight: number;
  onSoundChange: (id: string) => void;
  onFrameWidthChange: (value: string) => void;
  onFrameHeightChange: (value: string) => void;
}

export default function RuntimeControls({
  soundCatalog,
  selectedSoundId,
  frameWidth,
  frameHeight,
  onSoundChange,
  onFrameWidthChange,
  onFrameHeightChange,
}: RuntimeControlsProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="theme-card rounded-2xl p-6"
    >
      <div className="mb-5">
        <h2 className="text-sm font-semibold text-text-primary">
          Runtime Controls
        </h2>
        <p className="mt-1 text-xs text-text-tertiary">
          Adjustable parameters during operation
        </p>
      </div>

      <div className="space-y-5">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
        >
          <SoundSelector
            sounds={soundCatalog}
            selectedId={selectedSoundId}
            onChange={onSoundChange}
          />
        </motion.div>

        <motion.div
          className="border-t border-hairline pt-5"
          initial={reduceMotion ? false : { opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <h3 className="mb-4 text-xs font-medium text-text-tertiary">
            Camera Resolution
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <NumberField
              label="Width"
              value={frameWidth}
              step="1"
              min={1}
              onChange={onFrameWidthChange}
            />
            <NumberField
              label="Height"
              value={frameHeight}
              step="1"
              min={1}
              onChange={onFrameHeightChange}
            />
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}
