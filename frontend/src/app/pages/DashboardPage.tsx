import { useMemo } from "react";
import { useTicker } from "../hook/useTicker";
import { useBackendDrivers, useBackendTrips } from "../hook/useBackendData";
import DashboardHeader from "../component/dashboards/DashboardHeader";
import DriverTable from "../component/dashboards/DriverTable";
import KpiGrid from "../component/dashboards/KpiGrid";
import type { Driver } from "../types";

const EMPTY_DRIVERS: Driver[] = [];

function DashboardPage() {
  const backendDrivers = useBackendDrivers();
  const backendTrips = useBackendTrips();
  const now = useTicker(1000);

  const driverList = backendDrivers.drivers ?? EMPTY_DRIVERS;

  const kpis = useMemo(() => {
    const total = driverList.length;
    const active = backendTrips.trips?.filter((trip) => trip.status === "in_progress").length ?? 0;
    const warn = driverList.filter((d) => d.status === "warn").length;
    const critical = driverList.filter((d) => d.status === "critical").length;
    const offline = driverList.filter((d) => d.status === "offline").length;
    const totalAlerts = backendTrips.trips?.reduce(
      (sum, trip) => sum + Number(trip.total_alerts_count ?? 0),
      0,
    ) ?? 0;
    return { total, active, warn, critical, offline, totalAlerts };
  }, [backendTrips.trips, driverList]);

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
