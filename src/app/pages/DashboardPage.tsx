import { useEffect, useMemo } from "react";
import { useFleetStore } from "../store/fleetStore";
import { useTicker } from "../hook/useTicker";
import DashboardHeader from "../component/dashboards/DashboardHeader";
import DriverTable from "../component/dashboards/DriverTable";
import KpiGrid from "../component/dashboards/KpiGrid";

function DashboardPage() {
  const drivers = useFleetStore((s) => s.drivers);
  const hydrate = useFleetStore((s) => s.hydrate);
  const connected = useFleetStore((s) => s.connected);
  const now = useTicker(1000);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const driverList = useMemo(() => Object.values(drivers), [drivers]);

  const kpis = useMemo(() => {
    const total = driverList.length;
    const active = driverList.filter((d) => d.status === "active").length;
    const warn = driverList.filter((d) => d.status === "warn").length;
    const critical = driverList.filter((d) => d.status === "critical").length;
    const offline = driverList.filter((d) => d.status === "offline").length;
    const totalAlerts = driverList.reduce((sum, d) => sum + d.totalAlerts, 0);
    return { total, active, warn, critical, offline, totalAlerts };
  }, [driverList]);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <DashboardHeader now={now} connected={connected} />
      <KpiGrid kpis={kpis} />
      <DriverTable drivers={driverList} />
    </div>
  );
}

export default DashboardPage;
