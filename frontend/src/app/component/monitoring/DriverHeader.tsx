import { Car, Phone, IdentificationCard, MapPin } from "@phosphor-icons/react";
import type { Driver } from "../../types";
import type { MetricStatus } from "../../types/monitoring";
import { StatusBadge } from "./StatusBadge";

interface DriverHeaderProps {
  driver: Driver | null;
  route: string;
  status: MetricStatus;
}

export function DriverHeader({ driver, route, status }: DriverHeaderProps) {
  return (
    <header className="panel flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
      {/* Avatar block */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-linear-to-br from-zinc-700 to-zinc-900 text-lg font-semibold text-zinc-100 ring-1 ring-zinc-700">
          {initials(driver?.name ?? "Detector")}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold tracking-tight text-zinc-100">
              {driver?.name ?? "Detector not linked to a driver"}
            </h1>
            <StatusBadge tone={status} label={statusLabel(status)} size="md" />
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-zinc-400">
            <span className="inline-flex items-center gap-1">
              <IdentificationCard size={12} weight="duotone" />
              <span className="font-mono-num">{driver?.id ?? "no-trip"}</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <Car size={12} weight="duotone" />
              <span className="font-mono-num">{driver?.licensePlate ?? "-"}</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <Phone size={12} weight="duotone" />
              <span className="font-mono-num">{driver?.phone ?? "-"}</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin size={12} weight="duotone" />
              {driver?.team ?? "Backend detector"}
            </span>
          </div>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-3 border-l border-zinc-800 pl-6">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">
            Tuyến đang chạy
          </p>
          <p className="mt-0.5 text-sm font-medium text-zinc-100">{route}</p>
        </div>
        <div className="border-l border-zinc-800 pl-6">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">
            Cảnh báo ca
          </p>
          <p className="mt-0.5 text-sm font-mono-num font-semibold text-amber-300">
            {driver?.totalAlerts ?? 0}
          </p>
        </div>
      </div>
    </header>
  );
}

function statusLabel(status: MetricStatus): string {
  switch (status) {
    case "active":
      return "Đang chạy";
    case "warn":
      return "Cảnh báo";
    case "critical":
      return "Nguy hiểm";
  }
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}
