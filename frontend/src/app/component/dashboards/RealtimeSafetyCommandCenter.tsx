import { Activity, Camera, Eye, Gauge, ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  monitoringFrameUrl,
  monitoringStreamUrl,
  type BackendMonitoringSnapshot,
  type BackendMonitoringUnavailable,
  type BackendTrip,
} from "../../services/backendApi";
import { useMonitoringSnapshot } from "../../hook/useBackendData";
import { StatusBadge } from "../monitoring/StatusBadge";

type RiskLevel = "normal" | "warning" | "critical" | "offline";

interface RealtimeSafetyCommandCenterProps {
  activeTrips: BackendTrip[];
  onRealtimeRisk?: () => void;
}

export default function RealtimeSafetyCommandCenter({
  activeTrips,
  onRealtimeRisk,
}: RealtimeSafetyCommandCenterProps) {
  const { t } = useTranslation("dashboard");
  const { snapshot, error } = useMonitoringSnapshot();
  const [streamFailed, setStreamFailed] = useState(false);
  const notifiedRiskSeqRef = useRef<number | string | null>(null);
  const availableSnapshot = isAvailableSnapshot(snapshot) ? snapshot : null;
  const activeTrip = useMemo(
    () =>
      activeTrips.find((trip) => trip.trip_id === availableSnapshot?.trip_id) ??
      activeTrips[0] ??
      null,
    [activeTrips, availableSnapshot],
  );
  const risk = riskLevel(snapshot);
  const tone = riskTone(risk);
  const available = Boolean(availableSnapshot);
  const frameTimestamp = availableSnapshot?.frame_timestamp;
  const health = healthKey(snapshot);

  useEffect(() => {
    if (!onRealtimeRisk || !isRiskSnapshot(availableSnapshot)) return;
    const riskSeq =
      availableSnapshot.snapshot_seq ??
      availableSnapshot.received_at ??
      availableSnapshot.timestamp;
    if (riskSeq === notifiedRiskSeqRef.current) return;
    notifiedRiskSeqRef.current = riskSeq;
    onRealtimeRisk();
  }, [availableSnapshot, onRealtimeRisk]);

  return (
    <section className="rounded-xl border border-hairline bg-subtle-bg px-5 py-4">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-[13px] font-semibold tracking-tight text-text-primary">
            {t("commandCenter.title")}
          </h2>
          <p className="mt-1 max-w-2xl text-[12px] text-text-tertiary">
            {friendlyStatusText(snapshot, error, t)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={tone} label={t(`commandCenter.risk.${risk}`)} size="md" />
          <StatusBadge
            tone={available && !snapshot?.stale ? "active" : available ? "warn" : "neutral"}
            label={t(`commandCenter.health.${health}`)}
            size="md"
          />
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-accent-warn/25 bg-accent-warn/8 px-4 py-3 text-[12px] text-accent-warn">
          {t("commandCenter.error")}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="overflow-hidden rounded-xl border border-hairline bg-surface">
          {availableSnapshot?.frame_available ? (
            <img
              src={streamFailed ? monitoringFrameUrl(frameTimestamp) : monitoringStreamUrl()}
              alt={t("commandCenter.frameAlt")}
              onError={() => setStreamFailed(true)}
              className="aspect-video w-full object-cover"
            />
          ) : (
            <div className="flex aspect-video flex-col items-center justify-center gap-2 px-5 text-center">
              <Camera size={20} className="text-text-tertiary" />
              <p className="text-[12px] font-medium text-text-secondary">
                {t("commandCenter.noFrameTitle")}
              </p>
              <p className="max-w-sm text-[11px] text-text-tertiary">
                {t("commandCenter.noFrameDetail")}
              </p>
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <MetricTile
            icon={<Activity size={14} />}
            label={t("commandCenter.metrics.trip")}
            value={activeTrip?.code ?? activeTrip?.trip_id?.slice(0, 8) ?? t("commandCenter.empty.trip")}
            detail={activeTrip ? driverLabel(activeTrip, t) : t("commandCenter.empty.noActiveTrip")}
          />
          <MetricTile
            icon={<Gauge size={14} />}
            label={t("commandCenter.metrics.fps")}
            value={formatMetric(availableSnapshot?.fps, 1)}
            detail={signalLabel(snapshot, t)}
          />
          <MetricTile
            icon={<ShieldAlert size={14} />}
            label={t("commandCenter.metrics.score")}
            value={formatMetric(availableSnapshot?.dws_score, 0)}
            detail={alarmLabel(snapshot, t)}
          />
          <MetricTile
            icon={<Eye size={14} />}
            label={t("commandCenter.metrics.face")}
            value={faceLabel(snapshot, t)}
            detail={technicalDetail(snapshot, t)}
          />
        </div>
      </div>
    </section>
  );
}

function MetricTile({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-hairline bg-surface px-4 py-3">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
        {icon}
        {label}
      </div>
      <p className="truncate text-[15px] font-semibold text-text-primary">{value}</p>
      <p className="mt-1 truncate text-[11px] text-text-tertiary">{detail}</p>
    </div>
  );
}

type MonitoringSnapshotState =
  | BackendMonitoringSnapshot
  | BackendMonitoringUnavailable
  | null;

function isAvailableSnapshot(
  snapshot: MonitoringSnapshotState,
): snapshot is BackendMonitoringSnapshot {
  return Boolean(snapshot && snapshot.available !== false);
}

function healthKey(snapshot: MonitoringSnapshotState): "online" | "stale" | "offline" {
  if (!snapshot || snapshot.available === false) return "offline";
  if (snapshot.health === "online" || snapshot.health === "stale") return snapshot.health;
  return snapshot.stale ? "stale" : "online";
}

function riskLevel(snapshot: MonitoringSnapshotState): RiskLevel {
  if (!snapshot || snapshot.available === false || snapshot.health === "offline") return "offline";
  if (snapshot.alarm_on || snapshot.dws_score >= 80) return "critical";
  if (!snapshot.face_detected || snapshot.dws_score >= 60) return "warning";
  return "normal";
}

function isRiskSnapshot(snapshot: BackendMonitoringSnapshot | null): snapshot is BackendMonitoringSnapshot {
  if (!snapshot || snapshot.stale) return false;
  return (
    Boolean(snapshot.alarm_on) ||
    Boolean(snapshot.ear_alert) ||
    Boolean(snapshot.mar_alert) ||
    Boolean(snapshot.pose_alert) ||
    snapshot.face_detected === false ||
    snapshot.dws_score >= 50
  );
}

function riskTone(risk: RiskLevel): "active" | "warn" | "critical" | "neutral" {
  if (risk === "critical") return "critical";
  if (risk === "warning") return "warn";
  if (risk === "normal") return "active";
  return "neutral";
}

function friendlyStatusText(
  snapshot: MonitoringSnapshotState,
  error: string | null,
  t: ReturnType<typeof useTranslation<"dashboard">>["t"],
): string {
  if (error) return t("commandCenter.status.apiError");
  if (!snapshot || snapshot.available === false) return t("commandCenter.status.offline");
  if (snapshot.stale) return t("commandCenter.status.stale");
  if (!snapshot.face_detected) return t("commandCenter.status.noFace");
  if (snapshot.alarm_on || snapshot.dws_score >= 80) return t("commandCenter.status.critical");
  return t("commandCenter.status.online");
}

function formatMetric(value: number | null | undefined, digits: number): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return value.toFixed(digits);
}

function signalLabel(
  snapshot: MonitoringSnapshotState,
  t: ReturnType<typeof useTranslation<"dashboard">>["t"],
): string {
  if (!snapshot || snapshot.available === false) return t("commandCenter.empty.noSignal");
  return snapshot.stale
    ? t("commandCenter.metrics.waitingSignal")
    : t("commandCenter.metrics.receivingSignal");
}

function alarmLabel(
  snapshot: MonitoringSnapshotState,
  t: ReturnType<typeof useTranslation<"dashboard">>["t"],
): string {
  if (!snapshot || snapshot.available === false) return t("commandCenter.empty.noSignal");
  if (snapshot.alarm_on) return t("commandCenter.metrics.alarmOn");
  return t("commandCenter.metrics.alarmOff");
}

function faceLabel(
  snapshot: MonitoringSnapshotState,
  t: ReturnType<typeof useTranslation<"dashboard">>["t"],
): string {
  if (!snapshot || snapshot.available === false) return t("commandCenter.empty.noSignal");
  return snapshot.face_detected
    ? t("commandCenter.metrics.faceDetected")
    : t("commandCenter.metrics.faceMissing");
}

function technicalDetail(
  snapshot: MonitoringSnapshotState,
  t: ReturnType<typeof useTranslation<"dashboard">>["t"],
): string {
  if (!snapshot || snapshot.available === false) return t("commandCenter.empty.noMetrics");
  if (!snapshot.face_detected) return t("commandCenter.metrics.driverNotVisible");
  if (snapshot.ear_alert || snapshot.mar_alert || snapshot.pose_alert) {
    return t("commandCenter.metrics.driverNeedsCheck");
  }
  return t("commandCenter.metrics.driverViewStable");
}

function driverLabel(
  trip: BackendTrip,
  t: ReturnType<typeof useTranslation<"dashboard">>["t"],
): string {
  return (
    trip.driver_name ??
    trip.driver_email ??
    t("commandCenter.empty.unassignedDriver")
  );
}
