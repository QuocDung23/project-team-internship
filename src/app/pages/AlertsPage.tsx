import { useMemo, useState } from "react";
import {
  getFleetEvents,
  refreshFleetEvents,
  type MockFleetEvent,
} from "../data/mockMetrics";

import type { AlertsStats, SeverityFilter, TypeFilter } from "../types/alerts";
import AlertHeader from "../component/alerts/AlertHeader";
import AlertStatsRow from "../component/alerts/AlertStatsRow";
import AlertFilters from "../component/alerts/AlertFilters";
import AlertList from "../component/alerts/AlertList";

export function AlertsPage() {
  const [events, setEvents] = useState<MockFleetEvent[]>(() =>
    getFleetEvents(),
  );
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [showAcknowledged, setShowAcknowledged] = useState(true);

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
        onRefresh={() => setEvents(refreshFleetEvents())}
      />

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
