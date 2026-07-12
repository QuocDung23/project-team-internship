import type { DriverStatus } from "../../types";
import type { KpiTone } from "../../types/dashboards";

// Driver status → human label in Vietnamese.
const STATUS_LABEL: Record<DriverStatus, string> = {
  driving: "Driving",
  idle: "Idle",
  disable: "Disable",
};

// Driver status → badge tone for the StatusBadge / KpiCard component.
const STATUS_TONE: Record<DriverStatus, KpiTone> = {
  driving: "active",
  idle: "neutral",
  disable: "critical",
};

const DashboardConstants = {
  STATUS_LABEL,
  STATUS_TONE,
} as const;

export default DashboardConstants;
