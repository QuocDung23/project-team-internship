import type { ReactElement } from "react";
import type { BackendTrip, SafetyScore } from "../services/backendApi";

interface TripScoreParts {
  score: string | null;
  grade: string | null;
}

export function tripScoreParts(trip: BackendTrip, fallbackScore?: SafetyScore | null): TripScoreParts {
  const score = fallbackScore ?? trip.safety_score;
  if (score && typeof score === "object") {
    return { score: String(score.score), grade: score.grade };
  }
  if (score !== null && score !== undefined && score !== "") {
    return { score: String(score), grade: trip.safety_grade ?? null };
  }
  return { score: null, grade: null };
}

export function tripScoreText(trip: BackendTrip, fallbackScore?: SafetyScore | null): string {
  const parts = tripScoreParts(trip, fallbackScore);
  if (!parts.score) return "-";
  return parts.grade ? `${parts.score} (${parts.grade})` : parts.score;
}

export function SafetyScoreValue({
  trip,
  score,
}: {
  trip: BackendTrip;
  score?: SafetyScore | null;
}): ReactElement {
  const parts = tripScoreParts(trip, score);
  if (!parts.score) return <span>-</span>;

  return (
    <span className="inline-flex items-center gap-1">
      <span>{parts.score}</span>
      {parts.grade ? (
        <span className={`font-semibold ${gradeClassName(parts.grade)}`}>
          {parts.grade}
        </span>
      ) : null}
    </span>
  );
}

export function gradeClassName(grade: string | null | undefined): string {
  const normalized = (grade ?? "").trim().toUpperCase();
  if (normalized === "A") return "text-emerald-300";
  if (normalized === "B") return "text-amber-300";
  if (normalized === "C") return "text-red-300";
  return "text-zinc-300";
}
