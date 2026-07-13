import { AlertTriangle, RefreshCw } from "lucide-react";

interface AlertHeaderProps {
  criticalCount: number;
  warnCount: number;
  onRefresh: () => void;
}

export default function AlertHeader({
  criticalCount,
  warnCount,
  onRefresh,
}: AlertHeaderProps) {
  const hasIncidents = criticalCount > 0 || warnCount > 0;
  return (
    <header className="panel flex flex-wrap items-center justify-between gap-4 px-5 py-4">
      <div>
        <h1 className="flex items-center gap-2 text-base font-semibold tracking-tight text-zinc-100">
          <AlertTriangle size={18} className="text-amber-400" />
          Nhật ký cảnh báo
        </h1>
        <p className="mt-0.5 text-[12px] text-zinc-400">
          Stream cảnh báo thời gian thực · cập nhật liên tục từ central backend
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {criticalCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md bg-red-500/10 px-2.5 py-1 text-[11px] font-medium text-red-300 ring-1 ring-red-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
              {criticalCount} nguy hiểm
            </span>
          )}
          {warnCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-300 ring-1 ring-amber-500/20">
              {warnCount} cảnh báo
            </span>
          )}
          {!hasIncidents && (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-medium text-emerald-300 ring-1 ring-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Không có cảnh báo mới
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-1.5 rounded-md border border-hairline bg-surface-2 px-2.5 py-1.5 text-[11px] text-zinc-400 hover:text-zinc-200"
        >
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>
    </header>
  );
}
