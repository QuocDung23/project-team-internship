import { RefreshCw } from "lucide-react";
import { formatTime } from "../../hook/useTicker";

interface DashboardHeaderProps {
  now: number;
  connected: boolean;
}

export default function DashboardHeader({
  now,
  connected,
}: DashboardHeaderProps) {
  return (
    <header className="panel flex flex-wrap items-center justify-between gap-4 px-5 py-4">
      <div>
        <h1 className="text-base font-semibold tracking-tight text-zinc-100">
          Tổng quan đội xe
        </h1>
        <p className="mt-0.5 text-[12px] text-zinc-400">
          Ca trực đang chạy · 3 khu vực · cập nhật liên tục từ central backend
        </p>
      </div>
      <div className="flex items-center gap-3 text-[11px]">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-hairline bg-surface-2 px-2.5 py-1.5 text-zinc-400">
          <RefreshCw size={12} />
          <span className="font-mono-num">{formatTime(now)}</span>
        </span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 ring-1 ${
            connected
              ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/25"
              : "bg-zinc-500/10 text-zinc-300 ring-zinc-500/25"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              connected ? "bg-emerald-400" : "bg-zinc-400"
            }`}
          />
          {connected ? "Live" : "Connecting"}
        </span>
      </div>
    </header>
  );
}