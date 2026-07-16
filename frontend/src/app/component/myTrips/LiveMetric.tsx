import { useTranslation } from "react-i18next";

type MetricLabelKey =
  | "monitoring.metricLabels.ear"
  | "monitoring.metricLabels.mar"
  | "monitoring.metricLabels.pitch"
  | "monitoring.metricLabels.dws"
  | "monitoring.metricLabels.fps"
  | "monitoring.metricLabels.noFace";

interface LiveMetricProps {
  labelKey: MetricLabelKey;
  value: string;
  alert: boolean;
}

export function LiveMetric({ labelKey, value, alert }: LiveMetricProps) {
  const { t } = useTranslation("trips");
  return (
    <div
      className={`tile px-3 py-2.5 ${
        alert ? "border-accent-critical/40 bg-accent-critical/6" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-text-tertiary">
          {t(labelKey)}
        </p>
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            alert ? "bg-accent-critical shadow-[0_0_8px_rgba(244,63,94,0.6)]" : "bg-accent-active/40"
          }`}
        />
      </div>
      <p
        className={`mt-1 font-mono-num text-lg font-semibold tabular-nums ${
          alert ? "text-accent-critical" : "text-text-primary"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
