import {
  BatteryLow,
  ClockClockwise,
  Gauge,
  MapPin,
  Thermometer,
  Timer,
} from "@phosphor-icons/react";
import { StatusBadge } from "../monitoring/StatusBadge";
import { formatTime } from "../../hook/useTicker";
import type { VehicleSnapshot } from "../../types/fleets";
import FleetConstants from "../../constants/fleets";

const { STATUS_CONFIG } = FleetConstants;

interface VehicleCardProps {
  vehicle: VehicleSnapshot;
}

function VehicleCard({ vehicle }: VehicleCardProps) {
  const cfg = STATUS_CONFIG[vehicle.status];
  const isWaitingLong = vehicle.status === "waiting" && vehicle.waitMinutes > 20;

  return (
    <div
      className={`panel flex flex-col gap-3 px-4 py-3 transition-colors ${
        isWaitingLong ? "border-amber-500/25" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[12px] font-semibold text-zinc-100">
            {vehicle.driverName}
          </p>
          <p className="font-mono-num text-[10px] text-zinc-500">
            {vehicle.licensePlate}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusBadge tone={cfg.tone} label={cfg.label} />
          <span className="inline-flex items-center gap-1 font-mono-num text-[10px] text-zinc-500">
            <ClockClockwise size={10} />
            {formatTime(vehicle.lastUpdate)}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-400">
        <span className="inline-flex items-center gap-1">
          <MapPin size={11} />
          {vehicle.team}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-md bg-surface-2 p-2">
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
          <Gauge size={11} className="shrink-0 text-zinc-500" />
          <span className="font-mono-num text-zinc-200">
            {vehicle.speedKmh}
          </span>
          <span>km/h</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
          <BatteryLow size={11} className="shrink-0 text-zinc-500" />
          <span className="font-mono-num text-zinc-200">
            {vehicle.fuelPercent}
          </span>
          <span>%</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
          <Thermometer size={11} className="shrink-0 text-zinc-500" />
          <span
            className={`font-mono-num ${
              vehicle.engineTemp > 90 ? "text-amber-300" : "text-zinc-200"
            }`}
          >
            {vehicle.engineTemp}°C
          </span>
        </div>
        {vehicle.status === "waiting" && (
          <div className="flex items-center gap-1.5 text-[10px]">
            <Timer
              size={11}
              className={`shrink-0 ${
                isWaitingLong ? "text-amber-300" : "text-zinc-500"
              }`}
            />
            <span
              className={`font-mono-num ${
                isWaitingLong ? "text-amber-300" : "text-zinc-200"
              }`}
            >
              {vehicle.waitMinutes}p
            </span>
          </div>
        )}
        {vehicle.status === "loading" && (
          <div className="flex flex-col gap-0.5">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-hairline">
              <div
                className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                style={{ width: `${vehicle.loadProgress}%` }}
              />
            </div>
            <span className="font-mono-num text-[9px] text-zinc-500">
              {vehicle.loadProgress}%
            </span>
          </div>
        )}
      </div>

      {isWaitingLong && (
        <div className="flex items-center gap-1.5 rounded bg-amber-500/10 px-2 py-1 text-[10px] font-medium text-amber-300">
          <Timer size={11} />
          Chờ lâu · {vehicle.waitMinutes}p
        </div>
      )}
    </div>
  );
}

export default VehicleCard;
