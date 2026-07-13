import { Plus, SpinnerGap } from "@phosphor-icons/react";
import { FormEvent, useMemo, useState } from "react";
import { AdminDialog } from "../component/admin/AdminDialog";
import { AdminErrorBanner, AdminHeader, AdminPage } from "../component/admin/AdminShell";
import DriverFilters from "../component/drivers/DriverFilters";
import DriverStatsBar from "../component/drivers/DriverStatsBar";
import DriverTable from "../component/drivers/DriverTable";
import { useBackendAlerts } from "../hook/useBackendAlerts";
import { useBackendDrivers, useBackendTrips } from "../hook/useBackendData";
import {
  buildSafetySummaryFromTrips,
  deriveDriverStatuses,
  getTripsForDriver,
  type BackendDriver,
  type BackendTrip,
} from "../services/backendApi";
import type { Driver } from "../types";
import type { FleetAlertEvent } from "../types/alerts";
import type {
  DriverEyeFilter,
  DriverStats,
  DriverStatusFilter,
} from "../types/drivers";
import { SafetyScoreValue } from "../utils/safetyScore";

interface DriverFormState {
  fullName: string;
  licenseNumber: string;
  phone: string;
  email: string;
  password: string;
  status: "active" | "inactive";
}

const EMPTY_FORM: DriverFormState = {
  fullName: "",
  licenseNumber: "",
  phone: "",
  email: "",
  password: "",
  status: "active",
};

function DriversPage() {
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
  const selectedDriverAlerts = useBackendAlerts(undefined, selectedDriverId ? {
    driverId: selectedDriverId,
    status: "all",
  } : {});

  const allDrivers: Driver[] = useMemo(
    () => deriveDriverStatuses(backendDrivers.drivers ?? [], backendTrips.trips ?? []),
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
    () => backendDrivers.rows?.find((driver) => driver.driver_id === selectedDriverId) ?? null,
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
    const backendDriver = backendDrivers.rows?.find((row) => row.driver_id === driver.id);
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
      setFormError(err instanceof Error ? err.message : "Failed to save driver");
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

  return (
    <AdminPage scroll>
      <AdminHeader
        eyebrow="Driver Management"
        title="Drivers"
        description={`${stats.total} drivers · ${stats.driving} driving · ${stats.idle} idle · ${stats.disable} disabled`}
        actions={
          <button
            type="button"
            onClick={openCreateDialog}
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/15 px-3 py-1.5 text-[11px] font-medium text-emerald-300 ring-1 ring-emerald-500/25 transition-colors hover:bg-emerald-500/25"
          >
            <Plus size={13} weight="bold" />
            New Driver
          </button>
        }
      />
      <AdminErrorBanner label="Drivers unavailable" message={backendDrivers.error} />
      <AdminErrorBanner label="Trips unavailable" message={backendTrips.error} />
      <AdminErrorBanner label="Driver alerts unavailable" message={selectedDriverAlerts.error} />

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
        updatingDriverId={updatingDriverId}
        onClearFilters={handleClearFilters}
        onSelectDriver={openManageDialog}
        onSetAvailability={handleSetAvailability}
      />

      {dialogOpen ? (
        <AdminDialog
          title={dialogMode === "manage" ? "Manage driver" : "New driver"}
          width={dialogMode === "manage" ? "lg" : "md"}
          description={
            dialogMode === "manage"
              ? "Update driver profile details and availability."
              : "Create a driver profile for admin assignment and monitoring."
          }
          onClose={closeDialog}
          footer={
            <>
              <button
                type="button"
                onClick={closeDialog}
                disabled={isSaving}
                className="rounded-md border border-hairline px-3 py-1.5 text-[11px] text-zinc-400 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="driver-form"
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/15 px-3 py-1.5 text-[11px] font-medium text-emerald-300 ring-1 ring-emerald-500/25 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? <SpinnerGap size={13} className="animate-spin" /> : <Plus size={13} weight="bold" />}
                {dialogMode === "manage" ? "Save" : "Create"}
              </button>
            </>
          }
        >
          <form id="driver-form" onSubmit={handleSaveDriver} className="grid gap-3">
            {formError ? (
              <div className="rounded-md border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                {formError}
              </div>
            ) : null}
            {dialogMode === "manage" ? (
              <div className="rounded-md border border-hairline bg-zinc-950/40 px-3 py-2 text-[11px] text-zinc-500">
                Driver ID: <span className="font-mono-num text-zinc-300">{selectedDriverId}</span>
              </div>
            ) : null}
            <DriverTextField
              label="Full name"
              value={form.fullName}
              required
              onChange={(fullName) => setForm((current) => ({ ...current, fullName }))}
            />
            <DriverTextField
              label="License number"
              value={form.licenseNumber}
              required
              onChange={(licenseNumber) => setForm((current) => ({ ...current, licenseNumber }))}
            />
            <div className="grid gap-3 md:grid-cols-2">
              <DriverTextField
                label="Phone"
                value={form.phone}
                onChange={(phone) => setForm((current) => ({ ...current, phone }))}
              />
              <DriverTextField
                label="Email"
                value={form.email}
                type="email"
                onChange={(email) => setForm((current) => ({ ...current, email }))}
              />
            </div>
            {dialogMode === "create" ? (
              <DriverTextField
                label="Password"
                value={form.password}
                required
                type="password"
                onChange={(password) => setForm((current) => ({ ...current, password }))}
              />
            ) : null}
            <label className="grid gap-1 text-[11px] text-zinc-400">
              Availability
              <select
                value={form.status}
                disabled={selectedBackendDriver?.status === "active" && allDrivers.find((driver) => driver.id === selectedDriverId)?.status === "driving"}
                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as DriverFormState["status"] }))}
                className="rounded-md border border-hairline bg-surface-2 px-3 py-2 text-[12px] text-zinc-100 outline-none focus:border-emerald-500/50"
              >
                <option value="active">Idle / enabled</option>
                <option value="inactive">Disabled</option>
              </select>
              {allDrivers.find((driver) => driver.id === selectedDriverId)?.status === "driving" ? (
                <span className="text-[10px] text-zinc-500">Driving drivers cannot be disabled until the active trip ends.</span>
              ) : null}
            </label>
            {dialogMode === "manage" ? (
              <DriverActivityPanel
                trips={selectedDriverTrips}
                alerts={selectedDriverAlerts.fleetEvents ?? []}
                hasLinkedTrips={selectedDriverTrips.length > 0}
                averageScore={selectedDriverSafety.averageScore}
                totalAlerts={selectedDriverSafety.totalAlerts}
                criticalAlerts={selectedDriverSafety.criticalAlerts}
              />
            ) : null}
          </form>
        </AdminDialog>
      ) : null}
    </AdminPage>
  );
}

function DriverActivityPanel({
  trips,
  alerts,
  hasLinkedTrips,
  averageScore,
  totalAlerts,
  criticalAlerts,
}: {
  trips: BackendTrip[];
  alerts: FleetAlertEvent[];
  hasLinkedTrips: boolean;
  averageScore: number | null;
  totalAlerts: number;
  criticalAlerts: number;
}) {
  return (
    <section className="mt-1 grid gap-3 rounded-md border border-hairline bg-zinc-950/30 p-3">
      <div className="grid grid-cols-4 gap-2">
        <DriverActivityStat label="Trips" value={trips.length} />
        <DriverActivityStat label="Avg score" value={averageScore ?? "-"} />
        <DriverActivityStat label="Alerts" value={totalAlerts} tone={totalAlerts > 0 ? "text-amber-300" : "text-zinc-100"} />
        <DriverActivityStat label="Critical" value={criticalAlerts} tone={criticalAlerts > 0 ? "text-red-300" : "text-zinc-100"} />
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-[12px] font-semibold text-zinc-100">Trips and scores</h3>
          <span className="font-mono-num text-[10px] text-zinc-500">{trips.length}</span>
        </div>
        {trips.slice(0, 5).map((trip) => (
          <div key={trip.trip_id} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 rounded-md border border-hairline bg-surface/60 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate font-mono-num text-[11px] text-zinc-200">{tripTitle(trip)}</p>
              <p className="truncate text-[10px] text-zinc-500">{routeLabel(trip)}</p>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-zinc-500">{trip.status}</span>
            <span className={tripCriticalAlerts(trip) > 0 ? "font-mono-num text-[11px] text-red-300" : "font-mono-num text-[11px] text-amber-300"}>
              {tripAlertLabel(trip)}
            </span>
            <span className="font-mono-num text-[11px] text-zinc-300"><SafetyScoreValue trip={trip} /></span>
          </div>
        ))}
        {trips.length === 0 ? (
          <p className="rounded-md border border-hairline bg-surface/60 px-3 py-4 text-center text-[11px] text-zinc-500">
            No trips for this driver yet.
          </p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-[12px] font-semibold text-zinc-100">Recent alerts</h3>
          <span className="font-mono-num text-[10px] text-zinc-500">{alerts.length}</span>
        </div>
        {alerts.slice(0, 5).map((alert) => (
          <div key={alert.id} className="grid grid-cols-[1fr_auto] gap-2 rounded-md border border-hairline bg-surface/60 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-[11px] font-medium text-zinc-200">{alert.location}</p>
              <p className="truncate text-[10px] text-zinc-500">{new Date(alert.timestamp).toLocaleString()}</p>
            </div>
            <span className={alert.severity === "critical" ? "text-[10px] text-red-300" : "text-[10px] text-amber-300"}>
              {alert.acknowledged ? "ack" : alert.severity}
            </span>
          </div>
        ))}
        {alerts.length === 0 ? (
          <p className="rounded-md border border-hairline bg-surface/60 px-3 py-4 text-center text-[11px] text-zinc-500">
            {hasLinkedTrips ? "No alerts for this driver's linked trips." : "No alerts yet because no trips are linked to this driver."}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function DriverActivityStat({
  label,
  value,
  tone = "text-zinc-100",
}: {
  label: string;
  value: string | number;
  tone?: string;
}) {
  return (
    <div className="rounded-md border border-hairline bg-surface/60 px-2 py-2">
      <p className="text-[9px] uppercase tracking-wider text-zinc-500">{label}</p>
      <p className={`mt-1 font-mono-num text-base font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

function tripAlertLabel(trip: BackendTrip): string {
  const total = Number(trip.total_alerts_count ?? 0);
  const critical = tripCriticalAlerts(trip);
  if (total <= 0) return "0 alerts";
  return critical > 0 ? `${total} alerts · ${critical} crit` : `${total} alerts`;
}

function tripCriticalAlerts(trip: BackendTrip): number {
  return Number(trip.critical_alerts_count ?? 0);
}

function routeLabel(trip: BackendTrip): string {
  if (trip.origin && trip.destination) return `${trip.origin} → ${trip.destination}`;
  return trip.origin || trip.destination || "Route not provided";
}

function tripTitle(trip: BackendTrip): string {
  return trip.code || "Trip without code";
}

function driverFormFromBackend(backendDriver: BackendDriver | undefined, driver: Driver): DriverFormState {
  return {
    fullName: backendDriver?.full_name ?? driver.name,
    licenseNumber: backendDriver?.license_number ?? driver.licensePlate,
    phone: backendDriver?.phone ?? driver.phone,
    email: backendDriver?.email ?? "",
    password: "",
    status: backendDriver?.status === "inactive" || backendDriver?.status === "suspended" ? "inactive" : "active",
  };
}

function DriverTextField({
  label,
  value,
  required = false,
  type = "text",
  onChange,
}: {
  label: string;
  value: string;
  required?: boolean;
  type?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-[11px] text-zinc-400">
      {label}
      <input
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-md border border-hairline bg-surface-2 px-3 py-2 text-[12px] text-zinc-100 outline-none focus:border-emerald-500/50"
      />
    </label>
  );
}

export default DriversPage;
