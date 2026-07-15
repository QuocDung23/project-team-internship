import { useMemo } from "react";
import type { ReactElement } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useBackendAlerts } from "../hook/useBackendAlerts";
import { useBackendDrivers, useBackendTrips } from "../hook/useBackendData";
import { useTicker } from "../hook/useTicker";
import {
  AdminEmptyState,
  AdminErrorBanner,
  AdminHeader,
  AdminPage,
  AdminStatStrip,
} from "../component/admin/AdminShell";
import { StatusBadge } from "../component/monitoring/StatusBadge";
import { useAppLocale } from "../i18n/useAppLocale";
import type { Driver } from "../types";
import type { FleetAlertEvent, FleetEventSeverity } from "../types/alerts";
import {
  deriveDriverStatuses,
  getTripsForDriver,
  type BackendTrip,
} from "../services/backendApi";

const EMPTY_DRIVERS: Driver[] = [];
const EMPTY_TRIPS: BackendTrip[] = [];
const EMPTY_ALERTS: FleetAlertEvent[] = [];

function toErrorMessage(error: unknown): string | null {
  if (error === null || error === undefined) return null;
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return String(error);
}

interface DriverAlertSummary {
  driver: Driver;
  averageScore: number | null;
  scoredTrips: number;
}

interface AlertDaySummary {
  key: string;
  label: string;
  count: number;
}

interface AlertDistributionSummary {
  criticalOpen: number;
  criticalAcknowledged: number;
  warnOpen: number;
  warnAcknowledged: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05,
    },
  },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.32, 0.72, 0, 1] as const,
    },
  },
};

function DashboardPage() {
  const { t } = useTranslation("dashboard");
  const { t: tn } = useTranslation("navigation");
  const { formatTime, formatDate, formatNumber } = useAppLocale();
  const formatDayLabel = useMemo(
    () => (date: Date) => formatDate(date, { month: "short", day: "numeric" }),
    [formatDate],
  );

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

  const activeTrips = useMemo(
    () =>
      trips
        .filter((trip) => trip.status === "in_progress")
        .sort((a, b) => tripTime(b) - tripTime(a)),
    [trips],
  );
  const completedTrips = useMemo(
    () => trips.filter((trip) => trip.status === "completed"),
    [trips],
  );
  const driverAlertRows = useMemo(
    () => buildDriverAlertSummaries(drivers, trips),
    [drivers, trips],
  );
  const todayAlerts = useMemo(
    () =>
      alerts.filter(
        (alert) =>
          dateKey(new Date(alert.timestamp)) === dateKey(new Date(now)),
      ),
    [alerts, now],
  );
  const todayDistribution = useMemo(
    () => buildAlertDistribution(todayAlerts),
    [todayAlerts],
  );
  const alertDays = useMemo(
    () => buildAlertDays(alerts, now, formatDayLabel),
    [alerts, now, formatDayLabel],
  );

  const disabledDrivers = drivers.filter(
    (driver) => driver.status === "disable",
  );
  const openAlerts = alerts.filter((alert) => !alert.acknowledged);
  const openCriticalAlerts = openAlerts.filter(
    (alert) => alert.severity === "critical",
  );
  const totalAlerts = trips.reduce(
    (sum, trip) => sum + toNumber(trip.total_alerts_count),
    0,
  );
  const connected =
    backendDrivers.isLive && backendTrips.isLive && backendAlerts.isLive;

  return (
    <AdminPage>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <AdminHeader
          eyebrow={tn("console.admin")}
          title={t("header.title")}
          description={t("header.description")}
          actions={
            <>
              <span className="inline-flex items-center gap-2 rounded-lg border border-hairline bg-subtle-bg px-3 py-1.5 text-[11px] text-text-secondary">
                <span className="text-text-tertiary">
                  {t("header.lastRefreshed")}
                </span>
                <span className="font-mono-num tabular-nums text-text-primary">
                  {formatTime(now)}
                </span>
              </span>
              <StatusBadge
                tone={connected ? "active" : "warn"}
                label={connected ? t("header.backendLive") : t("header.partialData")}
              />
            </>
          }
        />

        <motion.div
          variants={sectionVariants}
          className="mt-5 flex flex-col gap-3"
        >
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
            message={toErrorMessage(backendAlerts.error)}
          />
        </motion.div>

        <motion.div variants={sectionVariants}>
          <AdminStatStrip
            items={[
              {
                label: t("kpi.labels.driving"),
                value: formatNumber(
                  drivers.filter((driver) => driver.status === "driving")
                    .length,
                ),
                tone: "active",
                detail: t("kpi.details.drivingSummary", {
                  idle: drivers.filter((driver) => driver.status === "idle")
                    .length,
                  disabled: disabledDrivers.length,
                }),
              },
              {
                label: t("kpi.labels.activeTrips"),
                value: formatNumber(activeTrips.length),
                tone: activeTrips.length > 0 ? "active" : "neutral",
                detail: t("kpi.details.activeTripsCompleted", {
                  count: completedTrips.length,
                }),
              },
              {
                label: t("kpi.labels.openCritical"),
                value: formatNumber(openCriticalAlerts.length),
                tone: openCriticalAlerts.length > 0 ? "critical" : "active",
                detail: t("kpi.details.openAlerts", {
                  count: openAlerts.length,
                }),
              },
              {
                label: t("kpi.labels.totalAlerts"),
                value: formatNumber(totalAlerts || alerts.length),
                tone: alerts.length > 0 || totalAlerts > 0 ? "warn" : "neutral",
                detail: t("kpi.details.alertsAcknowledged", {
                  count: alerts.filter((alert) => alert.acknowledged).length,
                }),
              },
            ]}
          />
        </motion.div>

        <motion.section
          variants={sectionVariants}
          className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_0.75fr]"
        >
          <ActiveTripsPanel
            trips={activeTrips}
            isLoading={!backendTrips.isLive && !backendTrips.error}
            error={backendTrips.error}
          />
          <DriverRankingPanel
            rows={driverAlertRows}
            isLoading={
              (!backendDrivers.isLive && !backendDrivers.error) ||
              (!backendTrips.isLive && !backendTrips.error)
            }
            error={backendDrivers.error ?? backendTrips.error}
          />
        </motion.section>

        <motion.section
          variants={sectionVariants}
          className="mt-5 grid gap-5 xl:grid-cols-[0.85fr_1.15fr]"
        >
          <TodayAlertDistributionPanel
            alerts={todayAlerts}
            distribution={todayDistribution}
            isLoading={!backendAlerts.isLive && !backendAlerts.error}
            error={toErrorMessage(backendAlerts.error)}
          />
          <AlertsLastSevenDaysPanel
            days={alertDays}
            isLoading={!backendAlerts.isLive && !backendAlerts.error}
            error={toErrorMessage(backendAlerts.error)}
          />
        </motion.section>
      </motion.div>
    </AdminPage>
  );
}

function ActiveTripsPanel({
  trips,
  isLoading,
  error,
}: {
  trips: BackendTrip[];
  isLoading: boolean;
  error: string | null;
}) {
  const { t } = useTranslation("dashboard");
  const { formatDateTime, formatNumber } = useAppLocale();

  return (
    <DashboardPanel
      title={t("activeTrips.title")}
      action={<LinkButton to="/trips" label={t("activeTrips.actionLabel")} />}
    >
      {error ? (
        <PanelError message={t("errors.activeTripsUnavailable")} />
      ) : null}
      {!error && isLoading ? (
        <PanelLoading label={t("loading.activeTrips")} />
      ) : null}
      {!error && !isLoading && trips.length === 0 ? (
        <AdminEmptyState
          title={t("activeTrips.emptyTitle")}
          detail={t("activeTrips.emptyDetail")}
        />
      ) : null}
      {!error && !isLoading && trips.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[12px]">
            <thead className="text-[10px] uppercase tracking-wider text-text-tertiary">
              <tr className="border-b border-hairline">
                <th className="py-2 pr-4 font-medium">{t("activeTrips.columns.trip")}</th>
                <th className="py-2 pr-4 font-medium">{t("activeTrips.columns.driver")}</th>
                <th className="py-2 pr-4 font-medium">{t("activeTrips.columns.vehicle")}</th>
                <th className="py-2 pr-4 font-medium">{t("activeTrips.columns.started")}</th>
                <th className="py-2 pr-4 text-right font-medium">{t("activeTrips.columns.alerts")}</th>
                <th className="py-2 text-right font-medium">{t("activeTrips.columns.score")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {trips.slice(0, 6).map((trip) => (
                <tr
                  key={trip.trip_id}
                  className="group cursor-pointer transition-colors duration-200 hover:bg-subtle-bg-hover"
                >
                  <td className="py-2.5 pr-4">
                    <p className="font-mono-num text-[12px] font-medium text-text-primary">
                      {tripTitle(trip, t)}
                    </p>
                    <p className="truncate text-[11px] text-text-tertiary">
                      {routeLabel(trip, t)}
                    </p>
                  </td>
                  <td className="py-2.5 pr-4">
                    <p className="truncate text-[12px] font-medium text-text-secondary">
                      {driverLabel(trip, t)}
                    </p>
                    <p className="truncate text-[11px] text-text-tertiary">
                      {trip.driver_email ?? t("activeTrips.fallback.noEmail")}
                    </p>
                  </td>
                  <td className="py-2.5 pr-4 font-mono-num text-text-secondary">
                    {trip.vehicle_plate ?? t("activeTrips.fallback.unassigned")}
                  </td>
                  <td className="py-2.5 pr-4 font-mono-num text-text-tertiary">
                    {formatTripDate(
                      trip.actual_start_at ??
                        trip.start_time ??
                        trip.planned_start_at,
                      formatDateTime,
                    )}
                  </td>
                  <td className="py-2.5 pr-4 text-right">
                    <span className="font-mono-num text-accent-warn">
                      {formatNumber(toNumber(trip.total_alerts_count))}
                    </span>
                    <span className="ml-2 font-mono-num text-accent-critical">
                      {formatNumber(toNumber(trip.critical_alerts_count))}{" "}
                      {t("activeTrips.criticalShort")}
                    </span>
                  </td>
                  <td className="py-2.5 text-right">{scoreBadge(trip, t)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </DashboardPanel>
  );
}

function DriverRankingPanel({
  rows,
  isLoading,
  error,
}: {
  rows: DriverAlertSummary[];
  isLoading: boolean;
  error: string | null;
}) {
  const { t } = useTranslation("dashboard");
  const hasAlertHistory = rows.some((row) => row.driver.totalAlerts > 0);
  const topRows = rows.filter((row) => row.driver.totalAlerts > 0).slice(0, 10);

  return (
    <DashboardPanel
      title={t("driverRanking.title")}
      action={
        <LinkButton to="/drivers" label={t("driverRanking.actionLabel")} />
      }
    >
      {error ? (
        <PanelError message={t("errors.driverRankingUnavailable")} />
      ) : null}
      {!error && isLoading ? (
        <PanelLoading label={t("loading.driverRanking")} />
      ) : null}
      {!error && !isLoading && !hasAlertHistory ? (
        <AdminEmptyState
          title={t("driverRanking.emptyTitle")}
          detail={t("driverRanking.emptyDetail")}
        />
      ) : null}
      {!error && !isLoading && hasAlertHistory ? (
        <div className="flex flex-col gap-2">
          {topRows.map(({ driver, averageScore, scoredTrips }, index) => (
            <div
              key={driver.id}
              className="flex items-center gap-3 rounded-lg border border-hairline bg-subtle-bg px-3 py-2.5"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-subtle-bg text-[11px] font-semibold text-text-tertiary">
                {t("driverRanking.rankPosition", { position: index + 1 })}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium text-text-primary">
                  {driver.name}
                </p>
                <p className="truncate font-mono-num text-[11px] text-text-tertiary">
                  {t("driverRanking.licenseSeparator", {
                    license: driver.licenseNumber,
                    plate: driver.licensePlate,
                  })}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-mono-num text-[12px] font-semibold text-accent-warn">
                  {t("driverRanking.alertSummary", {
                    alerts: driver.totalAlerts,
                  })}
                </p>
                <p className="text-[11px] text-text-tertiary">
                  <span className="font-mono-num text-accent-critical">
                    {t("driverRanking.criticalSummary", {
                      count: driver.criticalAlerts,
                    })}
                  </span>{" "}
                  -{" "}
                  {averageScore === null
                    ? t("driverRanking.noScore")
                    : scoredTrips > 0
                      ? t("driverRanking.avgScoreWithCount", {
                          score: averageScore,
                          count: scoredTrips,
                        })
                      : t("driverRanking.avgScore", { score: averageScore })}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </DashboardPanel>
  );
}

function TodayAlertDistributionPanel({
  alerts,
  distribution,
  isLoading,
  error,
}: {
  alerts: FleetAlertEvent[];
  distribution: AlertDistributionSummary;
  isLoading: boolean;
  error: string | null;
}) {
  const { t } = useTranslation("dashboard");
  const total = alerts.length;

  return (
    <DashboardPanel
      title={t("todayDistribution.title")}
      action={
        <LinkButton to="/alerts" label={t("todayDistribution.actionLabel")} />
      }
    >
      {error ? (
        <PanelError message={t("errors.todayAlertsUnavailable")} />
      ) : null}
      {!error && isLoading ? (
        <PanelLoading label={t("loading.todayAlerts")} />
      ) : null}
      {!error && !isLoading && total === 0 ? (
        <AdminEmptyState
          title={t("todayDistribution.emptyTitle")}
          detail={t("todayDistribution.emptyDetail")}
        />
      ) : null}
      {!error && !isLoading && total > 0 ? (
        <div className="flex flex-col gap-3">
          <DistributionRow
            label={t("todayDistribution.rows.criticalOpen")}
            value={distribution.criticalOpen}
            total={total}
            severity="critical"
            status="open"
          />
          <DistributionRow
            label={t("todayDistribution.rows.criticalAcknowledged")}
            value={distribution.criticalAcknowledged}
            total={total}
            severity="critical"
            status="acknowledged"
          />
          <DistributionRow
            label={t("todayDistribution.rows.warningOpen")}
            value={distribution.warnOpen}
            total={total}
            severity="warn"
            status="open"
          />
          <DistributionRow
            label={t("todayDistribution.rows.warningAcknowledged")}
            value={distribution.warnAcknowledged}
            total={total}
            severity="warn"
            status="acknowledged"
          />
        </div>
      ) : null}
    </DashboardPanel>
  );
}

function DistributionRow({
  label,
  value,
  total,
  severity,
  status,
}: {
  label: string;
  value: number;
  total: number;
  severity: FleetEventSeverity;
  status: "open" | "acknowledged";
}) {
  const { t } = useTranslation("dashboard");
  const { formatNumber } = useAppLocale();
  const severityClass =
    severity === "critical" ? "bg-accent-critical" : "bg-accent-warn";
  const statusClass =
    status === "acknowledged" ? "text-accent-active" : "text-text-secondary";
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2 text-[12px] font-medium text-text-secondary">
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${severityClass}`}
            aria-hidden
          />
          <span className="truncate">{label}</span>
        </span>
        <span className="shrink-0 font-mono-num text-[12px] text-text-tertiary">
          {formatNumber(value)}{" "}
          <span className={statusClass}>
            {t("todayDistribution.percent", { value: percent })}
          </span>
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-subtle-bg">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] as const }}
          className={`h-full rounded-full ${severityClass}`}
        />
      </div>
    </div>
  );
}

function AlertsLastSevenDaysPanel({
  days,
  isLoading,
  error,
}: {
  days: AlertDaySummary[];
  isLoading: boolean;
  error: string | null;
}) {
  const { t } = useTranslation("dashboard");
  const { formatNumber } = useAppLocale();
  const max = Math.max(...days.map((day) => day.count), 1);

  return (
    <DashboardPanel title={t("weekTrend.title")}>
      {error ? (
        <PanelError message={t("errors.weekTrendUnavailable")} />
      ) : null}
      {!error && isLoading ? (
        <PanelLoading label={t("loading.weekTrend")} />
      ) : null}
      {!error && !isLoading && days.every((day) => day.count === 0) ? (
        <AdminEmptyState
          title={t("weekTrend.emptyTitle")}
          detail={t("weekTrend.emptyDetail")}
        />
      ) : null}
      {!error && !isLoading && days.some((day) => day.count > 0) ? (
        <div className="flex flex-col gap-2">
          {days.map((day) => {
            const percent =
              day.count === 0
                ? 0
                : Math.max(6, Math.round((day.count / max) * 100));
            return (
              <div
                key={day.key}
                className="grid grid-cols-[3.5rem_1fr_2.5rem] items-center gap-3"
              >
                <span className="text-[11px] text-text-tertiary">
                  {day.label}
                </span>
                <div className="h-6 overflow-hidden rounded-md bg-subtle-bg">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{
                      duration: 0.5,
                      delay: 0.1,
                      ease: [0.32, 0.72, 0, 1] as const,
                    }}
                    className="flex h-full items-center rounded-md bg-accent-active/20 px-2"
                  />
                </div>
                <span className="text-right font-mono-num text-[12px] text-text-secondary">
                  {formatNumber(day.count)}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}
    </DashboardPanel>
  );
}

function DashboardPanel({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactElement;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-hairline bg-subtle-bg px-5 py-4">
      <PanelHeader title={title} action={action} />
      {children}
    </section>
  );
}

function PanelHeader({
  title,
  action,
}: {
  title: string;
  action?: ReactElement;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-[13px] font-semibold tracking-tight text-text-primary">
        {title}
      </h2>
      {action}
    </div>
  );
}

function PanelLoading({ label }: { label: string }) {
  const { t } = useTranslation("dashboard");
  return (
    <div
      className="rounded-xl border border-hairline bg-subtle-bg px-5 py-8 text-center"
      role="status"
      aria-live="polite"
    >
      <p className="text-[12px] font-medium text-text-secondary">{label}</p>
      <p className="mt-1 text-[11px] text-text-tertiary">
        {t("loading.waitingForBackend")}
      </p>
    </div>
  );
}

function PanelError({ message }: { message: string }) {
  const { t } = useTranslation("dashboard");
  return (
    <div
      className="rounded-xl border border-accent-critical/20 bg-accent-critical/8 px-4 py-3 text-center"
      role="alert"
    >
      <p className="text-[12px] font-medium text-accent-critical">{message}</p>
      <p className="mt-1 text-[11px] text-accent-critical/70">
        {t("errors.panelFallbackNote")}
      </p>
    </div>
  );
}

function LinkButton({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-subtle-bg px-2.5 py-1 text-[11px] text-text-secondary transition-colors duration-200 hover:bg-subtle-bg-hover hover:text-text-primary"
    >
      {label}
      <ArrowUpRight size={11} aria-hidden />
    </Link>
  );
}

function buildDriverAlertSummaries(
  drivers: Driver[],
  trips: BackendTrip[],
): DriverAlertSummary[] {
  return drivers
    .map((driver) => {
      const scores = getTripsForDriver(driver.id, trips)
        .filter((trip) => trip.status === "completed")
        .map(tripScore)
        .filter((score): score is number => score !== null);
      const averageScore =
        scores.length > 0
          ? Math.round(
              scores.reduce((sum, score) => sum + score, 0) / scores.length,
            )
          : null;
      return { driver, averageScore, scoredTrips: scores.length };
    })
    .sort((a, b) => {
      const alertDelta = b.driver.totalAlerts - a.driver.totalAlerts;
      if (alertDelta !== 0) return alertDelta;
      return b.driver.criticalAlerts - a.driver.criticalAlerts;
    });
}

function buildAlertDistribution(
  alerts: FleetAlertEvent[],
): AlertDistributionSummary {
  return alerts.reduce(
    (summary, alert) => {
      if (alert.severity === "critical" && alert.acknowledged)
        summary.criticalAcknowledged += 1;
      if (alert.severity === "critical" && !alert.acknowledged)
        summary.criticalOpen += 1;
      if (alert.severity === "warn" && alert.acknowledged)
        summary.warnAcknowledged += 1;
      if (alert.severity === "warn" && !alert.acknowledged)
        summary.warnOpen += 1;
      return summary;
    },
    {
      criticalOpen: 0,
      criticalAcknowledged: 0,
      warnOpen: 0,
      warnAcknowledged: 0,
    },
  );
}

function buildAlertDays(
  alerts: FleetAlertEvent[],
  now: number,
  formatDayLabel: (date: Date) => string,
): AlertDaySummary[] {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    return {
      key: dateKey(date),
      label: formatDayLabel(date),
      count: 0,
    };
  });
  const counts = new Map(days.map((day) => [day.key, day]));

  alerts.forEach((alert) => {
    const key = dateKey(new Date(alert.timestamp));
    const day = counts.get(key);
    if (day) day.count += 1;
  });

  return days;
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function tripScore(trip: BackendTrip): number | null {
  if (trip.safety_score && typeof trip.safety_score === "object")
    return trip.safety_score.score;
  const score = Number(trip.safety_score);
  return Number.isFinite(score) ? score : null;
}

function tripTime(trip: BackendTrip): number {
  const raw =
    trip.actual_start_at ??
    trip.start_time ??
    trip.planned_start_at ??
    trip.updated_at ??
    trip.created_at;
  const parsed = raw ? Date.parse(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

type DashboardT = ReturnType<typeof useTranslation<"dashboard">>["t"];

function tripTitle(trip: BackendTrip, t: DashboardT): string {
  return trip.code || t("activeTrips.fallback.tripWithoutCode");
}

function driverLabel(trip: BackendTrip, t: DashboardT): string {
  return (
    trip.driver_name ??
    trip.driver_email ??
    t("activeTrips.fallback.unassigned")
  );
}

function routeLabel(trip: BackendTrip, t: DashboardT): string {
  if (trip.origin && trip.destination)
    return t("activeTrips.route", {
      origin: trip.origin,
      destination: trip.destination,
    });
  return (
    trip.origin ?? trip.destination ?? t("activeTrips.routeUnavailable")
  );
}

function scoreBadge(trip: BackendTrip, t: DashboardT): ReactElement {
  const score = tripScore(trip);
  const grade =
    trip.safety_grade ??
    (trip.safety_score && typeof trip.safety_score === "object"
      ? trip.safety_score.grade
      : null);
  if (score === null)
    return (
      <span className="text-[11px] text-text-tertiary">
        {t("driverRanking.noScore")}
      </span>
    );
  const tone =
    score < 60
      ? "text-accent-critical"
      : score < 85
        ? "text-accent-warn"
        : "text-accent-active";
  return (
    <span className={`font-mono-num text-[12px] font-semibold ${tone}`}>
      {score}
      {grade ? ` ${grade}` : ""}
    </span>
  );
}

function formatTripDate(
  value: string | null | undefined,
  formatDateTime: (value: Date | string | number) => string,
): string {
  if (!value) return "-";
  return formatDateTime(value);
}

export default DashboardPage;