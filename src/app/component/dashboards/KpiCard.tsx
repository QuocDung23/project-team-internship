import { StatusBadge } from "../monitoring/StatusBadge";
import type { KpiCardProps } from "../../types/dashboards";

const TONE_LABEL: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  active: "OK",
  warn: "Warn",
  critical: "Risk",
  neutral: "",
};

export default function KpiCard({
  label,
  value,
  hint,
  tone = "neutral",
  icon,
}: KpiCardProps) {
  return (
    <div
      className="flex flex-col gap-3 px-5 py-4 rounded-2xl border"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-hairline)',
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] font-medium uppercase tracking-wider"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          {label}
        </span>
        <span
          className="flex h-7 w-7 items-center justify-center rounded-md"
          style={{
            backgroundColor: 'var(--color-surface-2)',
            color: 'var(--color-text-tertiary)',
          }}
        >
          {icon}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span
          className="font-mono-num text-3xl font-semibold leading-none"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {value}
        </span>
        {tone !== "neutral" && (
          <StatusBadge tone={tone} label={TONE_LABEL[tone]} withDot />
        )}
      </div>
      {hint && (
        <p
          className="text-[11px]"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}
