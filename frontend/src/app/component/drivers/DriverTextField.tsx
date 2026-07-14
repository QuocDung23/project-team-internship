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
    <label className="grid gap-1.5 text-[11px] text-text-secondary">
      <span className="flex items-center gap-1.5 font-medium">
        {icon ? <span className="text-text-tertiary">{icon}</span> : null}
        {label}
        {required ? <span className="text-accent-critical/80">*</span> : null}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl border border-hairline bg-surface-2 px-3 py-2 text-[12px] text-text-primary outline-none transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] placeholder:text-text-tertiary focus:border-accent-active/50 focus:bg-surface focus:shadow-[0_0_0_3px_var(--theme-focus-ring)]"
      />
      {hint ? <span className="text-[10px] leading-relaxed text-text-tertiary">{hint}</span> : null}
    </label>
  );
}
