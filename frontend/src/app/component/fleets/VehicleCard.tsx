import {
  GaugeCircle,
  Clock4,
  MapPin,
  Thermometer,
  Timer,
  Fuel,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { StatusBadge } from "../monitoring/StatusBadge";
import { useAppLocale } from "../../i18n/useAppLocale";
import type { VehicleSnapshot } from "../../types/fleets";
import FleetConstants from "../../constants/fleets";

const { STATUS_CONFIG } = FleetConstants;

interface VehicleCardProps {
  vehicle: VehicleSnapshot;
}

function VehicleCard({ vehicle }: VehicleCardProps) {
  const { t } = useTranslation("trips");
  const { formatTime: localizedTime } = useAppLocale();
  const cfg = STATUS_CONFIG[vehicle.status];
  const isWaitingLong =
    vehicle.status === "waiting" && vehicle.waitMinutes > 20;

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 ${
        isWaitingLong
          ? "border-accent-warn/30 bg-accent-warn/5"
          : "border-hairline bg-subtle-bg hover:border-hairline hover:bg-subtle-bg-hover"
      }`}
    >
      <div className="absolute inset-0 bg-linear-to-br from-white/3 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-text-primary">
              {vehicle.driverName}
            </p>
            <p className="mt-0.5 font-mono-num text-[10px] text-text-tertiary">
              {vehicle.licensePlate}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <StatusBadge tone={cfg.tone} label={t(cfg.labelKey as "vehicle.status.waiting" | "vehicle.status.loading" | "vehicle.status.in_transit" | "vehicle.status.idle" | "vehicle.status.maintenance")} />
            <span className="inline-flex items-center gap-1 font-mono-num text-[10px] text-text-tertiary">
              <Clock4 size={10} strokeWidth={1.5} />
              {localizedTime(new Date(vehicle.lastUpdate))}
            </span>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-text-secondary">
          <span className="font-mono-num text-text-secondary">{vehicle.id}</span>
          <span className="inline-flex items-center gap-1">
            <MapPin size={11} strokeWidth={1.5} />
            {vehicle.team}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-subtle-bg p-3">
          <div className="flex items-center gap-2">
            <GaugeCircle
              size={13}
              strokeWidth={1.5}
              className="shrink-0 text-text-tertiary"
            />
            <span className="font-mono-num text-[11px] text-text-primary">
              {vehicle.speedKmh}
            </span>
            <span className="text-[10px] text-text-tertiary">{t("vehicle.card.speedUnit")}</span>
          </div>
          <div className="flex items-center gap-2">
            <Fuel
              size={13}
              strokeWidth={1.5}
              className="shrink-0 text-text-tertiary"
            />
            <span className="font-mono-num text-[11px] text-text-primary">
              {vehicle.fuelPercent}
            </span>
            <span className="text-[10px] text-text-tertiary">{t("vehicle.card.fuelUnit")}</span>
          </div>
          <div className="flex items-center gap-2">
            <Thermometer
              size={13}
              strokeWidth={1.5}
              className="shrink-0 text-text-tertiary"
            />
            <span
              className={`font-mono-num text-[11px] ${
                vehicle.engineTemp > 90 ? "text-accent-warn" : "text-text-primary"
              }`}
            >
              {vehicle.engineTemp}{t("vehicle.card.tempUnit")}
            </span>
          </div>
          {vehicle.status === "waiting" && (
            <div className="flex items-center gap-2">
              <Timer
                size={13}
                strokeWidth={1.5}
                className={`shrink-0 ${
                  isWaitingLong ? "text-accent-warn" : "text-text-tertiary"
                }`}
              />
              <span
                className={`font-mono-num text-[11px] ${
                  isWaitingLong ? "text-accent-warn" : "text-text-primary"
                }`}
              >
                {t("vehicle.card.wait", { count: vehicle.waitMinutes })}
              </span>
            </div>
          )}
          {vehicle.status === "loading" && (
            <div className="col-span-2 flex flex-col gap-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-subtle-bg-hover">
                <div
                  className="h-full rounded-full bg-accent-active/80 transition-all duration-500"
                  style={{ width: `${vehicle.loadProgress}%` }}
                />
              </div>
              <span className="font-mono-num text-[9px] text-text-tertiary">
                {t("vehicle.card.loadPercent", { count: vehicle.loadProgress })}
              </span>
            </div>
          )}
        </div>

        {isWaitingLong && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-accent-warn/10 px-3 py-2 ring-1 ring-accent-warn/20">
            <Timer size={12} strokeWidth={1.5} className="text-accent-warn" />
            <span className="text-[11px] font-medium text-accent-warn">
              {t("vehicle.card.extendedWait", { minutes: vehicle.waitMinutes })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default VehicleCard;
