import { RotateCcw, Truck as LucideTruck } from "lucide-react";
import type { FleetViewMode } from "../../types/fleets";

interface FleetHeaderProps {
  now: number;
  viewMode: FleetViewMode;
  onViewModeChange: (next: FleetViewMode) => void;
}

const VIEW_OPTIONS: ReadonlyArray<{ value: FleetViewMode; label: string }> = [
  { value: "all", label: "Tất cả xe" },
  { value: "waiting", label: "Xe đợi / xếp hàng" },
];

const VIEW_ACTIVE: Record<FleetViewMode, string> = {
  all: "bg-emerald-500/20 text-emerald-300",
  waiting: "bg-emerald-500/20 text-emerald-300",
};

function FleetHeader({ now, viewMode, onViewModeChange }: FleetHeaderProps) {
  return (
    <header className="panel flex flex-wrap items-center justify-between gap-4 px-5 py-4">
      <div>
        <h1 className="flex items-center gap-2 text-base font-semibold tracking-tight text-zinc-100">
          <LucideTruck size={18} strokeWidth={2} className="text-emerald-400" />
          Đội xe
        </h1>
        <p className="mt-0.5 text-[12px] text-zinc-400">
          Quản lý xe · cập nhật liên tục từ central backend
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div className="inline-flex items-center gap-1 rounded-md border border-hairline bg-surface-2 px-2.5 py-1.5 text-[11px] text-zinc-400">
          <RotateCcw size={12} strokeWidth={2} />
          <span className="font-mono-num">
            {new Date(now).toLocaleTimeString("vi-VN")}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {VIEW_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onViewModeChange(opt.value)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                viewMode === opt.value
                  ? VIEW_ACTIVE[opt.value]
                  : "text-zinc-500 hover:text-zinc-300"
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
