import type { BackendDriver, BackendTrip } from "../../services/backendApi";
import type { Driver } from "../../types";
import type { FleetAlertEvent } from "../../types/alerts";

export interface DriverFormState {
  fullName: string;
  licenseNumber: string;
  phone: string;
  email: string;
  password: string;
  status: "active" | "inactive";
}

export const EMPTY_FORM: DriverFormState = {
  fullName: "",
  licenseNumber: "",
  phone: "",
  email: "",
  password: "",
  status: "active",
};

export const SPRING = {
  type: "spring" as const,
  stiffness: 240,
  damping: 28,
  mass: 0.9,
};

export function tripScoreLabel(trip: BackendTrip): string {
  if (trip.safety_score && typeof trip.safety_score === "object") {
    return `${trip.safety_score.score} ${trip.safety_score.grade}`;
  }
  if (trip.safety_score !== null && trip.safety_score !== undefined) {
    return trip.safety_grade ? `${trip.safety_score} ${trip.safety_grade}` : String(trip.safety_score);
  }
  return "-";
}

export function tripAlertLabel(trip: BackendTrip): string {
  const total = Number(trip.total_alerts_count ?? 0);
  const critical = tripCriticalAlerts(trip);
  if (total <= 0) return "0 alerts";
  return critical > 0 ? `${total} alerts · ${critical} crit` : `${total} alerts`;
}

export function tripCriticalAlerts(trip: BackendTrip): number {
  return Number(trip.critical_alerts_count ?? 0);
}

export function shortId(value: string): string {
  return value.length > 12 ? `${value.slice(0, 8)}...` : value;
}

export function driverFormFromBackend(
  backendDriver: BackendDriver | undefined,
  driver: Driver,
): DriverFormState {
  return {
    fullName: backendDriver?.full_name ?? driver.name,
    licenseNumber: backendDriver?.license_number ?? driver.licenseNumber,
    phone: backendDriver?.phone ?? driver.phone,
    email: backendDriver?.email ?? "",
    password: "",
    status:
      backendDriver?.status === "inactive" || backendDriver?.status === "suspended"
        ? "inactive"
        : "active",
  };
}

export type StatTone = "emerald" | "zinc" | "rose" | "amber";

export const STAT_TONE_TEXT: Record<StatTone, string> = {
  emerald: "text-emerald-300",
  zinc: "text-zinc-300",
  rose: "text-rose-300",
  amber: "text-amber-300",
};

export const STAT_TONE_GLOW: Record<StatTone, string> = {
  emerald: "rgba(16,185,129,0.55)",
  zinc: "rgba(161,161,170,0.40)",
  rose: "rgba(244,63,94,0.55)",
  amber: "rgba(245,158,11,0.55)",
};

export type { BackendTrip, BackendDriver, FleetAlertEvent };
