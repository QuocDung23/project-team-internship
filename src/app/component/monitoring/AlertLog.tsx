import { Bell, Lightning } from "@phosphor-icons/react";
import type { MockAlert } from "../../data/mockMetrics";
import { formatAgo } from "../../hook/useTicker";

interface AlertLogProps {
  alerts: MockAlert[];
  now: number;
}

export function AlertLog({ alerts, now }: AlertLogProps) {
  return (
    <section className="panel px-4 py-4">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell size={14} weight="duotone" className="text-zinc-400" />
          <h3 className="text-[13px] font-semibold tracking-tight text-zinc-100">
            Cảnh báo gần đây
          </h3>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-zinc-500">
          {alerts.length} sự kiện
        </span>
      </header>

      <ul className="divide-y divide-zinc-800/80">
        {alerts.map((a) => (
          <li
            key={a.id}
            className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0"
          >
            <span
              className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ring-1 ${
                a.severity === "critical"
                  ? "bg-rose-500/10 text-rose-300 ring-rose-500/20"
                  : "bg-amber-500/10 text-amber-300 ring-amber-500/20"
              }`}
              aria-hidden
            >
              <Lightning size={14} weight="bold" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p
                  className={`text-[13px] font-medium ${
                    a.severity === "critical"
                      ? "text-rose-200"
                      : "text-amber-200"
                  }`}
                >
                  {a.title}
                </p>
                <span className="shrink-0 text-[11px] font-mono-num text-zinc-500">
                  {formatAgo(a.ts, now)}
                </span>
              </div>
              <p className="mt-0.5 text-[12px] text-zinc-400">{a.detail}</p>
              <p className="mt-0.5 text-[10px] font-mono-num uppercase tracking-wider text-zinc-600">
                {a.id}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
