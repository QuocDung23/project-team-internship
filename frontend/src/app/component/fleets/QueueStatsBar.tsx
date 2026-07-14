import type { VehicleQueueStats } from "../../types/fleets";

type QueueTone = "warn" | "active" | "neutral";

const TONE_CONFIG: Record<QueueTone, { text: string; dot: string }> = {
  warn: { text: "text-accent-warn", dot: "bg-accent-warn" },
  active: { text: "text-accent-active", dot: "bg-accent-active" },
  neutral: { text: "text-text-primary", dot: "bg-text-tertiary" },
};

interface QueueStatsBarProps {
  stats: VehicleQueueStats;
}

function QueueStatsBar({ stats }: QueueStatsBarProps) {
  const avgTone: QueueTone =
    stats.avgWaitMinutes > 20 ? "warn" : "neutral";

  const items: ReadonlyArray<{ label: string; value: string; tone: QueueTone }> =
    [
      {
        label: "Queued",
        value: String(stats.waitingCount),
        tone: "warn",
      },
      {
        label: "Loading",
        value: String(stats.loadingCount),
        tone: "active",
      },
      {
        label: "In Transit",
        value: String(stats.transitCount),
        tone: "active",
      },
      {
        label: "Completed Today",
        value: String(stats.completedToday),
        tone: "neutral",
      },
      {
        label: "Avg Wait",
        value: `${stats.avgWaitMinutes}m`,
        tone: avgTone,
      },
    ];

  return (
    <div className="rounded-2xl border border-hairline bg-subtle-bg px-5 py-3.5">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {items.map(({ label, value, tone }) => (
          <div key={label} className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${TONE_CONFIG[tone].dot}`} />
              <span className={`relative inline-flex h-2 w-2 rounded-full ${TONE_CONFIG[tone].dot}`} />
            </span>
            <span className="text-[11px] text-text-tertiary">{label}</span>
            <span
              className={`font-mono-num text-[13px] font-semibold ${TONE_CONFIG[tone].text}`}
            >
              {value}
            </span>
          </div>
        ))}
        {Object.entries(stats.queueByTeam).length > 0 && (
          <>
            <div className="h-5 w-px bg-hairline" />
            <div className="flex items-center gap-4">
              <span className="text-[11px] text-text-tertiary">By Zone:</span>
              {Object.entries(stats.queueByTeam).map(([team, count]) => (
                <span key={team} className="flex items-center gap-1.5 text-[11px] text-text-secondary">
                  <span className="font-medium text-text-primary">{team}</span>
                  <span className="font-mono-num font-semibold text-text-primary">
                    {count}
                  </span>
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default QueueStatsBar;
