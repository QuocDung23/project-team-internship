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
      return "bg-accent-critical/15 text-accent-critical";
    case "idle":
      return "bg-surface-2 text-text-secondary";
    case "driving":
      return "bg-accent-active/15 text-accent-active";
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
      className={`border-b border-hairline/50 transition-colors hover:bg-subtle-bg-hover ${
        onSelect ? "cursor-pointer focus-within:bg-subtle-bg-hover focus:outline-none" : ""
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
              <span className="font-mono-num text-[11px] font-semibold text-accent-active">
                {driver.driverCode}
              </span>
              <span className="truncate text-[13px] font-semibold text-text-primary">
                {driver.name}
              </span>
            </div>
            <p className="mt-1 truncate text-[11px] text-text-tertiary">
              License {driver.licenseNumber} | {driver.email}
            </p>
          </div>
        </div>
      </td>
      <td className="py-4 pr-4 align-middle">
        <span className="font-mono-num text-[13px] font-semibold text-text-primary">
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
                ? "bg-accent-warn/10 text-accent-warn ring-1 ring-accent-warn/20"
                : "bg-surface-2 text-text-secondary ring-1 ring-hairline"
            }`}
          >
            <Warning size={13} />
            {driver.totalAlerts}
          </span>
          {driver.criticalAlerts > 0 ? (
            <span className="rounded-md bg-accent-critical/10 px-2 py-1 font-mono-num text-[11px] font-semibold text-accent-critical ring-1 ring-accent-critical/20">
              {driver.criticalAlerts} critical
            </span>
          ) : null}
        </div>
      </td>
      <td className="py-4 pr-4 align-middle">
        <div className="grid gap-1 text-[11px] text-text-tertiary">
          <span className="font-mono-num text-text-secondary">{driver.phone}</span>
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
            className="rounded-md border border-hairline px-3 py-1.5 text-[11px] font-semibold text-text-secondary transition hover:bg-subtle-bg-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isUpdating ? "Saving" : driver.status === "disable" ? "Enable" : "Disable"}
          </button>
        ) : null}
      </td>
    </tr>
  );
}

export default DriverRow;
