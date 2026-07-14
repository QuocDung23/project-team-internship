import { ChevronRight } from "lucide-react";
import type { BackendTrip } from "../../services/backendApi";
import { tripTitle, routeLabel, dateLabel } from "../../utils/trips/tripFormatters";
import { SafetyScoreValue } from "../../utils/safetyScore";

export default function TripRow({
  trip,
  onSelect,
}: {
  trip: BackendTrip;
  onSelect: (tripId: string) => void;
}) {
  const isActive = trip.status === "in_progress";
  return (
    <button
      type="button"
      onClick={() => onSelect(trip.trip_id)}
      className="group grid w-full grid-cols-[1.1fr_1.4fr_1fr_1fr_0.85fr_auto] items-center gap-4 border-b border-hairline px-5 py-4 text-left text-sm text-text-secondary transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-subtle-bg-hover focus:bg-subtle-bg-hover focus:outline-none"
    >
      <span className="min-w-0">
        <span className="block truncate font-mono-num text-xs font-semibold text-text-primary">
          {tripTitle(trip)}
        </span>
        <span className="mt-1 inline-flex items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isActive
                ? "bg-accent-warn shadow-[0_0_8px_rgba(245,158,11,0.7)]"
                : "bg-accent-active/70"
            }`}
          />
          <span
            className={`text-[10px] font-medium uppercase tracking-[0.14em] ${
              isActive ? "text-accent-warn" : "text-text-tertiary"
            }`}
          >
            {trip.status.replace("_", " ")}
          </span>
        </span>
      </span>
      <span className="truncate text-xs text-text-secondary">{routeLabel(trip)}</span>
      <span className="truncate font-mono-num text-xs text-text-tertiary tabular-nums">
        {dateLabel(trip.actual_start_at ?? trip.start_time)}
      </span>
      <span className="truncate font-mono-num text-xs text-text-tertiary tabular-nums">
        {dateLabel(trip.actual_end_at ?? trip.end_time)}
      </span>
      <span className="truncate text-xs font-semibold text-text-secondary">
        <SafetyScoreValue trip={trip} />
      </span>
      <span
        aria-hidden
        className="flex h-7 w-7 items-center justify-center rounded-full border border-hairline bg-subtle-bg text-text-tertiary transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:border-accent-active/40 group-hover:text-accent-active"
      >
        <ChevronRight size={18} strokeWidth={2.3} />
      </span>
    </button>
  );
}
