import type { DriverStatus } from "../../types";
import type { KpiTone } from "../../types/dashboards";

// Driver status → human label in Vietnamese.
const STATUS_LABEL: Record<DriverStatus, string> = {
  active: "Bình thường",
  warn: "Cảnh báo",
  critical: "Nguy hiểm",
  offline: "Offline",
};

// Driver status → badge tone for the StatusBadge / KpiCard component.
const STATUS_TONE: Record<DriverStatus, KpiTone> = {
  active: "active",
  warn: "warn",
  critical: "critical",
  offline: "neutral",
};

const DashboardConstants = {
  STATUS_LABEL,
  STATUS_TONE,
} as const;

export default DashboardConstants;
