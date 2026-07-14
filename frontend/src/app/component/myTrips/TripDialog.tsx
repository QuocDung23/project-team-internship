import { type RefObject } from "react";
import { motion } from "motion/react";
import {
  Play,
  Stop,
  Warning,
  X,
} from "@phosphor-icons/react";
import type { BackendTrip, StartMyTripPayload } from "../../services/backendApi";
import type { useBrowserCNN } from "../../hook/useBrowserCNN";
import {
  tripFormWarnings,
  tripTitle,
  routeLabel,
  dateLabel,
} from "../../utils/trips/tripFormatters";
import {
  TRIP_CODE_MAX_LENGTH,
  ROUTE_POINT_MAX_LENGTH,
} from "../../utils/trips/tripFormConstants";
import { SPRING } from "../../utils/trips/tripMotion";
import { TripMetric } from "./TripMetric";
import { TextField } from "./TextField";
import { LiveMetric } from "./LiveMetric";
import { AlertInfoRow, type AlertInfo } from "./AlertInfoRow";

type CnnMetrics = ReturnType<typeof useBrowserCNN>["metrics"];

interface TripDialogProps {
  activeTrip: BackendTrip | null;
  canClose: boolean;
  cnnEventCount: number;
  cnnMetrics: CnnMetrics;
  cnnRunning: boolean;
  cnnVideoRef: RefObject<HTMLVideoElement | null>;
  error: string;
  form: StartMyTripPayload;
  isBusy: boolean;
  liveAlerts: AlertInfo[];
  driverName: string;
  onClose: () => void;
  onEndTrip: () => void;
  onStartTrip: () => void;
  onUpdateForm: (field: keyof StartMyTripPayload, value: string) => void;
  escalationActive: boolean;
}

export default function TripDialog({
  activeTrip,
  canClose,
  cnnEventCount,
  cnnMetrics,
  cnnRunning,
  cnnVideoRef,
  error,
  form,
  isBusy,
  liveAlerts,
  driverName,
  onClose,
  onEndTrip,
  onStartTrip,
  onUpdateForm,
  escalationActive,
}: TripDialogProps) {
  const warnings = tripFormWarnings(form);

  return (
    <div
      className="theme-overlay fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && canClose) onClose();
      }}
      role="presentation"
    >
      <motion.section
        initial={{ opacity: 0, y: 16, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ ...SPRING, delay: 0.04 }}
        className="bezel-shell flex max-h-[92vh] w-full max-w-5xl flex-col"
      >
        <div className="bezel-core relative flex flex-col gap-5 overflow-y-auto p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div
                className={`eyebrow-chip mb-2 ${
                  activeTrip ? "border-accent-warn/30 bg-accent-warn/10" : ""
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    activeTrip
                      ? "bg-accent-warn shadow-[0_0_8px_rgba(245,158,11,0.7)]"
                      : "bg-accent-active"
                  }`}
                />
                <span>{activeTrip ? "Live session" : "New session"}</span>
              </div>
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-text-primary">
                {activeTrip ? "Active Trip" : "New Trip"}
              </h2>
              <p className="mt-1 text-xs text-text-tertiary">
                {activeTrip
                  ? "Live detection stays open until the trip ends"
                  : "Add optional trip details before monitoring starts"}
              </p>
            </div>
            {canClose ? (
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                disabled={isBusy}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-hairline bg-subtle-bg text-text-secondary transition-colors duration-200 hover:bg-subtle-bg-hover hover:text-text-primary disabled:opacity-50"
              >
                <X size={14} weight="bold" />
              </button>
            ) : null}
          </div>

          {error ? (
            <div className="rounded-xl border border-accent-warn/30 bg-accent-warn/6 px-4 py-2.5 text-xs text-accent-warn">
              {error}
            </div>
          ) : null}

          {!activeTrip ? (
            <div className="grid gap-4">
              <div className="grid gap-3 md:grid-cols-2">
                <TextField
                  label="Trip code"
                  value={form.code ?? ""}
                  placeholder="Auto-generated trip code"
                  maxLength={TRIP_CODE_MAX_LENGTH}
                  readOnly
                  onChange={(value) => onUpdateForm("code", value)}
                />
                <TextField
                  label="Origin"
                  value={form.origin ?? ""}
                  placeholder="Optional origin"
                  maxLength={ROUTE_POINT_MAX_LENGTH}
                  onChange={(value) => onUpdateForm("origin", value)}
                />
                <TextField
                  label="Destination"
                  value={form.destination ?? ""}
                  placeholder="Optional destination"
                  maxLength={ROUTE_POINT_MAX_LENGTH}
                  onChange={(value) => onUpdateForm("destination", value)}
                />
              </div>
              {warnings.length > 0 ? (
                <div className="grid gap-1 rounded-xl border border-accent-warn/30 bg-accent-warn/6 px-4 py-2.5 text-xs text-accent-warn">
                  {warnings.map((warning) => (
                    <p key={warning.message}>{warning.message}</p>
                  ))}
                </div>
              ) : null}
              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  className="cta-ghost"
                  disabled={isBusy}
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="cta-primary"
                  disabled={isBusy}
                  onClick={onStartTrip}
                >
                  <Play size={12} weight="fill" />
                  <span>Start Trip</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[1.4fr_0.85fr]">
              <div className="grid gap-4">
                <div className="grid gap-2.5 text-sm md:grid-cols-3 xl:grid-cols-5">
                  <TripMetric label="Trip code" value={tripTitle(activeTrip)} />
                  <TripMetric label="Route" value={routeLabel(activeTrip)} />
                  <TripMetric
                    label="Start time"
                    value={dateLabel(
                      activeTrip.actual_start_at ?? activeTrip.start_time,
                    )}
                  />
                  <TripMetric label="Driver" value={driverName} />
                  <TripMetric
                    label="Detection"
                    value={cnnRunning ? "Running" : "Starting"}
                  />
                </div>

                <div
                  className={`theme-video-surface relative aspect-4/3 w-full overflow-hidden rounded-2xl border border-hairline ${
                    cnnRunning ? "" : "hidden"
                  }`}
                >
                  <video
                    ref={cnnVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="h-full w-full scale-x-[-1] object-contain"
                  />
                  {cnnMetrics?.drowsinessWarningActive ? (
                    <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center">
                      <span className="animate-pulse rounded-full bg-accent-critical/90 px-4 py-2 text-sm font-bold uppercase tracking-[0.14em] text-white shadow-[0_8px_30px_rgba(159,18,57,0.55)]">
                        Drowsy
                      </span>
                    </div>
                  ) : null}
                  {cnnMetrics?.yawnWarningActive ? (
                    <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
                      <span className="rounded-full bg-accent-warn/90 px-4 py-2 text-sm font-bold uppercase tracking-[0.14em] text-text-primary shadow-[0_8px_30px_rgba(217,119,6,0.45)]">
                        Yawn
                      </span>
                    </div>
                  ) : null}
                  {escalationActive ? (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-accent-critical/40 backdrop-blur-[2px]">
                      <span className="animate-pulse text-center text-3xl font-black uppercase tracking-[0.08em] text-white drop-shadow-[0_4px_22px_rgba(127,29,29,0.95)] sm:text-5xl">
                        Stay alert
                      </span>
                    </div>
                  ) : null}
                </div>

                {!cnnRunning ? (
                  <div className="rounded-2xl border border-hairline bg-subtle-bg px-4 py-10 text-center text-xs text-text-tertiary">
                    Waiting for live detection.
                  </div>
                ) : null}

                {cnnMetrics ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    <LiveMetric
                      label="EAR"
                      value={cnnMetrics.ear.toFixed(3)}
                      alert={cnnMetrics.earAlert}
                    />
                    <LiveMetric
                      label="MAR"
                      value={cnnMetrics.mar.toFixed(3)}
                      alert={cnnMetrics.marAlert}
                    />
                    <LiveMetric
                      label="Pitch"
                      value={cnnMetrics.pitch.toFixed(1)}
                      alert={cnnMetrics.poseAlert}
                    />
                    <LiveMetric
                      label="DWS"
                      value={`${cnnMetrics.dwsScore}%`}
                      alert={cnnMetrics.dwsScore >= 70}
                    />
                    <LiveMetric
                      label="FPS"
                      value={cnnMetrics.fps ? String(cnnMetrics.fps) : "--"}
                      alert={false}
                    />
                  </div>
                ) : null}
              </div>

              <div className="grid content-start gap-4">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold tracking-[-0.01em] text-text-primary">
                      Live Alerts
                    </h3>
                    <span className="rounded-full border border-accent-active/30 bg-accent-active/10 px-2 py-0.5 font-mono-num text-[10px] font-semibold uppercase tracking-[0.14em] text-accent-active tabular-nums">
                      {cnnEventCount} events
                    </span>
                  </div>
                </div>
                <div className="grid gap-2">
                  {liveAlerts.length > 0 ? (
                    liveAlerts.map((alert) => (
                      <AlertInfoRow key={alert.id} alert={alert} />
                    ))
                  ) : (
                    <div className="rounded-2xl border border-hairline bg-subtle-bg px-4 py-6 text-center text-xs text-text-tertiary">
                      No live alerts yet.
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="cta-danger mt-1"
                  disabled={isBusy}
                  onClick={onEndTrip}
                >
                  <Stop size={12} weight="fill" />
                  <span>End Trip</span>
                </button>

                {escalationActive ? (
                  <div className="flex items-center gap-2 rounded-2xl border border-accent-critical/30 bg-accent-critical/6 px-3.5 py-2.5 text-[11px] text-accent-critical">
                    <Warning size={14} weight="fill" className="text-accent-critical" />
                    <span>Escalation protocol engaged</span>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </motion.section>
    </div>
  );
}
