import type { Driver, DriverStatus } from "../../types";

export type DriverEyeFilter = "all" | "open" | "closed" | "yawning";

export type DriverStatusFilter = "all" | DriverStatus;

export interface DriverStats {
  total: number;
  driving: number;
  idle: number;
  disable: number;
  eyesOpen: number;
  eyesClosed: number;
  yawning: number;
  onPhone: number;
}

export type { Driver };
