import { Warning } from "@phosphor-icons/react";
import { StatusBadge } from "../monitoring/StatusBadge";
import type { Driver } from "../../types";
import DriverConstants from "../../constants/drivers";

const {
  STATUS_LABEL,
  STATUS_TONE,
} = DriverConstants;

interface DriverRowProps {
  driver: Driver;
  isUpdating?: boolean;
  onSelect?: (driver: Driver) => void;
  onSetAvailability?: (driver: Driver, enabled: boolean) => void;
}

function avatarTone(status: Driver["status"]): string {
  switch (status) {
    case "disable":
      return "bg-red-500/15 text-red-300";
    case "idle":
      return "bg-zinc-500/15 text-zinc-400";
    case "driving":
      return "bg-emerald-500/15 text-emerald-300";
  }
}

function DriverRow({
  driver,
  isUpdating = false,
  onSelect,
  onSetAvailability,
}: DriverRowProps) {
  const canToggleAvailability = Boolean(onSetAvailability) && driver.status !== "driving";
  return (
    <tr
      tabIndex={onSelect ? 0 : undefined}
      onClick={() => onSelect?.(driver)}
      onKeyDown={(event) => {
        if (!onSelect) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(driver);
        }
      }}
      className={`border-b border-hairline/50 transition-colors hover:bg-surface-2/40 ${
        onSelect ? "cursor-pointer focus-within:bg-surface-2/50 focus:outline-none" : ""
      }`}
    >
      <td className="px-4 py-4 align-middle">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[14px] font-semibold ${avatarTone(driver.status)}`}
          >
            {driver.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-mono-num text-[11px] font-semibold text-emerald-300">
                {driver.driverCode}
              </span>
              <span className="truncate text-[13px] font-semibold text-zinc-100">
                {driver.name}
              </span>
            </div>
            <p className="mt-1 truncate text-[11px] text-zinc-500">
              License {driver.licenseNumber} | {driver.email}
            </p>
          </div>
        </div>
      </td>
      <td className="py-4 pr-4 align-middle">
        <span className="font-mono-num text-[13px] font-semibold text-zinc-200">
          {driver.licensePlate}
        </span>
      </td>
      <td className="py-4 pr-4 align-middle">
        <StatusBadge
          tone={STATUS_TONE[driver.status]}
          label={STATUS_LABEL[driver.status]}
        />
      </td>
      <td className="py-4 pr-4 align-middle">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono-num text-[11px] font-semibold ${
              driver.totalAlerts > 0
                ? "bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20"
                : "bg-zinc-800/40 text-zinc-500 ring-1 ring-zinc-700/40"
            }`}
          >
            <Warning size={13} />
            {driver.totalAlerts}
          </span>
          {driver.criticalAlerts > 0 ? (
            <span className="rounded-md bg-red-500/10 px-2 py-1 font-mono-num text-[11px] font-semibold text-red-300 ring-1 ring-red-500/20">
              {driver.criticalAlerts} critical
            </span>
          ) : null}
        </div>
      </td>
      <td className="py-4 pr-4 align-middle">
        <div className="grid gap-1 text-[11px] text-zinc-500">
          <span className="font-mono-num text-zinc-300">{driver.phone}</span>
          <span className="truncate">{driver.email}</span>
        </div>
      </td>
      <td className="py-4 pl-3 pr-4 align-middle">
        {onSetAvailability ? (
          <button
            type="button"
            disabled={!canToggleAvailability || isUpdating}
            onClick={(event) => {
              event.stopPropagation();
              onSetAvailability(driver, driver.status === "disable");
            }}
            className="rounded-md border border-hairline px-3 py-1.5 text-[11px] font-semibold text-zinc-300 transition hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isUpdating ? "Saving" : driver.status === "disable" ? "Enable" : "Disable"}
          </button>
        ) : null}
      </td>
    </tr>
  );
}

export default DriverRow;
