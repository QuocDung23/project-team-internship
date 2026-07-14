import type { KpiCardProps } from "../../types/dashboards";

const TONE_LABEL: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  active: "OK",
  warn: "Warn",
  critical: "Risk",
  neutral: "",
};

const TONE_COLORS = {
  active: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/25",
  warn: "bg-amber-500/15 text-amber-300 ring-amber-500/25",
  critical: "bg-red-500/15 text-red-300 ring-red-500/25",
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
    <div className="rounded-xl border border-white/5 bg-white/2 px-4 py-3">
      <div className="flex items-start justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
          {label}
        </span>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/4 text-zinc-400">
          {icon}
        </span>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-mono-num text-[28px] font-semibold leading-none tracking-tight text-zinc-100">
          {value}
        </span>
        {tone !== "neutral" && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${TONE_COLORS[tone]}`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                tone === "active"
                  ? "bg-emerald-400"
                  : tone === "warn"
                    ? "bg-amber-400"
                    : "bg-red-400"
              }`}
            />
            {TONE_LABEL[tone]}
          </span>
        )}
      </div>

      {hint && <p className="mt-2 text-[11px] text-zinc-500">{hint}</p>}
    </div>
  );
}
