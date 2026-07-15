import { X } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import type { BackendTrip } from "../../services/backendApi";
import type { MonitoringAlert } from "../../types/monitoring";
import { useAppLocale } from "../../i18n/useAppLocale";
import { SafetyScoreValue } from "../../utils/safetyScore";
import { alertCountLabel, criticalAlertCountLabel } from "../../utils/trips/tripFormatters";
import { SPRING } from "../../utils/trips/tripMotion";
import { TripMetric } from "./TripMetric";
import { AlertInfoRow } from "./AlertInfoRow";

interface RelativeTimeLabels {
  justNow: string;
  secondsAgo: string;
  minutesAgo: string;
  hoursAgo: string;
}

interface TripHistoryDialogProps {
  alerts: MonitoringAlert[];
  alertsError: string | null;
  driverName: string;
  isLoadingAlerts: boolean;
  onClose: () => void;
  trip: BackendTrip;
  relativeTimeLabels?: RelativeTimeLabels;
}

export default function TripHistoryDialog({
  alerts,
  alertsError,
  driverName,
  isLoadingAlerts,
  onClose,
  trip,
  relativeTimeLabels: _relativeTimeLabels,
}: TripHistoryDialogProps) {
  const { t } = useTranslation(["trips", "common", "navigation"]);
  const { formatDateTime } = useAppLocale();
  const codeFallback = t("common:fallback.tripWithoutCode");
  const routeFallback = t("trips:tripHistoryDialog.routeNotProvided");
  const closeLabel = t("navigation:aria.signOut", { defaultValue: t("trips:form.close") });

  const statusLabel = (() => {
    switch (trip.status) {
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
        return t("common:status.unknown");
    }
  })();

  return (
    <div
      className="theme-overlay fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <motion.section
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ ...SPRING, delay: 0.05 }}
        className="bezel-shell flex max-h-[92vh] w-full max-w-5xl flex-col"
      >
        <div className="bezel-core relative flex flex-col overflow-hidden">
          <div className="flex items-start justify-between gap-4 border-b border-hairline px-6 py-4">
            <div className="min-w-0">
              <div className="eyebrow-chip mb-2">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-active" />
                <span>{t("trips:tripHistoryDialog.eyebrow")}</span>
              </div>
              <h2 className="truncate text-lg font-semibold tracking-[-0.015em] text-text-primary">
                {trip.code || codeFallback}
              </h2>
              <p className="mt-1 truncate text-xs text-text-tertiary">
                {trip.origin && trip.destination
                  ? `${trip.origin} → ${trip.destination}`
                  : trip.origin || trip.destination || routeFallback}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={closeLabel}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-hairline bg-subtle-bg text-text-secondary transition-colors duration-200 hover:bg-subtle-bg-hover hover:text-text-primary"
            >
              <X size={14} weight="bold" />
            </button>
          </div>

          <div className="min-h-0 overflow-y-auto px-6 py-5">
            <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
              <TripMetric label={t("trips:tripHistoryDialog.labels.tripCode")} value={trip.code || codeFallback} />
              <TripMetric label={t("trips:tripHistoryDialog.labels.status")} value={statusLabel} />
              <TripMetric label={t("trips:tripHistoryDialog.labels.driver")} value={driverName} />
              <TripMetric label={t("trips:tripHistoryDialog.labels.route")} value={trip.origin && trip.destination ? `${trip.origin} → ${trip.destination}` : trip.origin || trip.destination || routeFallback} />
              <TripMetric
                label={t("trips:tripHistoryDialog.labels.startTime")}
                value={trip.actual_start_at ?? trip.start_time ? formatDateTime(trip.actual_start_at ?? trip.start_time as string) : "-"}
              />
              <TripMetric
                label={t("trips:tripHistoryDialog.labels.endTime")}
                value={trip.actual_end_at ?? trip.end_time ? formatDateTime(trip.actual_end_at ?? trip.end_time as string) : "-"}
              />
              <TripMetric
                label={t("trips:tripHistoryDialog.labels.safetyScore")}
                value={<SafetyScoreValue trip={trip} />}
              />
              <TripMetric label={t("trips:tripHistoryDialog.labels.alerts")} value={alertCountLabel(trip)} />
              <TripMetric
                label={t("trips:tripHistoryDialog.labels.critical")}
                value={criticalAlertCountLabel(trip)}
              />
              <TripMetric
                label={t("trips:tripHistoryDialog.labels.origin")}
                value={trip.origin || routeFallback}
              />
              <TripMetric
                label={t("trips:tripHistoryDialog.labels.destination")}
                value={trip.destination || routeFallback}
              />
            </div>

            <div className="mt-6">
              <div className="flex items-end justify-between gap-3 pb-3">
                <div>
                  <h3 className="text-sm font-semibold tracking-[-0.01em] text-text-primary">
                    {t("trips:tripHistoryDialog.alertsSection.title")}
                  </h3>
                  <p className="mt-0.5 text-[11px] text-text-tertiary">
                    {t("trips:tripHistoryDialog.alertsSection.subtitle")}
                  </p>
                </div>
                <span className="rounded-full border border-hairline bg-subtle-bg px-2.5 py-0.5 font-mono-num text-[11px] font-medium text-text-secondary tabular-nums">
                  {alerts.length}
                </span>
              </div>
              {alertsError ? (
                <div className="mt-3 rounded-xl border border-accent-warn/30 bg-accent-warn/6 px-3.5 py-2.5 text-xs text-accent-warn">
                  {alertsError}
                </div>
              ) : null}
              {!alertsError && isLoadingAlerts ? (
                <div className="mt-3 rounded-xl border border-hairline bg-subtle-bg px-3 py-6 text-center text-xs text-text-tertiary">
                  {t("trips:tripHistoryDialog.loadingAlerts")}
                </div>
              ) : null}
              {!alertsError && !isLoadingAlerts && alerts.length === 0 ? (
                <div className="mt-3 rounded-xl border border-hairline bg-subtle-bg px-3 py-6 text-center text-xs text-text-tertiary">
                  {t("trips:tripHistoryDialog.noAlerts")}
                </div>
              ) : null}
              <div className="mt-3 grid gap-2">
                {alerts.map((alert) => (
                  <AlertInfoRow key={alert.id} alert={alert} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
