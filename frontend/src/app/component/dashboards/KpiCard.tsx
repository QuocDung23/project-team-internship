import { useTranslation } from "react-i18next";
import type { KpiCardProps } from "../../types/dashboards";

type ToneKey = NonNullable<KpiCardProps["tone"]>;

type ToneLabelKey = "dashboard:kpi.tones.ok" | "dashboard:kpi.tones.warn" | "dashboard:kpi.tones.risk";

const TONE_LABEL_KEYS = {
  active: "dashboard:kpi.tones.ok",
  warn: "dashboard:kpi.tones.warn",
  critical: "dashboard:kpi.tones.risk",
  neutral: null,
} as const satisfies Record<ToneKey, ToneLabelKey | null>;

const TONE_COLORS: Record<ToneKey, string> = {
  active: "bg-accent-active/15 text-accent-active ring-accent-active/25",
  warn: "bg-accent-warn/15 text-accent-warn ring-accent-warn/25",
  critical: "bg-accent-critical/15 text-accent-critical ring-accent-critical/25",
  neutral: "",
};

const DOT_COLORS: Record<ToneKey, string> = {
  active: "bg-accent-active",
  warn: "bg-accent-warn",
  critical: "bg-accent-critical",
  neutral: "bg-text-tertiary",
};

export default function KpiCard({
  label,
  value,
  hint,
  tone = "neutral",
  icon,
}: KpiCardProps) {
  const { t } = useTranslation(["dashboard", "common"]);
  const toneKey = TONE_LABEL_KEYS[tone];

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
        {toneKey ? (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${TONE_COLORS[tone]}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${DOT_COLORS[tone]}`} aria-hidden />
            {t(toneKey)}
          </span>
        ) : null}
      </div>

      {hint ? <p className="mt-2 text-[11px] text-text-tertiary">{hint}</p> : null}
    </div>
  );
}