export type FleetEventType =
  | "drowsiness_alert"
  | "yawn_alert"
  | "distraction_alert"
  | "speed_alert"
  | "collision_warning"
  | "lane_departure";

export type FleetEventSeverity = "warn" | "critical";

export type TypeFilter = "all" | FleetEventType;

export type SeverityFilter = "all" | FleetEventSeverity;

export interface AlertsStats {
  total: number;
  critical: number;
  warn: number;
  acknowledged: number;
}

export interface FleetAlertEvent {
  id: string;
  type: FleetEventType;
  driverId: string;
  driverName: string;
  licensePlate: string;
  ear: number;
  timestamp: number;
  acknowledged: boolean;
  severity: FleetEventSeverity;
  location: string;
}
