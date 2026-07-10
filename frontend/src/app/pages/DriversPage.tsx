// Drivers management page. Composes the table, filters, stats and header
// sub-components and owns only the page-level state (search, eye and status
// filters). All UI building blocks live under `component/drivers/`.

import { useMemo, useState } from "react";
import { useBackendDrivers } from "../hook/useBackendData";
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
  const backendDrivers = useBackendDrivers();
  const [search, setSearch] = useState("");
  const [eyeFilter, setEyeFilter] = useState<DriverEyeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<DriverStatusFilter>("all");

  const allDrivers: Driver[] = useMemo(
    () => backendDrivers.drivers ?? [],
    [backendDrivers.drivers],
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

  const handleAddDriver = () => {
    const fullName = window.prompt("Tên tài xế");
    if (!fullName) return;
    const licenseNumber = window.prompt("Số giấy phép");
    if (!licenseNumber) return;
    void backendDrivers.createDriver({
      full_name: fullName,
      license_number: licenseNumber,
      status: "active",
    });
  };

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-hidden p-4 md:p-6">
      <DriversHeader stats={stats} onAdd={handleAddDriver} />
      {backendDrivers.error && (
        <section className="panel border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-200">
          Backend unavailable: {backendDrivers.error}
        </section>
      )}
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
