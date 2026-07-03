import type { VehicleQueueStats } from "../../data/mockMetrics";

type QueueTone = "warn" | "active" | "neutral";

const TONE_COLOR: Record<QueueTone, string> = {
  warn: "text-amber-400",
  active: "text-emerald-400",
  neutral: "text-zinc-200",
};

interface QueueStatsBarProps {
  stats: VehicleQueueStats;
}

function QueueStatsBar({ stats }: QueueStatsBarProps) {
  const avgTone: QueueTone =
    stats.avgWaitMinutes > 20 ? "warn" : "neutral";

  const items: ReadonlyArray<{ label: string; value: string; tone: QueueTone }> =
    [
      { label: "Đang đợi", value: String(stats.waitingCount), tone: "warn" },
      {
        label: "Đang xếp hàng",
        value: String(stats.loadingCount),
        tone: "active",
      },
      {
        label: "Đang chạy",
        value: String(stats.transitCount),
        tone: "active",
      },
      {
        label: "Hoàn thành hôm nay",
        value: String(stats.completedToday),
        tone: "neutral",
      },
      {
        label: "TB chờ",
        value: `${stats.avgWaitMinutes}p`,
        tone: avgTone,
      },
    ];

  return (
    <div className="panel flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5">
      {items.map(({ label, value, tone }) => (
        <div key={label} className="flex items-center gap-2">
          <span className="text-[11px] text-zinc-400">{label}</span>
          <span
            className={`font-mono-num text-[13px] font-semibold ${TONE_COLOR[tone]}`}
          >
            {value}
          </span>
        </div>
      ))}
      {Object.entries(stats.queueByTeam).length > 0 && (
        <>
          <div className="h-3 w-px bg-hairline" />
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-zinc-400">Theo khu vực:</span>
            {Object.entries(stats.queueByTeam).map(([team, count]) => (
              <span key={team} className="text-[11px] text-zinc-300">
                {team}:{" "}
                <span className="font-mono-num font-semibold text-zinc-100">
                  {count}
                </span>
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default QueueStatsBar;
