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
    <div className="panel flex flex-col gap-3 px-5 py-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
          {label}
        </span>
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-surface-2 text-zinc-400">
          {icon}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-mono-num text-3xl font-semibold leading-none text-zinc-100">
          {value}
        </span>
        {tone !== "neutral" && (
          <StatusBadge tone={tone} label={TONE_LABEL[tone]} withDot />
        )}
      </div>
      {hint && <p className="text-[11px] text-zinc-500">{hint}</p>}
    </div>
  );
}
