import {
  Eye,
  EyeClosed,
  Phone,
  PhoneDisconnect,
  Seatbelt,
  SmileyXEyes,
  Warning,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import type { Driver, DriverStatus } from "../../types";
import type { KpiTone } from "../../types/dashboards";

// Eye state → small icon used inside the EAR cell.
const EYE_ICONS: Record<Driver["eyeState"], ReactNode> = {
  open: <Eye size={14} className="text-emerald-400" />,
  closed: <EyeClosed size={14} className="text-red-400" />,
  yawning: <SmileyXEyes size={14} className="text-amber-400" />,
};

// Vietnamese labels for the driver status.
const STATUS_LABEL: Record<DriverStatus, string> = {
  driving: "Driving",
  idle: "Idle",
  disable: "Disable",
};

// Map driver status → badge tone shared by `StatusBadge` and `KpiCard`.
const STATUS_TONE: Record<DriverStatus, KpiTone> = {
  driving: "active",
  idle: "neutral",
  disable: "critical",
};

const DriverConstants = {
  EYE_ICONS,
  STATUS_LABEL,
  STATUS_TONE,
  PHONE_ON_ICON: <Phone size={12} weight="fill" />,
  PHONE_OFF_ICON: <PhoneDisconnect size={12} />,
  SEATBELT_ON_ICON: <Seatbelt size={12} />,
  SEATBELT_OFF_ICON: <Seatbelt size={12} weight="fill" />,
  WARN_ICON: <Warning size={11} />,
} as const;

export default DriverConstants;
