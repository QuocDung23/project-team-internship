export interface AlertInfo {
  id: string;
  title: string;
  severity: "warn" | "critical";
  ts: number;
  detail: string;
}

export function AlertInfoRow({ alert }: { alert: AlertInfo }) {
  const critical = alert.severity === "critical";
  return (
    <div
      className={`tile px-3.5 py-2.5 ${
        critical
          ? "border-rose-500/30 bg-rose-500/[0.04]"
          : "border-amber-500/20 bg-amber-500/[0.03]"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
              critical ? "bg-rose-400" : "bg-amber-400"
            }`}
          />
          <p className="truncate text-[13px] font-medium text-zinc-100">
            {alert.title}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${
            critical
              ? "bg-rose-500/15 text-rose-300"
              : "bg-amber-500/15 text-amber-300"
          }`}
        >
          {alert.severity}
        </span>
      </div>
      <p className="mt-1.5 font-mono-num text-[11px] text-zinc-500 tabular-nums">
        {new Date(alert.ts).toLocaleString()}
        <span className="mx-2 text-zinc-700">/</span>
        <span className="text-zinc-400">{alert.detail}</span>
      </p>
    </div>
  );
}