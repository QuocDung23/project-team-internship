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
          ? "border-accent-critical/30 bg-accent-critical/4"
          : "border-accent-warn/20 bg-accent-warn/3"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
              critical ? "bg-accent-critical" : "bg-accent-warn"
            }`}
          />
          <p className="truncate text-[13px] font-medium text-text-primary">
            {alert.title}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${
            critical
              ? "bg-accent-critical/15 text-accent-critical"
              : "bg-accent-warn/15 text-accent-warn"
          }`}
        >
          {alert.severity}
        </span>
      </div>
      <p className="mt-1.5 font-mono-num text-[11px] text-text-tertiary tabular-nums">
        {new Date(alert.ts).toLocaleString()}
        <span className="mx-2 text-text-tertiary/50">/</span>
        <span className="text-text-tertiary">{alert.detail}</span>
      </p>
    </div>
  );
}
