import type { DriverStats } from "../../types/drivers";

interface DriverStatsBarProps {
  stats: DriverStats;
}

function DriverStatsBar({ stats }: DriverStatsBarProps) {
  const items: ReadonlyArray<{ label: string; value: number; tone: string }> = [
    { label: "Driving", value: stats.driving, tone: "text-emerald-400" },
    { label: "Available", value: stats.idle, tone: "text-zinc-400" },
    { label: "Disabled", value: stats.disable, tone: "text-red-400" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {items.map(({ label, value, tone }) => (
        <div key={label} className="flex items-center gap-1.5 text-[11px]">
          <span className="text-zinc-500">{label}:</span>
          <span className={`font-mono-num font-semibold ${tone}`}>{value}</span>
        </div>
      ))}
    </div>
  );
}

export default DriverStatsBar;
