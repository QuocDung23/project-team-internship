import type { AlertsStats } from "../../types/alerts";

interface AlertStatsRowProps {
  stats: AlertsStats;
}

type StatTone = "neutral" | "critical" | "warn" | "active";

const VALUE_COLOR: Record<StatTone, string> = {
  neutral: "text-zinc-100",
  critical: "text-red-400",
  warn: "text-amber-400",
  active: "text-emerald-400",
};

export default function AlertStatsRow({ stats }: AlertStatsRowProps) {
  const items: ReadonlyArray<{ label: string; value: number; tone: StatTone }> =
    [
      { label: "Tổng sự kiện", value: stats.total, tone: "neutral" },
      { label: "Nguy hiểm", value: stats.critical, tone: "critical" },
      { label: "Cảnh báo", value: stats.warn, tone: "warn" },
      { label: "Đã xác nhận", value: stats.acknowledged, tone: "active" },
    ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map(({ label, value, tone }) => (
        <div key={label} className="panel flex flex-col gap-2 px-4 py-3">
          <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
            {label}
          </span>
          <span className={`font-mono-num text-2xl font-semibold ${VALUE_COLOR[tone]}`}>
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}
