"use client";
import { motion } from "motion/react";
import { AlertTriangle, Bell, Camera, CheckCircle, MapPin, Truck } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { FleetAlertEvent } from "../../types/alerts";
import { StatusBadge } from "../monitoring/StatusBadge";
import {
  ALERT_TYPE_ICONS,
  SEVERITY_KEYS,
} from "../../constants/alerts";
import { useAppLocale } from "../../i18n/useAppLocale";

interface AlertRowProps {
  event: FleetAlertEvent;
  isAcknowledging?: boolean;
  onAcknowledge?: (event: FleetAlertEvent) => void;
}

type DynamicTranslator = (
  key: string,
  values?: Record<string, string | number>,
) => string;

export default function AlertRow({
  event,
  isAcknowledging = false,
  onAcknowledge,
}: AlertRowProps) {
  const { t, i18n } = useTranslation("alerts");
  const translate: DynamicTranslator = t as unknown as DynamicTranslator;
  const { formatTime: localizedTime } = useAppLocale();
  const isCritical = event.severity === "critical";
  const config = {
    critical: {
      gradient: "from-accent-critical/12 to-accent-critical/4",
      border: "border-accent-critical/25",
      ring: "ring-accent-critical/10",
      iconBg: "from-accent-critical/30 to-accent-critical/15",
      iconColor: "text-accent-critical",
    },
    warn: {
      gradient: "from-accent-warn/10 to-accent-warn/4",
      border: "border-accent-warn/20",
      ring: "ring-accent-warn/10",
      iconBg: "from-accent-warn/20 to-accent-warn/10",
      iconColor: "text-accent-warn",
    },
  };
  const style = config[event.severity];

  const sourceKey = `source.${event.location}`;
  const sourceLabel = i18n.exists(sourceKey)
    ? translate(sourceKey)
    : translate("source.unknown");

  const typeKey = `type.${event.type}`;
  const typeLabel = i18n.exists(typeKey)
    ? translate(typeKey)
    : translate("type.unknown");
  const confidencePercent =
    typeof event.cnnConfidence === "number"
      ? Math.round(event.cnnConfidence * 100)
      : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
      className={`group relative overflow-hidden rounded-2xl border bg-linear-to-br ${style.gradient} p-px ${style.border} ${style.ring}`}
      aria-label={t("aria.alertRow")}
    >
      <div className="relative rounded-[1.25rem] bg-surface p-4">
        <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-linear-to-br from-white/3 to-transparent" />

        <div className="relative flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br ${style.iconBg} ${style.border}`}
              >
                <span className={style.iconColor}>
                  {ALERT_TYPE_ICONS[event.type] ?? <AlertTriangle size={15} />}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {event.driverName}
                </p>
                <p className="font-mono-num text-xs text-text-tertiary">
                  {event.licensePlate}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1.5">
              <StatusBadge
                tone={isCritical ? "critical" : "warn"}
                label={translate(SEVERITY_KEYS[event.severity].join("."))}
              />
              <span className="font-mono-num text-xs text-text-tertiary">
                {localizedTime(event.timestamp)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-secondary">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-subtle-bg px-2.5 py-1 ">
              <Truck size={11} />
              {event.driverName}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={11} className="text-text-tertiary" />
              {sourceLabel}
            </span>
            {event.ear > 0 && (
              <span className="font-mono-num rounded-full bg-subtle-bg px-2.5 py-1  ">
                {t("row.metric.ear")}
                :{" "}
                <span
                  className={
                    event.ear < 0.17 ? "text-accent-critical" : "text-text-secondary"
                  }
                >
                  {event.ear.toFixed(3)}
                </span>
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-full bg-subtle-bg px-2.5 py-1  ">
              {typeLabel}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-hairline bg-subtle-bg px-3 py-2 text-[11px] text-text-secondary">
            <span className="inline-flex items-center gap-1.5 font-medium text-text-primary">
              <Camera size={12} className="text-text-tertiary" />
              {event.capturedFramePath
                ? t("row.evidence")
                : t("row.noEvidence")}
            </span>
            {confidencePercent !== null ? (
              <span className="font-mono-num text-text-tertiary">
                {t("row.metric.cnn", { value: confidencePercent })}
              </span>
            ) : null}
            {event.cnnLabel ? (
              <span className="text-text-tertiary">
                {t("row.cnnLabel", { label: event.cnnLabel })}
              </span>
            ) : null}
            {event.alarmTriggered ? (
              <span className="inline-flex items-center gap-1 text-accent-warn">
                <Bell size={12} />
                {t("row.alarmTriggered")}
              </span>
            ) : null}
          </div>

          {event.acknowledged ? (
            <div className="flex items-center gap-1.5 text-xs text-accent-active">
              <CheckCircle size={13} fill="currentColor" />
              {t("row.acknowledged")}
            </div>
          ) : onAcknowledge ? (
            <motion.button
              type="button"
              onClick={() => onAcknowledge(event)}
              disabled={isAcknowledging}
              aria-label={t("aria.acknowledge")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="group/btn relative overflow-hidden rounded-xl border border-accent-active/25 bg-linear-to-r from-accent-active/10 to-accent-active/5 min-w-[140px] px-4 py-2 text-xs font-medium text-accent-active transition-all hover:border-accent-active/40 hover:from-accent-active/20 hover:to-accent-active/10 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ width: "fit-content", maxWidth: 200 }}
            >
              <span className="relative flex items-center justify-center gap-2 w-full">
                <CheckCircle
                  size={13}
                  className="transition-transform group-hover/btn:scale-110"
                />
                {isAcknowledging
                  ? t("actions.acknowledging")
                  : t("actions.acknowledge")}
              </span>
            </motion.button>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}
