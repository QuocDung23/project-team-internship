import { useTranslation } from "react-i18next";
import type { DriverStats } from "../../types/drivers";

interface DriverStatsBarProps {
  stats: DriverStats;
}

function DriverStatsBar({ stats }: DriverStatsBarProps) {
  const { t } = useTranslation("drivers");

  const items: ReadonlyArray<{
    label: string;
    value: number;
    tone: string;
  }> = [
    {
      label: t("statsBar.driving"),
      value: stats.driving,
      tone: "text-accent-active",
    },
    {
      label: t("statsBar.idle"),
      value: stats.idle,
      tone: "text-text-secondary",
    },
    {
      label: t("statsBar.disable"),
      value: stats.disable,
      tone: "text-accent-critical",
    },
    {
      label: t("statsBar.eyesClosed"),
      value: stats.eyesClosed,
      tone: "text-accent-warn",
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {items.map(({ label, value, tone }) => (
        <div key={label} className="flex items-center gap-1.5 text-[11px]">
          <span className="text-text-tertiary">{label}:</span>
          <span className={`font-mono-num font-semibold ${tone}`}>{value}</span>
        </div>
      ))}
    </div>
  );
}

export default DriverStatsBar;
