import { useMemo } from "react";
import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { useBackendAlerts } from "../hook/useBackendAlerts";
import { useBackendDrivers, useBackendTrips } from "../hook/useBackendData";
import { useTicker } from "../hook/useTicker";
import { AdminEmptyState, AdminErrorBanner, AdminHeader, AdminPage, AdminStatStrip } from "../component/admin/AdminShell";
import { StatusBadge } from "../component/monitoring/StatusBadge";
import type { Driver } from "../types";
import type { FleetAlertEvent } from "../types/alerts";
import { buildSafetySummaryFromTrips, deriveDriverStatuses, type BackendTrip } from "../services/backendApi";
import DashboardConstants from "../constants/dashboards";

const EMPTY_DRIVERS: Driver[] = [];
const EMPTY_TRIPS: BackendTrip[] = [];
const EMPTY_ALERTS: FleetAlertEvent[] = [];

function DashboardPage() {
  const now = useTicker(1000);
  const backendDrivers = useBackendDrivers();
  const backendTrips = useBackendTrips(false);
  const backendAlerts = useBackendAlerts(undefined, { status: "all" });

  const trips = backendTrips.trips ?? EMPTY_TRIPS;
  const drivers = useMemo(
    () => deriveDriverStatuses(backendDrivers.drivers ?? EMPTY_DRIVERS, trips),
    [backendDrivers.drivers, trips],
  );
  const alerts = backendAlerts.fleetEvents ?? EMPTY_ALERTS;

  const safety = useMemo(() => buildSafetySummaryFromTrips(trips), [trips]);
  const activeTrips = useMemo(
    () => trips.filter((trip) => trip.status === "in_progress"),
    [trips],
  );
  const completedTrips = useMemo(
    () => trips.filter((trip) => trip.status === "completed"),
    [trips],
  );
  const lowScoreTrips = useMemo(
    () => completedTrips.filter((trip) => {
      const score = tripScore(trip);
      return score !== null && score < 60;
    }),
    [completedTrips],
  );
  const disabledDrivers = drivers.filter((driver) => driver.status === "disable");
  const openCriticalAlerts = alerts.filter((alert) => alert.severity === "critical" && !alert.acknowledged);
  const connected = backendDrivers.isLive && backendTrips.isLive && backendAlerts.isLive;

  return (
    <AdminPage>
      <AdminHeader
        eyebrow="Admin Console"
        title="Operations command center"
        description={`Live admin overview · ${new Date(now).toLocaleString()}`}
        actions={
          <StatusBadge
            tone={connected ? "active" : "warn"}
            label={connected ? "Backend live" : "Partial data"}
          />
        }
      />

      <AdminErrorBanner label="Drivers unavailable" message={backendDrivers.error} />
      <AdminErrorBanner label="Trips unavailable" message={backendTrips.error} />
      <AdminErrorBanner label="Alerts unavailable" message={backendAlerts.error} />

      <AdminStatStrip
        items={[
          {
            label: "Driving",
            value: drivers.filter((driver) => driver.status === "driving").length,
            tone: "active",
            detail: `${drivers.filter((driver) => driver.status === "idle").length} idle · ${disabledDrivers.length} disable`,
          },
          {
            label: "Active trips",
            value: activeTrips.length,
            tone: activeTrips.length > 0 ? "active" : "neutral",
            detail: `${completedTrips.length} completed`,
          },
          {
            label: "Open critical",
            value: openCriticalAlerts.length,
            tone: openCriticalAlerts.length > 0 ? "critical" : "active",
            detail: `${safety.totalAlerts} total alerts`,
          },
          {
            label: "Avg score",
            value: safety.averageScore ?? "-",
            tone: safety.averageScore !== null && safety.averageScore < 60 ? "critical" : "active",
            detail: `${safety.scoredTrips} scored trips`,
          },
        ]}
      />

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <AttentionPanel
          criticalAlerts={openCriticalAlerts}
          disabledDrivers={disabledDrivers}
          lowScoreTrips={lowScoreTrips}
        />
        <ActiveTripsPanel trips={activeTrips} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <DriverStatusPanel drivers={drivers} />
        <RecentAlertsPanel alerts={alerts} />
      </section>
    </AdminPage>
  );
}

function AttentionPanel({
  criticalAlerts,
  disabledDrivers,
  lowScoreTrips,
}: {
  criticalAlerts: FleetAlertEvent[];
  disabledDrivers: Driver[];
  lowScoreTrips: BackendTrip[];
}) {
  const hasItems = criticalAlerts.length > 0 || disabledDrivers.length > 0 || lowScoreTrips.length > 0;
  return (
    <section className="panel grid content-start gap-3 px-5 py-4">
      <PanelHeader title="Needs attention" action={<LinkButton to="/alerts" label="Review alerts" />} />
      {!hasItems ? (
        <AdminEmptyState title="No urgent admin work" detail="Critical alerts, disabled drivers, and low-score trips will appear here." />
      ) : (
        <div className="grid gap-2">
          {criticalAlerts.slice(0, 4).map((alert) => (
            <AttentionItem
              key={alert.id}
              tone="critical"
              title={alert.driverName}
              detail={`${alert.location} · ${new Date(alert.timestamp).toLocaleTimeString()}`}
            />
          ))}
          {disabledDrivers.slice(0, 3).map((driver) => (
            <AttentionItem
              key={driver.id}
              tone="warn"
              title={driver.name}
              detail={`Disabled driver · ${driver.licensePlate}`}
            />
          ))}
          {lowScoreTrips.slice(0, 3).map((trip) => (
            <AttentionItem
              key={trip.trip_id}
              tone="warn"
              title={trip.code || trip.trip_id}
              detail={`Safety score ${tripScore(trip)} · ${trip.critical_alerts_count ?? 0} critical`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ActiveTripsPanel({ trips }: { trips: BackendTrip[] }) {
  return (
    <section className="panel grid content-start gap-3 px-5 py-4">
      <PanelHeader title="Active trips" action={<LinkButton to="/trips" label="Open trips" />} />
      {trips.length === 0 ? (
        <AdminEmptyState title="No active trips" detail="Trips in progress will appear here with alert counts." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px]">
            <thead className="text-[10px] uppercase tracking-wider text-zinc-500">
              <tr className="border-b border-hairline">
                <th className="py-2 pr-3 font-medium">Trip</th>
                <th className="py-2 pr-3 font-medium">Driver</th>
                <th className="py-2 pr-3 font-medium">Started</th>
                <th className="py-2 pr-3 font-medium">Alerts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {trips.slice(0, 6).map((trip) => (
                <tr key={trip.trip_id} className="hover:bg-surface-2/40">
                  <td className="py-2.5 pr-3 font-mono-num text-zinc-200">{trip.code || shortId(trip.trip_id)}</td>
                  <td className="py-2.5 pr-3 text-zinc-400">{trip.driver_name ?? trip.driver_id ?? "-"}</td>
                  <td className="py-2.5 pr-3 font-mono-num text-zinc-500">{formatDate(trip.actual_start_at ?? trip.start_time)}</td>
                  <td className="py-2.5 pr-3 font-mono-num text-amber-300">{trip.total_alerts_count ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function DriverStatusPanel({ drivers }: { drivers: Driver[] }) {
  const rows = drivers
    .filter((driver) => driver.status === "driving" || driver.status === "disable" || driver.totalAlerts > 0)
    .slice(0, 8);
  return (
    <section className="panel grid content-start gap-3 px-5 py-4">
      <PanelHeader title="Driver status" action={<LinkButton to="/drivers" label="Manage drivers" />} />
      {rows.length === 0 ? (
        <AdminEmptyState title="No notable driver status" detail="Driving, disabled, or alert-heavy drivers will appear here." />
      ) : (
        <div className="grid gap-2">
          {rows.map((driver) => (
            <div key={driver.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-md border border-hairline bg-zinc-950/30 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-zinc-100">{driver.name}</p>
                <p className="truncate font-mono-num text-[11px] text-zinc-500">{driver.licensePlate}</p>
              </div>
              <StatusBadge tone={DashboardConstants.STATUS_TONE[driver.status]} label={DashboardConstants.STATUS_LABEL[driver.status]} />
              <span className="font-mono-num text-xs text-amber-300">{driver.totalAlerts}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function RecentAlertsPanel({ alerts }: { alerts: FleetAlertEvent[] }) {
  const rows = alerts.slice(0, 8);
  return (
    <section className="panel grid content-start gap-3 px-5 py-4">
      <PanelHeader title="Recent alerts" action={<LinkButton to="/alerts" label="Open alerts" />} />
      {rows.length === 0 ? (
        <AdminEmptyState title="No recent alerts" detail="Warning and critical alerts will appear here." />
      ) : (
        <div className="grid gap-2">
          {rows.map((alert) => (
            <div key={alert.id} className="grid grid-cols-[1fr_auto] gap-3 rounded-md border border-hairline bg-zinc-950/30 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-zinc-100">{alert.driverName}</p>
                <p className="truncate text-xs text-zinc-500">{alert.location} · {new Date(alert.timestamp).toLocaleString()}</p>
              </div>
              <StatusBadge tone={alert.acknowledged ? "active" : alert.severity === "critical" ? "critical" : "warn"} label={alert.acknowledged ? "Ack" : alert.severity} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function PanelHeader({ title, action }: { title: string; action?: ReactElement }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-[13px] font-semibold tracking-tight text-zinc-100">{title}</h2>
      {action}
    </div>
  );
}

function AttentionItem({ tone, title, detail }: { tone: "warn" | "critical"; title: string; detail: string }) {
  return (
    <div className={`rounded-md border px-3 py-2 ${tone === "critical" ? "border-red-500/20 bg-red-500/5" : "border-amber-500/20 bg-amber-500/5"}`}>
      <p className="text-sm font-medium text-zinc-100">{title}</p>
      <p className={tone === "critical" ? "mt-1 text-xs text-red-300" : "mt-1 text-xs text-amber-300"}>{detail}</p>
    </div>
  );
}

function LinkButton({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="rounded-md border border-hairline px-2.5 py-1.5 text-[11px] text-zinc-400 hover:bg-surface-2 hover:text-zinc-200">
      {label}
    </Link>
  );
}

function tripScore(trip: BackendTrip): number | null {
  if (trip.safety_score && typeof trip.safety_score === "object") return trip.safety_score.score;
  const score = Number(trip.safety_score);
  return Number.isFinite(score) ? score : null;
}

function shortId(value: string): string {
  return value.length > 12 ? `${value.slice(0, 8)}...` : value;
}

function formatDate(value?: string | null): string {
  return value ? new Date(value).toLocaleString() : "-";
}

export default DashboardPage;
