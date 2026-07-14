import { motion, useReducedMotion } from "motion/react";
import NumberField from "./NumberField";

interface SafetyGradesProps {
  gradeAMin: number;
  gradeBMin: number;
  onGradeAChange: (value: string) => void;
  onGradeBChange: (value: string) => void;
}

export default function SafetyGrades({
  gradeAMin,
  gradeBMin,
  onGradeAChange,
  onGradeBChange,
}: SafetyGradesProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="theme-card rounded-2xl p-6"
    >
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.55 }}
      >
        <h3 className="mb-4 text-xs font-medium text-text-tertiary">
          Score Thresholds
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <NumberField
            label="Grade A Minimum"
            value={gradeAMin}
            step="1"
            min={0}
            max={100}
            onChange={onGradeAChange}
          />
          <NumberField
            label="Grade B Minimum"
            value={gradeBMin}
            step="1"
            min={0}
            max={100}
            onChange={onGradeBChange}
          />
        </div>
      </motion.div>
    </motion.section>
  );
}
