// Fleet management page. Composes header, KPI row, queue stats, and vehicle
// grid sub-components. Owns only the data fetching and view-mode state — all
// building blocks live under `component/fleets/`.

import { useMemo, useState } from "react";
import { useTicker } from "../hook/useTicker";
import {
  getFleetKpi,
  getVehicleQueue,
  getVehicleQueueStats,
} from "../data/mockMetrics";

import FleetKpiRow from "../component/fleets/FleetKpiRow";
import QueueStatsBar from "../component/fleets/QueueStatsBar";
import VehicleGrid from "../component/fleets/VehicleGrid";
import type { FleetViewMode } from "../types/fleets";
import FleetHeader from "../component/fleets/FleetHeader";

function FleetPage() {
  const [vehicles] = useState(() => getVehicleQueue());
  const [stats] = useState(() => getVehicleQueueStats());
  const [kpi] = useState(() => getFleetKpi());
  const [viewMode, setViewMode] = useState<FleetViewMode>("all");
  const now = useTicker(1000);

  const displayed = useMemo(
    () =>
      viewMode === "waiting"
        ? vehicles.filter(
            (v) => v.status === "waiting" || v.status === "loading",
          )
        : vehicles,
    [vehicles, viewMode],
  );

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-hidden p-4 md:p-6">
      <FleetHeader
        now={now}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
      {kpi && <FleetKpiRow kpi={kpi} />}
      {stats && <QueueStatsBar stats={stats} />}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
        <VehicleGrid vehicles={displayed} />
      </div>
    </div>
  );
}

export default FleetPage;
