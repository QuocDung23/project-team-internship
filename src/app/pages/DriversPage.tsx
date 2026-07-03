// Drivers management page. Composes the table, filters, stats and header
// sub-components and owns only the page-level state (search, eye and status
// filters). All UI building blocks live under `component/drivers/`.

import { useEffect, useMemo, useState } from "react";
import { useFleetStore } from "../store/fleetStore";
import { seedDrivers } from "../data/seed";
import DriversHeader from "../component/drivers/DriversHeader";
import DriverStatsBar from "../component/drivers/DriverStatsBar";
import DriverFilters from "../component/drivers/DriverFilters";
import DriverTable from "../component/drivers/DriverTable";
import type {
  DriverEyeFilter,
  DriverStats,
  DriverStatusFilter,
} from "../types/drivers";
import type { Driver } from "../types";

function DriversPage() {
  const fleetDrivers = useFleetStore((s) => s.drivers);
  const hydrate = useFleetStore((s) => s.hydrate);
  const [search, setSearch] = useState("");
  const [eyeFilter, setEyeFilter] = useState<DriverEyeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<DriverStatusFilter>("all");

  useEffect(() => {
    if (Object.keys(fleetDrivers).length === 0) {
      hydrate();
    }
  }, [hydrate, fleetDrivers]);

  const allDrivers: Driver[] = useMemo(
    () =>
      Object.values(fleetDrivers).length > 0
        ? Object.values(fleetDrivers)
        : seedDrivers(),
    [fleetDrivers],
  );

  const filtered = useMemo(
    () =>
      allDrivers.filter((d) => {
        if (
          search &&
          !d.name.toLowerCase().includes(search.toLowerCase()) &&
          !d.id.toLowerCase().includes(search.toLowerCase())
        ) {
          return false;
        }
        if (eyeFilter !== "all" && d.eyeState !== eyeFilter) return false;
        if (statusFilter !== "all" && d.status !== statusFilter) return false;
        return true;
      }),
    [allDrivers, search, eyeFilter, statusFilter],
  );

  const stats: DriverStats = useMemo(
    () => ({
      total: allDrivers.length,
      active: allDrivers.filter((d) => d.status === "active").length,
      warn: allDrivers.filter((d) => d.status === "warn").length,
      critical: allDrivers.filter((d) => d.status === "critical").length,
      offline: allDrivers.filter((d) => d.status === "offline").length,
      eyesOpen: allDrivers.filter((d) => d.eyeState === "open").length,
      eyesClosed: allDrivers.filter((d) => d.eyeState === "closed").length,
      yawning: allDrivers.filter((d) => d.eyeState === "yawning").length,
      onPhone: allDrivers.filter((d) => d.onPhone).length,
    }),
    [allDrivers],
  );

  const handleClearFilters = () => {
    setSearch("");
    setEyeFilter("all");
    setStatusFilter("all");
  };

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-hidden p-4 md:p-6">
      <DriversHeader stats={stats} onAdd={() => undefined} />
      <DriverStatsBar stats={stats} />
      <DriverFilters
        search={search}
        eyeFilter={eyeFilter}
        statusFilter={statusFilter}
        onSearchChange={setSearch}
        onEyeFilterChange={setEyeFilter}
        onStatusFilterChange={setStatusFilter}
      />
      <DriverTable
        drivers={filtered}
        totalCount={allDrivers.length}
        onClearFilters={handleClearFilters}
      />
    </div>
  );
}

export default DriversPage;
