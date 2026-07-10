import { useMemo, useState } from "react";
import { useBackendAlerts } from "../hook/useBackendAlerts";
import { useBackendTrips } from "../hook/useBackendData";
import { getActiveTripId } from "../services/backendAlerts";

import type {
  AlertsStats,
  FleetAlertEvent,
  SeverityFilter,
  TypeFilter,
} from "../types/alerts";
import AlertHeader from "../component/alerts/AlertHeader";
import AlertStatsRow from "../component/alerts/AlertStatsRow";
import AlertFilters from "../component/alerts/AlertFilters";
import AlertList from "../component/alerts/AlertList";

const EMPTY_EVENTS: FleetAlertEvent[] = [];

export function AlertsPage() {
  const backendTrips = useBackendTrips(true);
  const liveTripId = getActiveTripId() || backendTrips.trips?.[0]?.trip_id;
  const backendAlerts = useBackendAlerts(liveTripId);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [showAcknowledged, setShowAcknowledged] = useState(true);
  const events = backendAlerts.fleetEvents ?? EMPTY_EVENTS;

  const filtered = useMemo(
    () =>
      events.filter((e) => {
        if (!showAcknowledged && e.acknowledged) return false;
        if (severityFilter !== "all" && e.severity !== severityFilter)
          return false;
        if (typeFilter !== "all" && e.type !== typeFilter) return false;
        return true;
      }),
    [events, severityFilter, typeFilter, showAcknowledged],
  );

  const stats: AlertsStats = useMemo(
    () => ({
      total: events.length,
      critical: events.filter(
        (e) => e.severity === "critical" && !e.acknowledged,
      ).length,
      warn: events.filter((e) => e.severity === "warn" && !e.acknowledged)
        .length,
      acknowledged: events.filter((e) => e.acknowledged).length,
    }),
    [events],
  );

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-hidden p-4 md:p-6">
      <AlertHeader
        criticalCount={stats.critical}
        warnCount={stats.warn}
        onRefresh={() => {
          if (backendAlerts.isLive) {
            void backendAlerts.refresh();
          }
        }}
      />

      {(backendTrips.error || backendAlerts.error) && (
        <section className="panel border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-200">
          Backend unavailable: {backendTrips.error ?? backendAlerts.error}
        </section>
      )}

      <AlertStatsRow stats={stats} />

      <AlertFilters
        severityFilter={severityFilter}
        typeFilter={typeFilter}
        showAcknowledged={showAcknowledged}
        onSeverityChange={setSeverityFilter}
        onTypeChange={setTypeFilter}
        onToggleAcknowledged={setShowAcknowledged}
      />

      <AlertList events={filtered} />
    </div>
  );
}
