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
  { value: "all", label: "Tất cả" },
  { value: "open", label: "Mở" },
  { value: "yawning", label: "Ngáp" },
  { value: "closed", label: "Nhắm" },
];

const EYE_ACTIVE: Record<DriverEyeFilter, string> = {
  all: "bg-surface-2 text-zinc-100",
  open: "bg-emerald-500/20 text-emerald-300",
  yawning: "bg-amber-500/20 text-amber-300",
  closed: "bg-red-500/20 text-red-300",
};

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
          className="absolute left-2.5 text-zinc-500"
        />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Tìm tên hoặc mã tài xế..."
          className="w-52 rounded-md border border-hairline bg-surface-2 pl-8 pr-3 py-1.5 text-[11px] text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-emerald-500/40"
        />
      </div>
      <div className="h-3 w-px bg-hairline" />
      <div className="flex items-center gap-1">
        <span className="text-[11px] text-zinc-500">Mắt:</span>
        {EYE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onEyeFilterChange(opt.value)}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
              eyeFilter === opt.value
                ? EYE_ACTIVE[opt.value]
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div className="h-3 w-px bg-hairline" />
      <div className="flex items-center gap-1">
        <span className="text-[11px] text-zinc-500">Trạng thái:</span>
        {STATUS_OPTIONS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onStatusFilterChange(value)}
            className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
              statusFilter === value
                ? STATUS_ACTIVE[value]
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {value === "all" ? "Tất cả" : STATUS_LABEL[value]}
          </button>
        ))}
      </div>
    </div>
  );
}

export default DriverFilters;
