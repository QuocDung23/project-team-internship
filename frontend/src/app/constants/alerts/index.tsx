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
  TypeFilter,
} from "../../types/alerts";

/**
 * Pure data tables for the Alerts domain. These hold only icon mappings and
 * enum membership — never user-facing strings. Components read labels through
 * `useTranslation("alerts")` keys like `filters.type.<code>`.
 */
export const ALERT_TYPE_ICONS: Record<FleetEventType, ReactNode> = {
  drowsiness_alert: <Frown size={14} />,
  yawn_alert: <Eye size={14} />,
  distraction_alert: <AlertTriangle size={14} />,
  speed_alert: <Truck size={14} />,
  collision_warning: <ShieldAlert size={14} />,
  lane_departure: <MapPin size={14} />,
};

/**
 * The set of type codes that may appear in the filter dropdown. Pinned to
 * `TypeFilter` so a new code has to be added explicitly rather than guessed
 * from the mapper.
 */
export const TYPE_FILTER_OPTIONS: ReadonlyArray<TypeFilter> = [
  "all",
  "drowsiness_alert",
  "yawn_alert",
  "distraction_alert",
  "speed_alert",
  "collision_warning",
  "lane_departure",
];

export const SEVERITY_FILTER_OPTIONS: ReadonlyArray<{
  value: SeverityFilter;
}> = [
  { value: "all" },
  { value: "critical" },
  { value: "warn" },
];

/**
 * Translation key resolver for the filter dropdown. Pure functions keep the
 * i18n namespace and suffix together so callers don't sprinkle string
 * literals across components.
 */
export const ALERT_TYPE_LABEL_KEYS: Record<FleetEventType | "all", readonly string[]> = {
  all: ["filters", "type", "all"],
  drowsiness_alert: ["filters", "type", "drowsiness_alert"],
  yawn_alert: ["filters", "type", "yawn_alert"],
  distraction_alert: ["filters", "type", "distraction_alert"],
  speed_alert: ["filters", "type", "speed_alert"],
  collision_warning: ["filters", "type", "collision_warning"],
  lane_departure: ["filters", "type", "lane_departure"],
};

export const SEVERITY_LABEL_KEYS: Record<FleetEventSeverity | "all", readonly string[]> = {
  all: ["filters", "severity", "all"],
  critical: ["filters", "severity", "critical"],
  warn: ["filters", "severity", "warn"],
};

export const ALERT_TYPE_KEYS: Record<FleetEventType | "all", readonly string[]> = {
  all: ["type", "unknown"],
  drowsiness_alert: ["type", "drowsiness_alert"],
  yawn_alert: ["type", "yawn_alert"],
  distraction_alert: ["type", "distraction_alert"],
  speed_alert: ["type", "speed_alert"],
  collision_warning: ["type", "collision_warning"],
  lane_departure: ["type", "lane_departure"],
};

export const SEVERITY_KEYS: Record<FleetEventSeverity, readonly string[]> = {
  critical: ["severity", "critical"],
  warn: ["severity", "warn"],
};
