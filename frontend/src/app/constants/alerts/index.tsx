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

export const ALERT_TYPE_LABELS: Record<FleetEventType | "all", string> = {
  all: "All",
  drowsiness_alert: "Drowsiness",
  yawn_alert: "Yawn",
  distraction_alert: "Distraction",
  speed_alert: "Speed",
  collision_warning: "Collision",
  lane_departure: "Lane departure",
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
  critical: "Critical",
  warn: "Warning",
};

export const SEVERITY_FILTER_OPTIONS: ReadonlyArray<{
  value: SeverityFilter;
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "critical", label: SEVERITY_LABELS.critical },
  { value: "warn", label: SEVERITY_LABELS.warn },
];
