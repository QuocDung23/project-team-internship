import type { BackendTrip, SafetyScore } from "../../services/backendApi";

export function routeLabel(trip: BackendTrip): string {
  if (trip.origin && trip.destination) return `${trip.origin} → ${trip.destination}`;
  return trip.origin || trip.destination || "-";
}

export function scoreLabel(trip: BackendTrip): string {
  const score = trip.safety_score;
  if (score && typeof score === "object") return `${(score as SafetyScore).score} (${(score as SafetyScore).grade})`;
  if (score !== null && score !== undefined && score !== "") {
    return trip.safety_grade ? `${score} (${trip.safety_grade})` : String(score);
  }
  return "-";
}

export function alertCountLabel(trip: BackendTrip): string {
  const score = trip.safety_score;
  if (score && typeof score === "object") return String((score as SafetyScore).alert_count);
  if (trip.total_alerts_count !== null && trip.total_alerts_count !== undefined) {
    return String(trip.total_alerts_count);
  }
  return "-";
}

export function criticalAlertCountLabel(trip: BackendTrip): string {
  if (trip.critical_alerts_count !== null && trip.critical_alerts_count !== undefined) {
    return String(trip.critical_alerts_count);
  }
  const score = trip.safety_score;
  if (score && typeof score === "object") return String((score as SafetyScore).critical_events);
  return "-";
}

export function statusClassName(status: string): string {
  if (status === "in_progress") return "truncate text-xs font-semibold text-emerald-300";
  if (status === "completed") return "truncate text-xs text-zinc-300";
  if (status === "cancelled" || status === "aborted") return "truncate text-xs text-rose-300";
  return "truncate text-xs text-amber-300";
}

export function tripDateLabel(value?: string | null): string {
  return value ? new Date(value).toLocaleString() : "-";
}

export type { BackendTrip, SafetyScore };
