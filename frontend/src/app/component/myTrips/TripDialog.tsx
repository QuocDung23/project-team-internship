import { motion, AnimatePresence, Easing } from "motion/react";
import { SPRING, MOTION_EASE } from "../../utils/trips/tripMotion";
import TripForm from "./TripForm";
import TripLiveView from "./TripLiveView";
import type { BackendTrip } from "../../services/backendApi";
import type { StartMyTripPayload } from "../../services/backendApi";

export interface LiveAlert {
  id: string;
  title: string;
  severity: "warn" | "critical";
  ts: number;
  detail: string;
}

interface DriverSnapshot {
  ear: number;
  mar: number;
  pitch: number;
  dwsScore: number;
  fps: number | null;
  earAlert: boolean;
  marAlert: boolean;
  poseAlert: boolean;
}

interface TripDialogProps {
  open: boolean;
  activeTrip: BackendTrip | null;
  canClose: boolean;
  isBusy: boolean;
  error: string;
  form: StartMyTripPayload;
  cnnVideoRef: React.RefObject<HTMLVideoElement | null>;
  cnnRunning: boolean;
  cnnMetrics: DriverSnapshot | null;
  cnnEventCount: number;
  liveAlerts: LiveAlert[];
  onClose: () => void;
  onEndTrip: () => void;
  onStartTrip: () => void;
  onUpdateForm: (field: keyof StartMyTripPayload, value: string) => void;
}

export default function TripDialog({
  open,
  activeTrip,
  canClose,
  isBusy,
  error,
  form,
  cnnVideoRef,
  cnnRunning,
  cnnMetrics,
  cnnEventCount,
  liveAlerts,
  onClose,
  onEndTrip,
  onStartTrip,
  onUpdateForm,
}: TripDialogProps) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: MOTION_EASE.smooth as Easing }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            backgroundColor: "rgba(0,0,0,0.80)",
            backdropFilter: "blur(8px)",
          }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && canClose) onClose();
          }}
          role="presentation"
        >
          <motion.section
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ ...SPRING, ease: MOTION_EASE.smooth as Easing }}
            className="relative flex max-h-[92vh] w-full max-w-4xl flex-col gap-4 overflow-y-auto rounded-[28px] border border-white/[0.08] bg-gradient-to-br from-zinc-950/95 via-zinc-950/90 to-zinc-900/70 p-6 shadow-2xl md:p-7"
            style={{
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.05), 0 40px 80px -20px rgba(0,0,0,0.7)",
            }}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-zinc-100">
                  {activeTrip ? "Chuyến đang hoạt động" : "Chuyến mới"}
                </h2>
                <p className="mt-1 text-xs text-zinc-500">
                  {activeTrip
                    ? "Theo dõi thời gian thực cho đến khi kết thúc"
                    : "Thêm thông tin chuyến đi trước khi bắt đầu"}
                </p>
              </div>
              {canClose ? (
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isBusy}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-zinc-400 transition-all duration-200 hover:border-white/[0.15] hover:bg-white/[0.06] hover:text-zinc-200 disabled:opacity-40"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              ) : null}
            </div>

            {/* Error */}
            {error ? (
              <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/05 px-4 py-2.5">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0 text-amber-400"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p className="text-xs text-amber-200">{error}</p>
              </div>
            ) : null}

            {/* Body: New trip form OR live view */}
            {!activeTrip ? (
              <TripForm
                form={form}
                isBusy={isBusy}
                onUpdateForm={onUpdateForm}
                onCancel={onClose}
                onStartTrip={onStartTrip}
              />
            ) : (
              <TripLiveView
                activeTrip={activeTrip}
                cnnVideoRef={cnnVideoRef}
                cnnRunning={cnnRunning}
                cnnMetrics={cnnMetrics}
                cnnEventCount={cnnEventCount}
                liveAlerts={liveAlerts}
                isBusy={isBusy}
                onEndTrip={onEndTrip}
              />
            )}
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
