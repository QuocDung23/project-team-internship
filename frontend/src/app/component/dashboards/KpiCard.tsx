import type { KpiCardProps } from "../../types/dashboards";

const TONE_LABEL: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  active: "OK",
  warn: "Warn",
  critical: "Risk",
  neutral: "",
};

const TONE_COLORS = {
  active: "bg-accent-active/15 text-accent-active ring-accent-active/25",
  warn: "bg-accent-warn/15 text-accent-warn ring-accent-warn/25",
  critical: "bg-accent-critical/15 text-accent-critical ring-accent-critical/25",
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
    <div className="rounded-xl border border-hairline bg-subtle-bg px-4 py-3">
      <div className="flex items-start justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
          {label}
        </span>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-subtle-bg text-text-tertiary">
          {icon}
        </span>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-mono-num text-[28px] font-semibold leading-none tracking-tight text-text-primary">
          {value}
        </span>
        {tone !== "neutral" && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${TONE_COLORS[tone]}`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                tone === "active"
                  ? "bg-accent-active"
                  : tone === "warn"
                    ? "bg-accent-warn"
                    : "bg-accent-critical"
              }`}
            />
            {TONE_LABEL[tone]}
          </span>
        )}
      </div>

      {hint && <p className="mt-2 text-[11px] text-text-tertiary">{hint}</p>}
    </div>
  );
}
