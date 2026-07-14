"use client";
import { motion } from "motion/react";
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

const SEVERITY_CONFIG: Record<SeverityFilter, { active: string; inactive: string }> = {
  all: { 
    active: "bg-subtle-bg text-text-primary ring-hairline", 
    inactive: "text-text-tertiary hover:text-text-secondary hover:bg-subtle-bg-hover" 
  },
  critical: { 
    active: "bg-gradient-to-r from-accent-critical/20 to-accent-critical/10 text-accent-critical ring-accent-critical/30", 
    inactive: "text-text-tertiary hover:text-accent-critical hover:bg-accent-critical/10" 
  },
  warn: { 
    active: "bg-gradient-to-r from-accent-warn/20 to-accent-warn/10 text-accent-warn ring-accent-warn/30", 
    inactive: "text-text-tertiary hover:text-accent-warn hover:bg-accent-warn/10" 
  },
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
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
      className="relative overflow-hidden rounded-2xl border border-hairline bg-elevated p-px"
    >
      <div className="relative rounded-[1.375rem] bg-surface px-5 py-3.5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-subtle-bg ring-1 ring-hairline">
              <Filter size={13} className="text-text-tertiary" />
            </div>
            <span className="text-xs font-medium text-text-tertiary">Filters</span>
          </div>
          
          <div className="flex items-center gap-1.5">
            {SEVERITY_FILTER_OPTIONS.map((opt, index) => (
              <motion.button
                key={opt.value}
                type="button"
                onClick={() => onSeverityChange(opt.value)}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200 ${
                  severityFilter === opt.value
                    ? SEVERITY_CONFIG[opt.value].active
                    : SEVERITY_CONFIG[opt.value].inactive
                }`}
              >
                {opt.label}
              </motion.button>
            ))}
          </div>
          
          <div className="h-4 w-px bg-hairline" />
          
          <select
            value={typeFilter}
            onChange={(e) => onTypeChange(e.target.value as TypeFilter)}
            className="appearance-none cursor-pointer rounded-full border border-hairline bg-subtle-bg px-3.5 py-1.5 pr-8 text-xs font-medium text-text-secondary outline-none transition-all hover:border-hairline hover:bg-subtle-bg-hover focus:border-accent-active/40 focus:ring-1 focus:ring-accent-active/20"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 10px center',
            }}
          >
            {TYPE_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {ALERT_TYPE_LABELS[value as FleetEventType | "all"]}
              </option>
            ))}
          </select>
          
          <motion.label 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex cursor-pointer items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all hover:bg-subtle-bg-hover"
          >
            <div className="relative">
              <input
                type="checkbox"
                checked={showAcknowledged}
                onChange={(e) => onToggleAcknowledged(e.target.checked)}
                className="peer sr-only"
              />
              <div className="h-4 w-8 rounded-full bg-subtle-bg-hover ring-1 ring-hairline transition-all peer-checked:bg-accent-active/40 peer-checked:ring-accent-active/30" />
              <div className="absolute left-0.5 top-0.5 h-3 w-3 rounded-full bg-text-tertiary transition-all peer-checked:translate-x-4 peer-checked:bg-accent-active" />
            </div>
            <span className="text-text-tertiary">Show acknowledged</span>
          </motion.label>
        </div>
      </div>
    </motion.div>
  );
}
