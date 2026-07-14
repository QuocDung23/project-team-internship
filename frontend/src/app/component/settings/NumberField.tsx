import { motion, useReducedMotion } from "motion/react";

interface NumberFieldProps {
  label: string;
  value: number;
  step?: string;
  min?: number;
  max?: number;
  onChange: (value: string) => void;
}

export default function NumberField({
  label,
  value,
  step = "1",
  min,
  max,
  onChange,
}: NumberFieldProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-text-secondary">
        {label}
      </label>
      <motion.input
        type="number"
        value={value}
        step={step}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        whileFocus={reduceMotion ? {} : { scale: 1.02 }}
        className="theme-control w-full cursor-pointer rounded-xl px-4 py-2.5 font-mono text-sm tabular-nums outline-none transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
      />
    </div>
  );
}
