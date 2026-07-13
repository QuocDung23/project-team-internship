import { MagnifyingGlass } from "@phosphor-icons/react";
import DriverConstants from "../../constants/drivers";
import type { DriverStatusFilter } from "../../types/drivers";

const { STATUS_LABEL } = DriverConstants;

interface DriverFiltersProps {
  search: string;
  statusFilter: DriverStatusFilter;
  onSearchChange: (next: string) => void;
  onStatusFilterChange: (next: DriverStatusFilter) => void;
}

const STATUS_OPTIONS: ReadonlyArray<DriverStatusFilter> = [
  "all",
  "driving",
  "idle",
  "disable",
];

const STATUS_ACTIVE: Record<DriverStatusFilter, string> = {
  all: "bg-emerald-500/20 text-emerald-300",
  driving: "bg-emerald-500/20 text-emerald-300",
  idle: "bg-zinc-500/20 text-zinc-300",
  disable: "bg-red-500/20 text-red-300",
};

function DriverFilters({
  search,
  statusFilter,
  onSearchChange,
  onStatusFilterChange,
}: DriverFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex items-center">
        <MagnifyingGlass
          size={13}
          className="absolute left-2.5 text-zinc-500"
        />
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search name, code, plate, phone..."
          className="w-72 rounded-md border border-hairline bg-surface-2 py-2 pl-8 pr-3 text-[12px] text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-emerald-500/40"
        />
      </div>
      <div className="h-3 w-px bg-hairline" />
      <div className="flex items-center gap-1">
        <span className="text-[11px] text-zinc-500">Status:</span>
        {STATUS_OPTIONS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onStatusFilterChange(value)}
            className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
              statusFilter === value
                ? STATUS_ACTIVE[value]
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {value === "all" ? "All" : STATUS_LABEL[value]}
          </button>
        ))}
      </div>
    </div>
  );
}

export default DriverFilters;
