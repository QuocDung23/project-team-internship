import { FormEvent, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AdminDialog } from "../component/admin/AdminDialog";
import { AdminErrorBanner, AdminPage } from "../component/admin/AdminShell";
import DriverFilters from "../component/drivers/DriverFilters";
import DriverStatsBar from "../component/drivers/DriverStatsBar";
import DriverTable from "../component/drivers/DriverTable";
import DriverFormSections from "../component/drivers/DriverFormSections";
import DriversHeroPanel from "../component/drivers/DriversHeroPanel";
import DriverDialogFooter from "../component/drivers/DriverDialogFooter";
import {
  EMPTY_FORM,
  SPRING,
  driverFormFromBackend,
  type DriverFormState,
} from "../utils/drivers/driverFormHelpers";
import { useBackendAlerts } from "../hook/useBackendAlerts";
import { useBackendDrivers, useBackendTrips } from "../hook/useBackendData";
import {
  buildSafetySummaryFromTrips,
  deriveDriverStatuses,
  getTripsForDriver,
} from "../services/backendApi";
import type { Driver } from "../types";
import type {
  DriverEyeFilter,
  DriverStats,
  DriverStatusFilter,
} from "../types/drivers";

export default function DriversPage() {
  const backendDrivers = useBackendDrivers();
  const backendTrips = useBackendTrips(false);
  const [search, setSearch] = useState("");
  const [eyeFilter, setEyeFilter] = useState<DriverEyeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<DriverStatusFilter>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "manage">("create");
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [form, setForm] = useState<DriverFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [updatingDriverId, setUpdatingDriverId] = useState<string | null>(null);
  const selectedDriverAlerts = useBackendAlerts(
    undefined,
    selectedDriverId
      ? {
          driverId: selectedDriverId,
          status: "all",
        }
      : {},
  );

  const allDrivers: Driver[] = useMemo(
    () =>
      deriveDriverStatuses(
        backendDrivers.drivers ?? [],
        backendTrips.trips ?? [],
      ),
    [backendDrivers.drivers, backendTrips.trips],
  );

  const filtered = useMemo(
    () =>
      allDrivers.filter((d) => {
        const needle = search.trim().toLowerCase();
        if (
          needle &&
          !d.name.toLowerCase().includes(needle) &&
          !d.id.toLowerCase().includes(needle) &&
          !d.licensePlate.toLowerCase().includes(needle)
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
      driving: allDrivers.filter((d) => d.status === "driving").length,
      idle: allDrivers.filter((d) => d.status === "idle").length,
      disable: allDrivers.filter((d) => d.status === "disable").length,
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

  const selectedBackendDriver = useMemo(
    () =>
      backendDrivers.rows?.find(
        (driver) => driver.driver_id === selectedDriverId,
      ) ?? null,
    [backendDrivers.rows, selectedDriverId],
  );
  const selectedDriverTrips = useMemo(
    () => getTripsForDriver(selectedDriverId, backendTrips.trips ?? []),
    [backendTrips.trips, selectedDriverId],
  );
  const selectedDriverSafety = useMemo(
    () => buildSafetySummaryFromTrips(selectedDriverTrips),
    [selectedDriverTrips],
  );

  const openCreateDialog = () => {
    setDialogMode("create");
    setSelectedDriverId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setDialogOpen(true);
  };

  const openManageDialog = (driver: Driver) => {
    const backendDriver = backendDrivers.rows?.find(
      (row) => row.driver_id === driver.id,
    );
    setDialogMode("manage");
    setSelectedDriverId(driver.id);
    setForm(driverFormFromBackend(backendDriver, driver));
    setFormError(null);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (isSaving) return;
    setDialogOpen(false);
  };

  const handleSaveDriver = async (event: FormEvent) => {
    event.preventDefault();
    const fullName = form.fullName.trim();
    const licenseNumber = form.licenseNumber.trim();
    const email = form.email.trim();
    if (!fullName || !licenseNumber) {
      setFormError("Full name and license number are required.");
      return;
    }
    if (dialogMode === "create" && !email) {
      setFormError("Email is required so the driver can log in.");
      return;
    }
    if (dialogMode === "create" && form.password.length < 12) {
      setFormError("Password must be at least 12 characters.");
      return;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      const payload = {
        full_name: fullName,
        license_number: licenseNumber,
        phone: form.phone.trim() || undefined,
        email: email || undefined,
        status: form.status,
      };
      if (dialogMode === "manage" && selectedDriverId) {
        await backendDrivers.updateDriver(selectedDriverId, payload);
      } else {
        await backendDrivers.createDriver({
          ...payload,
          email,
          password: form.password,
        });
      }
      setDialogOpen(false);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to save driver",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetAvailability = async (driver: Driver, enabled: boolean) => {
    setUpdatingDriverId(driver.id);
    try {
      await backendDrivers.updateDriver(driver.id, {
        status: enabled ? "active" : "inactive",
      });
    } finally {
      setUpdatingDriverId(null);
    }
  };

  const isDrivingForSelected = useMemo(
    () =>
      allDrivers.find((driver) => driver.id === selectedDriverId)?.status ===
      "driving",
    [allDrivers, selectedDriverId],
  );

  return (
    <AdminPage scroll>
      <DriversHeroPanel
        total={stats.total}
        driving={stats.driving}
        idle={stats.idle}
        onPhone={stats.onPhone}
        disable={stats.disable}
        onAdd={openCreateDialog}
      />

      <AdminErrorBanner
        label="Drivers unavailable"
        message={backendDrivers.error}
      />
      <AdminErrorBanner
        label="Trips unavailable"
        message={backendTrips.error}
      />
      <AdminErrorBanner
        label="Driver alerts unavailable"
        message={selectedDriverAlerts.error}
      />

      <DriverStatsBar stats={stats} />

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING, delay: 0.18 }}
        className="flex flex-1 flex-col gap-3"
      >
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-[1.5px]">
          <div className="rounded-[calc(1rem-1.5px)] border border-white/[0.04] bg-surface-1/40 p-3 backdrop-blur-sm">
            <DriverFilters
              search={search}
              eyeFilter={eyeFilter}
              statusFilter={statusFilter}
              onSearchChange={setSearch}
              onEyeFilterChange={setEyeFilter}
              onStatusFilterChange={setStatusFilter}
            />
          </div>
        </div>

        <DriverTable
          drivers={filtered}
          totalCount={allDrivers.length}
          updatingDriverId={updatingDriverId}
          onClearFilters={handleClearFilters}
          onSelectDriver={openManageDialog}
          onSetAvailability={handleSetAvailability}
        />
      </motion.section>

      <AnimatePresence>
        {dialogOpen ? (
          <AdminDialog
            title={
              dialogMode === "manage" ? "Quản lý tài xế" : "Tạo tài xế mới"
            }
            width={dialogMode === "manage" ? "lg" : "md"}
            description={
              dialogMode === "manage"
                ? "Cập nhật thông tin hồ sơ và trạng thái hoạt động của tài xế."
                : "Tạo hồ sơ tài xế để gán ca và giám sát hoạt động."
            }
            onClose={closeDialog}
            footer={
              <DriverDialogFooter
                mode={dialogMode}
                isSaving={isSaving}
                onCancel={closeDialog}
              />
            }
          >
            <DriverFormSections
              mode={dialogMode}
              form={form}
              setForm={setForm}
              isDrivingForSelected={isDrivingForSelected}
              selectedBackendDriverStatus={
                selectedBackendDriver?.status ?? undefined
              }
              selectedDriverId={selectedDriverId}
              selectedDriverTrips={selectedDriverTrips}
              selectedDriverAlerts={selectedDriverAlerts.fleetEvents ?? []}
              hasLinkedTrips={selectedDriverTrips.length > 0}
              averageScore={selectedDriverSafety.averageScore}
              totalAlerts={selectedDriverSafety.totalAlerts}
              criticalAlerts={selectedDriverSafety.criticalAlerts}
              formError={formError}
              onSubmit={handleSaveDriver}
            />
          </AdminDialog>
        ) : null}
      </AnimatePresence>
    </AdminPage>
  );
}
