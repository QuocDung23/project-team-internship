import { Search } from "lucide-react";
import DriverConstants from "../../constants/drivers";
import type {
  DriverEyeFilter,
  DriverStatusFilter,
} from "../../types/drivers";

const { STATUS_LABEL } = DriverConstants;

interface DriverFiltersProps {
  search: string;
  eyeFilter: DriverEyeFilter;
  statusFilter: DriverStatusFilter;
  onSearchChange: (next: string) => void;
  onEyeFilterChange: (next: DriverEyeFilter) => void;
  onStatusFilterChange: (next: DriverStatusFilter) => void;
}

const EYE_OPTIONS: ReadonlyArray<{ value: DriverEyeFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "yawning", label: "Yawning" },
  { value: "closed", label: "Closed" },
];

const EYE_ACTIVE: Record<DriverEyeFilter, string> = {
  all: "bg-surface-2 text-text-primary",
  open: "bg-accent-active/20 text-accent-active",
  yawning: "bg-accent-warn/20 text-accent-warn",
  closed: "bg-accent-critical/20 text-accent-critical",
};

const STATUS_OPTIONS: ReadonlyArray<DriverStatusFilter> = [
  "all",
  "driving",
  "idle",
  "disable",
];

const STATUS_ACTIVE: Record<DriverStatusFilter, string> = {
  all: "bg-accent-active/20 text-accent-active",
  driving: "bg-accent-active/20 text-accent-active",
  idle: "bg-surface-2 text-text-secondary",
  disable: "bg-accent-critical/20 text-accent-critical",
};

function DriverFilters({
  search,
  eyeFilter,
  statusFilter,
  onSearchChange,
  onEyeFilterChange,
  onStatusFilterChange,
}: DriverFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex items-center">
        <Search
          size={13}
          className="absolute left-2.5 text-text-tertiary"
        />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name or driver code..."
          className="w-52 rounded-md border border-hairline bg-surface-2 pl-8 pr-3 py-1.5 text-[11px] text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent-active/40"
        />
      </div>
      <div className="h-3 w-px bg-hairline" />
      <div className="flex items-center gap-1">
        <span className="text-[11px] text-text-tertiary">Eyes:</span>
        {EYE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onEyeFilterChange(opt.value)}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
              eyeFilter === opt.value
                ? EYE_ACTIVE[opt.value]
                : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div className="h-3 w-px bg-hairline" />
      <div className="flex items-center gap-1">
        <span className="text-[11px] text-text-tertiary">Status:</span>
        {STATUS_OPTIONS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onStatusFilterChange(value)}
            className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
              statusFilter === value
                ? STATUS_ACTIVE[value]
                : "text-text-tertiary hover:text-text-secondary"
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
