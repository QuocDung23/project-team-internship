import { AlertTriangle, CheckCircle, MapPin, Truck } from "lucide-react";
import type { FleetAlertEvent } from "../../types/alerts";
import { formatTime } from "../../hook/useTicker";
import { StatusBadge } from "../monitoring/StatusBadge";
import {
  ALERT_TYPE_ICONS,
  ALERT_TYPE_LABELS,
  SEVERITY_LABELS,
} from "../../constants/alerts";

interface AlertRowProps {
  event: FleetAlertEvent;
  isAcknowledging?: boolean;
  onAcknowledge?: (event: FleetAlertEvent) => void;
}

export default function AlertRow({ event, isAcknowledging = false, onAcknowledge }: AlertRowProps) {
  const isCritical = event.severity === "critical";
  return (
    <div
      className={`flex flex-col gap-2 rounded-lg border p-3.5 transition-colors ${
        isCritical
          ? "border-red-500/20 bg-red-500/5"
          : "border-amber-500/15 bg-amber-500/5"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white ${
              isCritical ? "bg-red-500/30" : "bg-amber-500/20"
            }`}
          >
            {ALERT_TYPE_ICONS[event.type] ?? <AlertTriangle size={14} />}
          </span>
          <div>
            <p className="text-[12px] font-medium text-zinc-100">
              {event.driverName}
            </p>
            <p className="font-mono-num text-[10px] text-zinc-500">
              {event.licensePlate}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusBadge
            tone={isCritical ? "critical" : "warn"}
            label={SEVERITY_LABELS[event.severity]}
          />
          <span className="font-mono-num text-[10px] text-zinc-500">
            {formatTime(event.timestamp)}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-400">
        <span className="inline-flex items-center gap-1">
          <Truck size={11} />
          {event.driverId}
        </span>
        <span className="inline-flex items-center gap-1">
          <MapPin size={11} />
          {event.location}
        </span>
        {event.ear > 0 && (
          <span className="font-mono-num">
            EAR:{" "}
            <span
              className={event.ear < 0.17 ? "text-red-300" : "text-zinc-300"}
            >
              {event.ear.toFixed(3)}
            </span>
          </span>
        )}
        <span className="inline-flex items-center gap-1 rounded bg-surface-2 px-1.5 py-0.5 text-[10px] text-zinc-400">
          {ALERT_TYPE_LABELS[event.type]}
        </span>
      </div>

      {event.acknowledged ? (
        <div className="flex items-center gap-1 text-[10px] text-emerald-400">
          <CheckCircle size={11} fill="currentColor" />
          Đã xác nhận
        </div>
      ) : onAcknowledge ? (
        <button
          type="button"
          onClick={() => onAcknowledge(event)}
          disabled={isAcknowledging}
          className="inline-flex w-fit items-center gap-1 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-300 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <CheckCircle size={11} />
          {isAcknowledging ? "Đang xác nhận" : "Xác nhận"}
        </button>
      ) : null}
    </div>
  );
}
