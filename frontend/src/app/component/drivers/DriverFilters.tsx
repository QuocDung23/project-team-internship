import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import type {
  DriverEyeFilter,
  DriverStatusFilter,
} from "../../types/drivers";

interface DriverFiltersProps {
  search: string;
  eyeFilter: DriverEyeFilter;
  statusFilter: DriverStatusFilter;
  onSearchChange: (next: string) => void;
  onEyeFilterChange: (next: DriverEyeFilter) => void;
  onStatusFilterChange: (next: DriverStatusFilter) => void;
}

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

const EYE_OPTIONS: ReadonlyArray<DriverEyeFilter> = [
  "all",
  "open",
  "yawning",
  "closed",
];

function DriverFilters({
  search,
  eyeFilter,
  statusFilter,
  onSearchChange,
  onEyeFilterChange,
  onStatusFilterChange,
}: DriverFiltersProps) {
  const { t } = useTranslation("drivers");

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex items-center">
        <Search
          size={13}
          className="absolute left-2.5 text-text-tertiary"
          aria-hidden
        />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("filters.searchPlaceholder")}
          aria-label={t("filters.searchPlaceholder")}
          className="w-52 rounded-md border border-hairline bg-surface-2 pl-8 pr-3 py-1.5 text-[11px] text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent-active/40"
        />
      </div>
      <div className="h-3 w-px bg-hairline" aria-hidden />
      <div className="flex items-center gap-1">
        <span className="text-[11px] text-text-tertiary">
          {t("filters.eyeLabel")}
        </span>
        {EYE_OPTIONS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onEyeFilterChange(value)}
            aria-pressed={eyeFilter === value}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
              eyeFilter === value
                ? EYE_ACTIVE[value]
                : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            {t(`filters.options.eye.${value}`)}
          </button>
        ))}
      </div>
      <div className="h-3 w-px bg-hairline" aria-hidden />
      <div className="flex items-center gap-1">
        <span className="text-[11px] text-text-tertiary">
          {t("filters.statusLabel")}
        </span>
        {STATUS_OPTIONS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onStatusFilterChange(value)}
            aria-pressed={statusFilter === value}
            className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
              statusFilter === value
                ? STATUS_ACTIVE[value]
                : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            {t(`filters.options.status.${value}`)}
          </button>
        ))}
      </div>
    </div>
  );
}

export default DriverFilters;
