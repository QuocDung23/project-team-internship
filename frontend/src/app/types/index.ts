export type DriverStatus = "driving" | "idle" | "disable";

export type EyeState = "open" | "closed" | "yawning";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  licensePlate: string;
  team: string;
  status: DriverStatus;
  ear: number; // Eye Aspect Ratio - lower = eyes closing
  eyeState: EyeState;
  position: GeoPoint;
  lastUpdate: number; // epoch ms
  totalAlerts: number; // accumulated alerts over current shift
  onPhone: boolean; // derived: driver holding phone
  seatbelt: boolean; // derived: seatbelt fastened
}

export type AlertType = "drowsiness_alert" | "yawn_alert" | "distraction_alert";

export interface FleetEvent {
  id: string;
  type: AlertType;
  driverId: string;
  driverName: string;
  licensePlate: string;
  ear: number;
  timestamp: number;
  acknowledged: boolean;
}

export interface HourBucket {
  hour: number; // 0-23
  count: number;
}

export interface DriverStat {
  driverId: string;
  name: string;
  total: number;
}

export interface TeamStat {
  team: string;
  total: number;
}

export interface SocketEnvelope<T> {
  topic: "vehicle.telemetry" | "fleet.event";
  payload: T;
}
