import { Filter } from "lucide-react";
import {
  ALERT_TYPE_LABELS,
  SEVERITY_FILTER_OPTIONS,
} from "../../constants/alerts";
import type {
  FleetEventType,
  SeverityFilter,
  TypeFilter,
} from "../../types/alerts";

interface AlertFiltersProps {
  severityFilter: SeverityFilter;
  typeFilter: TypeFilter;
  showAcknowledged: boolean;
  onSeverityChange: (next: SeverityFilter) => void;
  onTypeChange: (next: TypeFilter) => void;
  onToggleAcknowledged: (next: boolean) => void;
}

const SEVERITY_ACTIVE: Record<SeverityFilter, string> = {
  all: "bg-surface-2 text-zinc-100",
  critical: "bg-red-500/20 text-red-300",
  warn: "bg-amber-500/20 text-amber-300",
};

const TYPE_OPTIONS: ReadonlyArray<TypeFilter> = [
  "all",
  "drowsiness_alert",
  "yawn_alert",
  "distraction_alert",
  "speed_alert",
  "collision_warning",
  "lane_departure",
];

export default function AlertFilters({
  severityFilter,
  typeFilter,
  showAcknowledged,
  onSeverityChange,
  onTypeChange,
  onToggleAcknowledged,
}: AlertFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
        <Filter size={13} />
        Lọc:
      </div>
      <div className="flex items-center gap-1">
        {SEVERITY_FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSeverityChange(opt.value)}
            className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
              severityFilter === opt.value
                ? SEVERITY_ACTIVE[opt.value]
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div className="h-3 w-px bg-hairline" />
      <select
        value={typeFilter}
        onChange={(e) => onTypeChange(e.target.value as TypeFilter)}
        className="rounded-md border border-hairline bg-surface-2 px-2.5 py-1 text-[11px] text-zinc-300 outline-none focus:border-emerald-500/40"
      >
        {TYPE_OPTIONS.map((value) => (
          <option key={value} value={value}>
            {ALERT_TYPE_LABELS[value as FleetEventType | "all"]}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-1.5 text-[11px] text-zinc-400">
        <input
          type="checkbox"
          checked={showAcknowledged}
          onChange={(e) => onToggleAcknowledged(e.target.checked)}
          className="h-3.5 w-3.5 rounded border-hairline accent-emerald-500"
        />
        Hiển thị đã xác nhận
      </label>
    </div>
  );
}
