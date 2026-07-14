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
      <label className="block text-xs font-medium text-zinc-400">
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
        className="w-full cursor-pointer rounded-xl border border-zinc-700/50 bg-zinc-900/80 px-4 py-2.5 font-mono text-sm tabular-nums text-zinc-100 outline-none ring-1 ring-transparent transition-all duration-200 focus:border-emerald-500/50 focus:ring-emerald-500/20"
      />
    </div>
  );
}
