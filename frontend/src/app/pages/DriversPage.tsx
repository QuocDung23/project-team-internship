import { FormEvent, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { AdminDialog } from "../component/admin/AdminDialog";
import { AdminErrorBanner, AdminPage } from "../component/admin/AdminShell";
import DriverDialogFooter from "../component/drivers/DriverDialogFooter";
import DriverFilters from "../component/drivers/DriverFilters";
import DriverFormSections from "../component/drivers/DriverFormSections";
import DriverStatsBar from "../component/drivers/DriverStatsBar";
import DriverTable from "../component/drivers/DriverTable";
import DriversHeroPanel from "../component/drivers/DriversHeroPanel";
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
import {
  EMPTY_FORM,
  SPRING,
  driverFormFromBackend,
  type DriverFormState,
} from "../utils/drivers/driverFormHelpers";

const PASSWORD_MIN_LENGTH = 12;

function coerceErrorMessage(error: unknown): string | null {
  if (error === null || error === undefined) return null;
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return String(error);
}

function DriversPage() {
  const { t } = useTranslation("drivers");
  const backendDrivers = useBackendDrivers();
  const backendTrips = useBackendTrips(false);
  const allDriverAlerts = useBackendAlerts(undefined, { status: "all" });
  const [search, setSearch] = useState("");
  const [eyeFilter, setEyeFilter] = useState<DriverEyeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<DriverStatusFilter>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "manage">("create");
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [form, setForm] = useState<DriverFormState>(EMPTY_FORM);
  const [formErrorKey, setFormErrorKey] = useState<string | null>(null);
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
      allDrivers.filter((driver) => {
        const needle = search.trim().toLowerCase();
        if (
          needle &&
          !driver.name.toLowerCase().includes(needle) &&
          !driver.id.toLowerCase().includes(needle) &&
          !driver.driverCode.toLowerCase().includes(needle) &&
          !driver.licenseNumber.toLowerCase().includes(needle) &&
          !driver.licensePlate.toLowerCase().includes(needle) &&
          !driver.email.toLowerCase().includes(needle) &&
          !driver.phone.toLowerCase().includes(needle)
        ) {
          return false;
        }
        if (eyeFilter !== "all" && driver.eyeState !== eyeFilter) return false;
        if (statusFilter !== "all" && driver.status !== statusFilter) return false;
        return true;
      }),
    [allDrivers, search, eyeFilter, statusFilter],
  );

  const stats: DriverStats = useMemo(
    () => ({
      total: allDrivers.length,
      driving: allDrivers.filter((driver) => driver.status === "driving").length,
      idle: allDrivers.filter((driver) => driver.status === "idle").length,
      disable: allDrivers.filter((driver) => driver.status === "disable").length,
      eyesOpen: allDrivers.filter((driver) => driver.eyeState === "open").length,
      eyesClosed: allDrivers.filter((driver) => driver.eyeState === "closed").length,
      yawning: allDrivers.filter((driver) => driver.eyeState === "yawning").length,
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
  const isDrivingForSelected = useMemo(
    () => allDrivers.find((driver) => driver.id === selectedDriverId)?.status === "driving",
    [allDrivers, selectedDriverId],
  );

  const openCreateDialog = () => {
    setDialogMode("create");
    setSelectedDriverId(null);
    setForm(EMPTY_FORM);
    setFormErrorKey(null);
    setDialogOpen(true);
  };

  const openManageDialog = (driver: Driver) => {
    const backendDriver = backendDrivers.rows?.find(
      (row) => row.driver_id === driver.id,
    );
    setDialogMode("manage");
    setSelectedDriverId(driver.id);
    setForm(driverFormFromBackend(backendDriver, driver));
    setFormErrorKey(null);
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
      setFormErrorKey("errors.validation.nameAndLicenseRequired");
      return;
    }
    if (dialogMode === "create" && !email) {
      setFormErrorKey("errors.validation.emailRequiredForCreate");
      return;
    }
    if (dialogMode === "create" && form.password.length < PASSWORD_MIN_LENGTH) {
      setFormErrorKey("errors.validation.passwordMinimum");
      return;
    }

    setIsSaving(true);
    setFormErrorKey(null);
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
      console.error("Failed to save driver", err);
      setFormErrorKey("errors.validation.saveFailed");
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

  const formErrorMessage = useMemo<string | null>(() => {
    if (!formErrorKey) return null;
    switch (formErrorKey) {
      case "errors.validation.passwordMinimum":
        return t(formErrorKey, { min: PASSWORD_MIN_LENGTH });
      case "errors.validation.nameAndLicenseRequired":
      case "errors.validation.emailRequiredForCreate":
      case "errors.validation.saveFailed":
        return t(formErrorKey);
      default:
        return null;
    }
  }, [formErrorKey, t]);

  return (
    <AdminPage scroll>
      <DriversHeroPanel
        total={stats.total}
        driving={stats.driving}
        idle={stats.idle}
        disable={stats.disable}
        onAdd={openCreateDialog}
      />
      <AdminErrorBanner
        label={t("errors.driversUnavailable")}
        message={backendDrivers.error}
      />
      <AdminErrorBanner
        label={t("errors.tripsUnavailable")}
        message={backendTrips.error}
      />
      <AdminErrorBanner
        label={t("errors.alertsUnavailable")}
        message={coerceErrorMessage(allDriverAlerts.error)}
      />
      <AdminErrorBanner
        label={t("errors.driverAlertsUnavailable")}
        message={coerceErrorMessage(selectedDriverAlerts.error)}
      />

      <DriverStatsBar stats={stats} />
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING, delay: 0.18 }}
        className="flex flex-1 flex-col gap-3"
      >
        <div className="rounded-2xl border border-white/6 bg-white/2 p-[1.5px]">
          <div className="rounded-[calc(1rem-1.5px)] border border-white/4 bg-surface-1/40 p-3 backdrop-blur-sm">
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
              dialogMode === "manage"
                ? t("dialog.manageTitle")
                : t("dialog.createTitle")
            }
            width={dialogMode === "manage" ? "lg" : "md"}
            description={
              dialogMode === "manage"
                ? t("dialog.manageDescription")
                : t("dialog.createDescription")
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
              selectedBackendDriverStatus={selectedBackendDriver?.status ?? undefined}
              selectedDriverId={selectedDriverId}
              selectedDriverTrips={selectedDriverTrips}
              selectedDriverAlerts={selectedDriverAlerts.fleetEvents ?? []}
              hasLinkedTrips={selectedDriverTrips.length > 0}
              averageScore={selectedDriverSafety.averageScore}
              totalAlerts={selectedDriverSafety.totalAlerts}
              criticalAlerts={selectedDriverSafety.criticalAlerts}
              formError={formErrorMessage}
              onSubmit={handleSaveDriver}
            />
          </AdminDialog>
        ) : null}
      </AnimatePresence>
    </AdminPage>
  );
}

export default DriversPage;
