import {
  Eye,
  EyeOff,
  Phone,
  PhoneOff,
  AlertTriangle,
  Laugh,
  Shield,
} from "lucide-react";
import type { ReactNode } from "react";
import type { Driver, DriverStatus } from "../../types";
import type { KpiTone } from "../../types/dashboards";

// Eye state → small icon used inside the EAR cell.
const EYE_ICONS: Record<Driver["eyeState"], ReactNode> = {
  open: <Eye size={14} className="text-emerald-400" strokeWidth={2} />,
  closed: <EyeOff size={14} className="text-red-400" strokeWidth={2} />,
  yawning: <Laugh size={14} className="text-amber-400" strokeWidth={2} />,
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
  PHONE_ON_ICON: <Phone size={12} strokeWidth={2} />,
  PHONE_OFF_ICON: <PhoneOff size={12} strokeWidth={2} />,
  SEATBELT_ON_ICON: <Shield size={12} strokeWidth={2} />,
  SEATBELT_OFF_ICON: <Shield size={12} strokeWidth={2} />,
  WARN_ICON: <AlertTriangle size={11} strokeWidth={2} />,
} as const;

export default DriverConstants;
