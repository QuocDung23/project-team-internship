import { CaretRight } from "@phosphor-icons/react";
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
      className="group grid w-full grid-cols-[1.1fr_1.4fr_1fr_1fr_0.85fr_auto] items-center gap-4 border-b border-white/[0.04] px-5 py-4 text-left text-sm text-zinc-300 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white/[0.025] focus:bg-white/[0.025] focus:outline-none"
    >
      <span className="min-w-0">
        <span className="block truncate font-mono-num text-xs font-semibold text-zinc-100">
          {tripTitle(trip)}
        </span>
        <span className="mt-1 inline-flex items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isActive
                ? "bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.7)]"
                : "bg-emerald-400/70"
            }`}
          />
          <span
            className={`text-[10px] font-medium uppercase tracking-[0.14em] ${
              isActive ? "text-amber-300" : "text-zinc-500"
            }`}
          >
            {trip.status.replace("_", " ")}
          </span>
        </span>
      </span>
      <span className="truncate text-xs text-zinc-300">{routeLabel(trip)}</span>
      <span className="truncate font-mono-num text-xs text-zinc-500 tabular-nums">
        {dateLabel(trip.actual_start_at ?? trip.start_time)}
      </span>
      <span className="truncate font-mono-num text-xs text-zinc-500 tabular-nums">
        {dateLabel(trip.actual_end_at ?? trip.end_time)}
      </span>
      <span className="truncate text-xs font-semibold text-zinc-300">
        <SafetyScoreValue trip={trip} />
      </span>
      <span
        aria-hidden
        className="flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.02] text-zinc-500 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:border-emerald-400/40 group-hover:text-emerald-300"
      >
        <CaretRight size={11} weight="bold" />
      </span>
    </button>
  );
}