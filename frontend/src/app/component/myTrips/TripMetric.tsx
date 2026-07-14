import type { ReactNode } from "react";

export function TripMetric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="tile px-3.5 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </p>
      <p className="mt-1 truncate font-mono-num text-[13px] font-medium text-zinc-100">
        {value}
      </p>
    </div>
  );
}