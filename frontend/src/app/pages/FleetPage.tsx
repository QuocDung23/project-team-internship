import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { AdminEmptyState, AdminErrorBanner, AdminHeader, AdminPage, AdminStatStrip } from "../component/admin/AdminShell";
import { StatusBadge } from "../component/monitoring/StatusBadge";
import { useBackendAlerts } from "../hook/useBackendAlerts";
import { useBackendTrips } from "../hook/useBackendData";
import { buildSafetySummaryFromTrips, fetchSafetyScore, type BackendTrip, type SafetyScore } from "../services/backendApi";
import type { MonitoringAlert } from "../types/monitoring";
import { useAppLocale } from "../i18n/useAppLocale";
import { SafetyScoreValue } from "../utils/safetyScore";
import { getErrorTranslation } from "../i18n/errors";

function FleetPage() {
  const { t } = useTranslation(["trips", "common"]);
  const backendTrips = useBackendTrips(false);
  const trips = useMemo(() => backendTrips.trips ?? [], [backendTrips.trips]);
  const safety = useMemo(() => buildSafetySummaryFromTrips(trips), [trips]);
  const [selectedTripId, setSelectedTripId] = useState<string>("");
  const selectedTrip = useMemo(
    () => trips.find((trip) => trip.trip_id === selectedTripId) ?? trips[0] ?? null,
    [selectedTripId, trips],
  );
  const alerts = useBackendAlerts(selectedTrip?.trip_id, { tripId: selectedTrip?.trip_id });
  const [loadedScore, setLoadedScore] = useState<{
    tripId: string;
    score: SafetyScore;
  } | null>(null);
  const score = loadedScore?.tripId === selectedTrip?.trip_id
    ? loadedScore?.score ?? null
    : selectedTrip && typeof selectedTrip.safety_score === "object"
      ? selectedTrip.safety_score
      : null;

  useEffect(() => {
    if (!selectedTrip || selectedTrip.status !== "completed") return;
    let active = true;
    void fetchSafetyScore(selectedTrip.trip_id)
      .then((nextScore) => {
        if (active) setLoadedScore({ tripId: selectedTrip.trip_id, score: nextScore });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [selectedTrip]);

  return (
    <AdminPage scroll>
      <AdminHeader
        eyebrow={t("trips:pages.fleet.eyebrow")}
        title={t("trips:pages.fleet.title")}
        description={t("trips:pages.fleet.description")}
        actions={<span className="rounded-lg bg-subtle-bg px-2.5 py-1 font-mono-num text-[11px] text-text-secondary">{t("trips:pages.fleet.tripCount", { count: trips.length })}</span>}
      />
      {backendTrips.error ? (
        <AdminErrorBanner
          label={t("trips:pages.fleet.errors.tripsUnavailable")}
          message={t(
            getErrorTranslation(backendTrips.error)
              .key as "common:errors.generic",
          )}
        />
      ) : null}
      {alerts.error ? (
        <AdminErrorBanner
          label={t("trips:pages.fleet.errors.alertsUnavailable")}
          message={t(
            getErrorTranslation(alerts.error).key as "common:errors.generic",
          )}
        />
      ) : null}

      <AdminStatStrip
        items={[
          {
            label: t("trips:pages.fleet.kpi.active"),
            value: trips.filter((trip) => trip.status === "in_progress").length,
            tone: "active",
            detail: t("trips:pages.fleet.kpi.activeDetail"),
          },
          {
            label: t("trips:pages.fleet.kpi.completed"),
            value: trips.filter((trip) => trip.status === "completed").length,
            detail: t("trips:pages.fleet.kpi.completedDetail"),
          },
          {
            label: t("trips:pages.fleet.kpi.alerts"),
            value: safety.totalAlerts,
            tone: safety.totalAlerts > 0 ? "warn" : "active",
            detail: t("trips:pages.fleet.kpi.alertsDetail", { count: safety.criticalAlerts }),
          },
          {
            label: t("trips:pages.fleet.kpi.avgScore"),
            value: safety.averageScore ?? "-",
            tone: safety.averageScore !== null && safety.averageScore < 60 ? "critical" : "active",
            detail: t("trips:pages.fleet.kpi.avgScoreDetail", { count: safety.scoredTrips }),
          },
        ]}
      />

      <section className="grid gap-4 xl:h-[calc(100vh-17rem)] xl:min-h-[520px] xl:grid-cols-[1.25fr_0.9fr]">
        <TripTable
          trips={trips}
          selectedTripId={selectedTrip?.trip_id ?? ""}
          onSelect={setSelectedTripId}
        />
        {selectedTrip ? (
          <TripDetails
            trip={selectedTrip}
            score={score}
            alerts={alerts.monitorAlerts ?? []}
          />
        ) : (
          <AdminEmptyState
            title={t("trips:pages.fleet.empty.noTripsTitle")}
            detail={t("trips:pages.fleet.empty.noTripsDetail")}
          />
        )}
      </section>
    </AdminPage>
  );
}

function TripTable({
  trips,
  selectedTripId,
  onSelect,
}: {
  trips: BackendTrip[];
  selectedTripId: string;
  onSelect: (tripId: string) => void;
}) {
  const { t } = useTranslation(["trips", "common"]);
  const { formatDateTime } = useAppLocale();
  const codeFallback = t("common:fallback.tripWithoutCode");
  const driverFallback = t("common:fallback.unassigned");
  const contextFallback = t("common:fallback.noDriverContext");

  return (
    <section className="panel flex min-h-[420px] min-w-0 flex-col overflow-hidden xl:min-h-0">
      <div className="grid shrink-0 grid-cols-[1.15fr_0.75fr_1.2fr_1fr_0.65fr_0.65fr] gap-3 border-b border-hairline px-4 py-2.5 text-[10px] uppercase tracking-wider text-text-tertiary">
        <span>{t("trips:pages.fleet.table.columns.trip")}</span>
        <span>{t("trips:pages.fleet.table.columns.status")}</span>
        <span>{t("trips:pages.fleet.table.columns.driver")}</span>
        <span>{t("trips:pages.fleet.table.columns.started")}</span>
        <span>{t("trips:pages.fleet.table.columns.score")}</span>
        <span>{t("trips:pages.fleet.table.columns.alerts")}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {trips.length > 0 ? (
          trips.map((trip) => (
            <button
              key={trip.trip_id}
              type="button"
              onClick={() => onSelect(trip.trip_id)}
              className={[
                "grid w-full grid-cols-[1.15fr_0.75fr_1.2fr_1fr_0.65fr_0.65fr] gap-3 border-b border-hairline px-4 py-3 text-left text-sm transition-all duration-200",
                trip.trip_id === selectedTripId
                  ? "bg-accent-active/10 text-text-primary ring-1 ring-inset ring-accent-active/20"
                  : "text-text-secondary hover:bg-subtle-bg-hover hover:text-text-primary",
              ].join(" ")}
            >
              <span className="truncate font-mono-num text-xs">{trip.code || codeFallback}</span>
              <span className="truncate text-xs">{formatTripStatus(trip.status, t)}</span>
              <span className="min-w-0">
                <span className="block truncate text-xs text-text-primary">{trip.driver_name ?? trip.driver_email ?? driverFallback}</span>
                <span className="block truncate font-mono-num text-[10px] text-text-tertiary">{trip.driver_email ?? contextFallback}</span>
              </span>
              <span className="truncate font-mono-num text-xs text-text-tertiary">{trip.actual_start_at ?? trip.start_time ? formatDateTime(trip.actual_start_at ?? trip.start_time as string) : "-"}</span>
              <span className="truncate text-xs text-text-secondary"><SafetyScoreValue trip={trip} /></span>
              <span className="font-mono-num text-xs text-text-secondary">{String(trip.total_alerts_count ?? "-")}</span>
            </button>
          ))
        ) : (
          <div className="px-4 py-10">
            <AdminEmptyState
              title={t("trips:pages.fleet.empty.noTripsTitle")}
              detail={t("trips:pages.fleet.empty.noTripsTable")}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function TripDetails({
  trip,
  score,
  alerts,
}: {
  trip: BackendTrip;
  score: SafetyScore | null;
  alerts: MonitoringAlert[];
}) {
  const { t } = useTranslation(["trips", "common"]);
  const { formatDateTime } = useAppLocale();
  const codeFallback = t("common:fallback.tripWithoutCode");
  const driverFallback = t("common:fallback.unassigned");
  const contextFallback = t("common:fallback.noDriverContext");

  return (
    <section className="panel flex min-h-[420px] min-w-0 flex-col overflow-hidden xl:min-h-0">
      <div className="shrink-0 border-b border-hairline px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-text-primary">{trip.code || codeFallback}</h2>
            <p className="mt-1 truncate text-[11px] text-text-tertiary">{routeLabel(trip, t("common:fallback.routeNotProvided"))}</p>
          </div>
          <StatusBadge
            tone={trip.status === "in_progress" ? "active" : trip.status === "completed" ? "neutral" : "warn"}
            label={formatTripStatus(trip.status, t)}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <div className="grid gap-2">
          <TripMetric label={t("trips:pages.fleet.details.labels.driver")} value={trip.driver_name ?? trip.driver_email ?? driverFallback} detail={trip.driver_email ?? contextFallback} />
          <div className="grid grid-cols-2 gap-2">
            <TripMetric label={t("trips:pages.fleet.details.labels.tripCode")} value={trip.code || codeFallback} />
            <TripMetric label={t("trips:pages.fleet.details.labels.route")} value={routeLabel(trip, t("common:fallback.routeNotProvided"))} />
            <TripMetric label={t("trips:pages.fleet.details.labels.score")} value={<SafetyScoreValue trip={trip} score={score} />} />
            <TripMetric
              label={t("trips:pages.fleet.details.labels.alerts")}
              value={t("trips:pages.fleet.details.labels.alertsTotal", { count: trip.total_alerts_count ?? score?.alert_count ?? 0 })}
              detail={t("trips:pages.fleet.details.labels.alertsCritical", { count: trip.critical_alerts_count ?? score?.critical_events ?? 0 })}
            />
            <TripMetric label={t("trips:pages.fleet.details.labels.started")} value={trip.actual_start_at ?? trip.start_time ? formatDateTime(trip.actual_start_at ?? trip.start_time as string) : "-"} />
            <TripMetric label={t("trips:pages.fleet.details.labels.ended")} value={trip.actual_end_at ?? trip.end_time ? formatDateTime(trip.actual_end_at ?? trip.end_time as string) : "-"} />
          </div>
        </div>

        <div className="mt-4 grid gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-semibold text-text-primary">{t("trips:pages.fleet.details.labels.allAlerts")}</h3>
            <span className="rounded-md bg-subtle-bg px-2 py-0.5 font-mono-num text-[10px] text-text-tertiary">{alerts.length}</span>
          </div>
          {alerts.map((alert) => (
            <div key={alert.id} className="group overflow-hidden rounded-xl border border-hairline bg-subtle-bg px-4 py-3 transition-colors duration-200 hover:border-hairline">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-medium text-text-primary">{t(alert.titleKey)}</p>
                <StatusBadge
                  tone={alert.severity === "critical" ? "critical" : "warn"}
                  label={t(`trips:monitoring.severity.${alert.severity}`)}
                  withDot={false}
                />
              </div>
              <p className="mt-1.5 truncate font-mono-num text-[10px] text-text-tertiary">
                {formatDateTime(new Date(alert.ts))} · {alertDetailLabel(alert, t as (key: string) => string)}
              </p>
            </div>
          ))}
          {alerts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-hairline bg-subtle-bg py-8 text-center">
              <p className="text-[12px] text-text-tertiary">{t("trips:pages.fleet.details.labels.noAlerts")}</p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function alertDetailLabel(
  alert: MonitoringAlert,
  translate: (key: string) => string,
): string {
  return alert.detailKey ? translate(alert.detailKey) : alert.detail;
}

function TripMetric({ label, value, detail }: { label: string; value: ReactNode; detail?: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-hairline bg-subtle-bg px-3 py-2.5 transition-colors duration-200 hover:border-hairline">
      <p className="text-[10px] uppercase tracking-wider text-text-tertiary">{label}</p>
      <p className="mt-1 truncate text-sm text-text-primary">{value}</p>
      {detail ? <p className="mt-0.5 truncate font-mono-num text-[10px] text-text-tertiary">{detail}</p> : null}
    </div>
  );
}

function routeLabel(trip: BackendTrip, fallback: string): string {
  if (trip.origin && trip.destination) return `${trip.origin} → ${trip.destination}`;
  return trip.origin || trip.destination || fallback;
}

function formatTripStatus(
  status: string,
  t: (
    key:
      | "common:tripStatus.in_progress"
      | "common:tripStatus.completed"
      | "common:tripStatus.cancelled"
      | "common:tripStatus.aborted"
      | "common:tripStatus.scheduled",
  ) => string,
): string {
  switch (status) {
    case "in_progress":
      return t("common:tripStatus.in_progress");
    case "completed":
      return t("common:tripStatus.completed");
    case "cancelled":
      return t("common:tripStatus.cancelled");
    case "aborted":
      return t("common:tripStatus.aborted");
    case "scheduled":
      return t("common:tripStatus.scheduled");
    default:
      return status;
  }
}

export default FleetPage;
