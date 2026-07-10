// Fleet management page. Composes header, KPI row, queue stats, and vehicle
// grid sub-components. Owns only the data fetching and view-mode state — all
// building blocks live under `component/fleets/`.

import { useMemo, useState } from "react";
import { useTicker } from "../hook/useTicker";
import { useBackendTrips } from "../hook/useBackendData";

import FleetKpiRow from "../component/fleets/FleetKpiRow";
import QueueStatsBar from "../component/fleets/QueueStatsBar";
import VehicleGrid from "../component/fleets/VehicleGrid";
import type { FleetViewMode, VehicleSnapshot } from "../types/fleets";
import FleetHeader from "../component/fleets/FleetHeader";

const EMPTY_VEHICLES: VehicleSnapshot[] = [];

function FleetPage() {
  const [viewMode, setViewMode] = useState<FleetViewMode>("all");
  const backendTrips = useBackendTrips(true);
  const now = useTicker(1000);
  const liveVehicles = backendTrips.vehicles ?? EMPTY_VEHICLES;
  const liveStats = backendTrips.stats;
  const liveKpi = backendTrips.kpi;

  const displayed = useMemo(
    () =>
      viewMode === "waiting"
        ? liveVehicles.filter(
            (v) => v.status === "waiting" || v.status === "loading",
          )
        : liveVehicles,
    [liveVehicles, viewMode],
  );

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-hidden p-4 md:p-6">
      <FleetHeader
        now={now}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
      {backendTrips.error && (
        <section className="panel border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-200">
          Backend unavailable: {backendTrips.error}
        </section>
      )}
      {liveKpi && <FleetKpiRow kpi={liveKpi} />}
      {liveStats && <QueueStatsBar stats={liveStats} />}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
        <VehicleGrid vehicles={displayed} emptyMessage="No active backend trips." />
      </div>
    </div>
  );
}

export default FleetPage;
