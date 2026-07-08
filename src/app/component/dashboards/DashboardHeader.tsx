import { ClockClockwise } from "@phosphor-icons/react";
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
    <header
      className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 rounded-2xl border"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-hairline)',
      }}
    >
      <div>
        <h1
          className="text-base font-semibold tracking-tight"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Tổng quan đội xe
        </h1>
        <p
          className="mt-0.5 text-[12px]"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Ca trực đang chạy · 3 khu vực · cập nhật liên tục từ central backend
        </p>
      </div>
      <div className="flex items-center gap-3 text-[11px]">
        <span
          className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5"
          style={{
            borderColor: 'var(--color-hairline)',
            backgroundColor: 'var(--color-surface-2)',
            color: 'var(--color-text-secondary)',
          }}
        >
          <ClockClockwise size={12} />
          <span className="font-mono-num">{formatTime(now)}</span>
        </span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 ring-1`}
          style={
            connected
              ? {
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  color: 'var(--color-accent-active)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                }
              : {
                  backgroundColor: 'rgba(113, 113, 122, 0.1)',
                  color: 'var(--color-text-secondary)',
                  border: '1px solid rgba(113, 113, 122, 0.25)',
                }
          }
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{
              backgroundColor: connected
                ? 'var(--color-accent-active)'
                : 'var(--color-text-tertiary)',
            }}
          />
          {connected ? "Live" : "Connecting"}
        </span>
      </div>
    </header>
  );
}