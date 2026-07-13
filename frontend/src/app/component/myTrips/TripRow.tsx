import { motion } from "motion/react";
import { SPRING } from "../../utils/trips/tripMotion";
import {
  routeLabel,
  scoreLabel,
  alertCountLabel,
  criticalAlertCountLabel,
  statusClassName,
  tripDateLabel,
} from "../../utils/trips/tripFormatters";
import type { BackendTrip } from "../../services/backendApi";

interface TripRowProps {
  trip: BackendTrip;
  index: number;
}

export default function TripRow({ trip, index }: TripRowProps) {
  const score = scoreLabel(trip);
  const hasScore = score !== "-";

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ ...SPRING, delay: index * 0.04 }}
      className="group grid grid-cols-[1.2fr_0.8fr_1.2fr_1fr_1fr_0.7fr_0.7fr_0.7fr] gap-3 border-b border-white/[0.04] px-4 py-3.5 transition-colors hover:bg-white/[0.02] cursor-default"
    >
      {/* Trip ID / Code */}
      <span
        className="truncate font-mono-num text-xs text-zinc-100"
        title={trip.code || trip.trip_id}
      >
        {trip.code || trip.trip_id}
      </span>

      {/* Status badge */}
      <span className={statusClassName(trip.status)}>{trip.status}</span>

      {/* Route */}
      <span className="truncate text-xs text-zinc-500">{routeLabel(trip)}</span>

      {/* Started */}
      <span className="truncate text-xs text-zinc-500">{tripDateLabel(trip.actual_start_at ?? trip.start_time)}</span>

      {/* Ended */}
      <span className="truncate text-xs text-zinc-500">{tripDateLabel(trip.actual_end_at ?? trip.end_time)}</span>

      {/* Score */}
      <span className={`truncate text-xs font-medium ${hasScore ? "text-zinc-200" : "text-zinc-600"}`}>
        {score}
      </span>

      {/* Alerts */}
      <span className="font-mono-num text-xs text-zinc-300">{alertCountLabel(trip)}</span>

      {/* Critical */}
      <span className="font-mono-num text-xs text-rose-300">{criticalAlertCountLabel(trip)}</span>
    </motion.div>
  );
}
