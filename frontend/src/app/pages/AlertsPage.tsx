import { useMemo, useState } from "react";
import { useBackendAlerts } from "../hook/useBackendAlerts";
import { useAuth } from "../auth/AuthContext";

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
  const { user } = useAuth();
  const [tripIdFilter, setTripIdFilter] = useState("");
  const [driverIdFilter, setDriverIdFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [showAcknowledged, setShowAcknowledged] = useState(true);
  const backendAlerts = useBackendAlerts(undefined, {
    tripId: tripIdFilter.trim() || undefined,
    driverId: user?.role === "admin" ? driverIdFilter.trim() || undefined : undefined,
    severity: severityFilter === "all" ? undefined : severityFilter,
    status: "all",
  });
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

      {backendAlerts.error && (
        <section className="panel border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-200">
          Backend unavailable: {backendAlerts.error}
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

      <section className="panel grid gap-3 px-4 py-3 md:grid-cols-2">
        <label className="grid gap-1 text-[11px] text-zinc-400">
          Trip ID
          <input
            value={tripIdFilter}
            onChange={(event) => setTripIdFilter(event.target.value)}
            className="rounded-md border border-hairline bg-surface-2 px-3 py-2 text-[12px] text-zinc-100 outline-none focus:border-emerald-500/50"
            placeholder="All authorized trips"
          />
        </label>
        {user?.role === "admin" ? (
          <label className="grid gap-1 text-[11px] text-zinc-400">
            Driver ID
            <input
              value={driverIdFilter}
              onChange={(event) => setDriverIdFilter(event.target.value)}
              className="rounded-md border border-hairline bg-surface-2 px-3 py-2 text-[12px] text-zinc-100 outline-none focus:border-emerald-500/50"
              placeholder="All drivers"
            />
          </label>
        ) : null}
      </section>

      <AlertList events={filtered} />
    </div>
  );
}
