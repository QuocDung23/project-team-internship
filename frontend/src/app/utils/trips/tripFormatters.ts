import type { BackendTrip, SafetyScore, StartMyTripPayload } from "../../services/backendApi";
import { TRIP_CODE_MAX_LENGTH, ROUTE_POINT_MAX_LENGTH } from "./tripFormConstants";

export interface TripDateInput {
  value?: string | null;
  language: string;
}

export interface FormatTripDateOptions {
  localeOptions?: Intl.DateTimeFormatOptions;
}

export function dateLabel(value?: string | null, language: string = "en"): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  try {
    return new Intl.DateTimeFormat(language === "vi" ? "vi-VN" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

export function tripDateLabel(value?: string | null, language: string = "en"): string {
  return dateLabel(value, language);
}

export interface RouteLabelStrings {
  fallback: string;
  arrow: string;
}

export function routeLabel(
  trip: BackendTrip,
  strings: RouteLabelStrings = { fallback: "Route not provided", arrow: "→" },
): string {
  if (trip.origin && trip.destination) return `${trip.origin} ${strings.arrow} ${trip.destination}`;
  return trip.origin || trip.destination || strings.fallback;
}

export interface TripTitleStrings {
  fallback: string;
}

export function tripTitle(trip: BackendTrip, strings: TripTitleStrings = { fallback: "Trip without code" }): string {
  return trip.code || strings.fallback;
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

export function generateTripCode(existingTrips: BackendTrip[], now: Date = new Date()): string {
  const datePart = [
    String(now.getFullYear()).slice(-2),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  const prefix = `TRIP-${datePart}-`;
  const nextSequence = existingTrips.reduce((max, trip) => {
    const code = trip.code ?? "";
    if (!code.startsWith(prefix)) return max;
    const sequence = Number.parseInt(code.slice(prefix.length), 10);
    return Number.isFinite(sequence) ? Math.max(max, sequence) : max;
  }, 0) + 1;
  return `${prefix}${String(nextSequence).padStart(2, "0")}`;
}

export interface TripFormWarning {
  key:
    | "trips:form.warning.codeLength"
    | "trips:form.warning.originLength"
    | "trips:form.warning.destinationLength"
    | "trips:form.warning.identicalRoute";
  params?: Record<string, string | number>;
  blocking: boolean;
}

export function tripFormWarnings(form: StartMyTripPayload): TripFormWarning[] {
  const code = (form.code ?? "").trim();
  const origin = (form.origin ?? "").trim();
  const destination = (form.destination ?? "").trim();
  const warnings: TripFormWarning[] = [];

  if (code.length > TRIP_CODE_MAX_LENGTH) {
    warnings.push({
      key: "trips:form.warning.codeLength",
      params: { max: TRIP_CODE_MAX_LENGTH },
      blocking: true,
    });
  }
  if (origin.length > ROUTE_POINT_MAX_LENGTH) {
    warnings.push({
      key: "trips:form.warning.originLength",
      params: { max: ROUTE_POINT_MAX_LENGTH },
      blocking: true,
    });
  }
  if (destination.length > ROUTE_POINT_MAX_LENGTH) {
    warnings.push({
      key: "trips:form.warning.destinationLength",
      params: { max: ROUTE_POINT_MAX_LENGTH },
      blocking: true,
    });
  }
  if (origin && destination && origin.toLocaleLowerCase() === destination.toLocaleLowerCase()) {
    warnings.push({
      key: "trips:form.warning.identicalRoute",
      blocking: false,
    });
  }

  return warnings;
}
