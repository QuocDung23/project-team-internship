import { useMemo } from "react";
import { useTicker } from "../hook/useTicker";
import { useBackendDrivers, useBackendTrips } from "../hook/useBackendData";
import DashboardHeader from "../component/dashboards/DashboardHeader";
import DriverTable from "../component/dashboards/DriverTable";
import KpiGrid from "../component/dashboards/KpiGrid";
import type { Driver } from "../types";
import { buildSafetySummaryFromTrips, deriveDriverStatuses, type BackendTrip } from "../services/backendApi";

const EMPTY_DRIVERS: Driver[] = [];
const EMPTY_TRIPS: BackendTrip[] = [];

function DashboardPage() {
  const backendDrivers = useBackendDrivers();
  const backendTrips = useBackendTrips();
  const now = useTicker(1000);

  const trips = backendTrips.trips ?? EMPTY_TRIPS;
  const driverList = useMemo(
    () => deriveDriverStatuses(backendDrivers.drivers ?? EMPTY_DRIVERS, trips),
    [backendDrivers.drivers, trips],
  );

  const kpis = useMemo(() => {
    const total = driverList.length;
    const safety = buildSafetySummaryFromTrips(trips);
    return {
      total,
      driving: driverList.filter((d) => d.status === "driving").length,
      idle: driverList.filter((d) => d.status === "idle").length,
      disable: driverList.filter((d) => d.status === "disable").length,
      totalAlerts: safety.totalAlerts,
      criticalAlerts: safety.criticalAlerts,
      averageScore: safety.averageScore,
    };
  }, [driverList, trips]);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <DashboardHeader now={now} connected={backendDrivers.isLive} />
      {backendDrivers.error && (
        <section className="panel border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-200">
          Backend unavailable: {backendDrivers.error}
        </section>
      )}
      <KpiGrid kpis={kpis} />
      <DriverTable drivers={driverList} />
    </div>
  );
}

export default DashboardPage;
