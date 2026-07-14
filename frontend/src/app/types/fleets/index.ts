export type FleetViewMode = "waiting" | "all";

export interface VehicleQueueStats {
  waitingCount: number;
  loadingCount: number;
  transitCount: number;
  completedToday: number;
  avgWaitMinutes: number;
  queueByTeam: Record<string, number>;
}

export interface FleetKpi {
  totalVehicles: number;
  activeVehicles: number;
  idleVehicles: number;
  maintenanceVehicles: number;
  todayTrips: number;
  totalDistanceKm: number;
  fuelLitersUsed: number;
  avgSpeedKmh: number;
}

export interface VehicleSnapshot {
  id: string;
  driverId: string;
  driverName: string;
  licensePlate: string;
  team: string;
  status: "waiting" | "loading" | "in_transit" | "idle" | "maintenance";
  waitMinutes: number;
  loadProgress: number;
  speedKmh: number;
  fuelPercent: number;
  engineTemp: number;
  lastUpdate: number;
}
