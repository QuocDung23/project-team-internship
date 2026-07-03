import {
  AlertTriangle,
  Eye,
  Frown,
  MapPin,
  ShieldAlert,
  Truck,
} from "lucide-react";
import type { ReactNode } from "react";
import type {
  FleetEventSeverity,
  FleetEventType,
  SeverityFilter,
} from "../../types/alerts";

// Vietnamese labels for the underlying alert types. Re-used in the filter
// <select> and inside the row chip so the copy stays in one place.
export const ALERT_TYPE_LABELS: Record<FleetEventType | "all", string> = {
  all: "Tất cả",
  drowsiness_alert: "Buồn ngủ",
  yawn_alert: "Ngáp",
  distraction_alert: "Mất tập trung",
  speed_alert: "Tốc độ",
  collision_warning: "Va chạm",
  lane_departure: "Lệch làn",
};

export const ALERT_TYPE_ICONS: Record<FleetEventType, ReactNode> = {
  drowsiness_alert: <Frown size={14} />,
  yawn_alert: <Eye size={14} />,
  distraction_alert: <AlertTriangle size={14} />,
  speed_alert: <Truck size={14} />,
  collision_warning: <ShieldAlert size={14} />,
  lane_departure: <MapPin size={14} />,
};

export const SEVERITY_LABELS: Record<FleetEventSeverity, string> = {
  critical: "Nguy hiểm",
  warn: "Cảnh báo",
};

export const SEVERITY_FILTER_OPTIONS: ReadonlyArray<{
  value: SeverityFilter;
  label: string;
}> = [
  { value: "all", label: "Tất cả" },
  { value: "critical", label: SEVERITY_LABELS.critical },
  { value: "warn", label: SEVERITY_LABELS.warn },
];
