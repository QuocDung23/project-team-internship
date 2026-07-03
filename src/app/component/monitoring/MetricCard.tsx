import { StatusBadge } from "./StatusBadge";
import type { MetricStatus } from "../../data/mockMetrics";

interface MetricCardProps {
  label: string;
  value: string;
  unit?: string;
  status: MetricStatus;
  statusLabel: string;
  thresholds: { warn: number; critical: number };
  higherIsWorse?: boolean;
  range: { min: number; max: number };
  hint?: string;
}

const VALUE_COLOR: Record<MetricStatus, string> = {
  active: "text-emerald-300",
  warn: "text-amber-300",
  critical: "text-rose-300",
};

const BAR_FILL: Record<MetricStatus, string> = {
  active: "bg-emerald-400",
  warn: "bg-amber-400",
  critical: "bg-rose-400",
};

export function MetricCard({
  label,
  value,
  unit,
  status,
  statusLabel,
  thresholds,
  higherIsWorse = false,
  range,
  hint,
}: MetricCardProps) {
  // The "fill" is the position of the current value within [min..max] (0..1).
  const numeric = parseFloat(value);
  const fillPct = clamp01((numeric - range.min) / (range.max - range.min));
  // Threshold marker positions inside the bar.
  const warnPct = clamp01(
    (thresholds.warn - range.min) / (range.max - range.min),
  );
  const critPct = clamp01(
    (thresholds.critical - range.min) / (range.max - range.min),
  );

  return (
    <div className="panel flex flex-col gap-3 px-4 py-3.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
          {label}
        </span>
        <StatusBadge tone={status} label={statusLabel} />
      </div>

      <div className="flex items-baseline gap-1.5">
        <span
          className={`font-mono-num text-3xl font-semibold leading-none ${VALUE_COLOR[status]}`}
        >
          {value}
        </span>
        {unit && (
          <span className="text-[12px] font-medium text-zinc-500">{unit}</span>
        )}
      </div>

      {hint && <p className="-mt-1 text-[11px] text-zinc-500">{hint}</p>}

      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`absolute inset-y-0 left-0 ${BAR_FILL[status]} transition-all duration-500`}
          style={{
            width: `${fillPct * 100}%`,
            ...(higherIsWorse
              ? { transform: "scaleX(-1)", transformOrigin: "right" }
              : {}),
          }}
        />
        <span
          className="absolute top-1/2 h-2.5 w-px -translate-y-1/2 bg-amber-400/60"
          style={{ left: `${warnPct * 100}%` }}
          aria-hidden
        />
        <span
          className="absolute top-1/2 h-2.5 w-px -translate-y-1/2 bg-rose-400/60"
          style={{ left: `${critPct * 100}%` }}
          aria-hidden
        />
      </div>
    </div>
  );
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}
