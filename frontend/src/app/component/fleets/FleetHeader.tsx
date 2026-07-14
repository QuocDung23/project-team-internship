import { LucideTruck } from "lucide-react";
import type { FleetViewMode } from "../../types/fleets";

interface FleetHeaderProps {
  now: number;
  viewMode: FleetViewMode;
  onViewModeChange: (next: FleetViewMode) => void;
}

const VIEW_OPTIONS: ReadonlyArray<{ value: FleetViewMode; label: string }> = [
  { value: "all", label: "All Vehicles" },
  { value: "waiting", label: "Queued / Waiting" },
];

const VIEW_ACTIVE: Record<FleetViewMode, string> = {
  all: "bg-emerald-500/20 text-emerald-300",
  waiting: "bg-emerald-500/20 text-emerald-300",
};

function FleetHeader({ now, viewMode, onViewModeChange }: FleetHeaderProps) {
  return (
    <header className="panel flex flex-wrap items-center justify-between gap-4 px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
          <LucideTruck
            size={20}
            strokeWidth={1.5}
            className="text-emerald-400"
          />
        </div>
        <div>
          <h1 className="text-base font-semibold tracking-tight text-zinc-100">
            Fleet Overview
          </h1>
          <p className="mt-0.5 text-[12px] text-zinc-500">
            Live vehicle monitoring from central backend
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="inline-flex items-center gap-2 rounded-lg border border-hairline bg-surface-2/50 px-3 py-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          <span className="font-mono-num text-[11px] text-zinc-400">
            {new Date(now).toLocaleTimeString("en-US")}
          </span>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-hairline bg-surface-2/30 p-1">
          {VIEW_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onViewModeChange(opt.value)}
              className={`rounded-md px-3 py-1.5 text-[11px] font-medium transition-all duration-300 ${
                viewMode === opt.value
                  ? VIEW_ACTIVE[opt.value] + " shadow-sm"
                  : "text-zinc-500 hover:bg-surface-2/50 hover:text-zinc-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}

export default FleetHeader;
