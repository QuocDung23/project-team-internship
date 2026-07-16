import type { DriverStatus } from "../../types";
import type { KpiTone } from "../../types/dashboards";

const STATUS_LABEL_KEYS = {
  driving: "common:driverStatus.driving",
  idle: "common:driverStatus.idle",
  disable: "common:driverStatus.disable",
} as const satisfies Record<DriverStatus, string>;

const STATUS_TONE = {
  driving: "active",
  idle: "neutral",
  disable: "critical",
} as const satisfies Record<DriverStatus, KpiTone>;

const DashboardConstants = {
  STATUS_LABEL_KEYS,
  STATUS_TONE,
} as const;

export default DashboardConstants;