import type { ReactNode } from "react";

export default function DriverTextField({
  icon,
  label,
  value,
  required = false,
  type = "text",
  hint,
  onChange,
}: {
  icon?: ReactNode;
  label: string;
  value: string;
  required?: boolean;
  type?: string;
  hint?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5 text-[11px] text-zinc-400">
      <span className="flex items-center gap-1.5 font-medium">
        {icon ? <span className="text-zinc-500">{icon}</span> : null}
        {label}
        {required ? <span className="text-rose-400/80">*</span> : null}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl border border-white/[0.08] bg-zinc-950/60 px-3 py-2 text-[12px] text-zinc-100 outline-none transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] placeholder:text-zinc-600 focus:border-emerald-500/50 focus:bg-zinc-950/80 focus:shadow-[0_0_0_3px_rgba(16,185,129,0.10)]"
      />
      {hint ? <span className="text-[10px] leading-relaxed text-zinc-500">{hint}</span> : null}
    </label>
  );
}
