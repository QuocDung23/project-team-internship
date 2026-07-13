import { motion } from "motion/react";
import type { RefObject } from "react";
import LiveMetricTile from "./LiveMetricTile";
import LiveAlertsList, { type LiveAlert } from "./LiveAlertsList";
import { SPRING } from "../../utils/trips/tripMotion";
import { routeLabel } from "../../utils/trips/tripFormatters";
import type { BackendTrip } from "../../services/backendApi";

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

interface TripLiveViewProps {
  activeTrip: BackendTrip;
  cnnVideoRef: RefObject<HTMLVideoElement | null>;
  cnnRunning: boolean;
  cnnMetrics: DriverSnapshot | null;
  cnnEventCount: number;
  liveAlerts: LiveAlert[];
  isBusy: boolean;
  onEndTrip: () => void;
}

export default function TripLiveView({
  activeTrip,
  cnnVideoRef,
  cnnRunning,
  cnnMetrics,
  cnnEventCount,
  liveAlerts,
  isBusy,
  onEndTrip,
}: TripLiveViewProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      {/* Left: Trip info + camera + metrics */}
      <div className="grid gap-3">
        {/* Trip quick info */}
        <div className="grid gap-2 text-sm md:grid-cols-3">
          <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-3.5 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Chuyến</p>
            <p className="mt-0.5 truncate font-mono-num text-sm font-semibold text-zinc-100">
              {activeTrip.code || activeTrip.trip_id}
            </p>
          </div>
          <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-3.5 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Trạng thái</p>
            <p className="mt-0.5 font-mono-num text-sm font-semibold text-emerald-300">
              {activeTrip.status}
            </p>
          </div>
          <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-3.5 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Tuyến</p>
            <p className="mt-0.5 truncate text-sm font-medium text-zinc-300">{routeLabel(activeTrip)}</p>
          </div>
        </div>

        {/* Camera feed */}
        {cnnRunning ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={SPRING}
            className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-black"
          >
            {/* Recording indicator */}
            <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/20 px-2.5 py-1 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 animate-ping rounded-full bg-rose-400/70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-400" />
              </span>
              <span className="font-mono-num text-[9px] font-semibold uppercase tracking-wider text-rose-300">REC</span>
            </div>
            <video
              ref={cnnVideoRef}
              autoPlay
              muted
              playsInline
              className="h-full w-full object-contain"
            />
          </motion.div>
        ) : (
          <div className="flex aspect-[4/3] w-full items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02]">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03]">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600">
                  <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                </svg>
              </div>
              <p className="text-xs text-zinc-500">Đang khởi động camera...</p>
            </div>
          </div>
        )}

        {/* Live metrics */}
        {cnnMetrics && (
          <div className="grid grid-cols-5 gap-2">
            <LiveMetricTile label="EAR" value={cnnMetrics.ear.toFixed(3)} alert={cnnMetrics.earAlert} delay={0} />
            <LiveMetricTile label="MAR" value={cnnMetrics.mar.toFixed(3)} alert={cnnMetrics.marAlert} delay={0.04} />
            <LiveMetricTile label="Pitch" value={cnnMetrics.pitch.toFixed(1)} alert={cnnMetrics.poseAlert} delay={0.08} />
            <LiveMetricTile label="DWS" value={`${cnnMetrics.dwsScore}%`} alert={cnnMetrics.dwsScore >= 70} delay={0.12} />
            <LiveMetricTile label="FPS" value={cnnMetrics.fps ? String(cnnMetrics.fps) : "--"} alert={false} delay={0.16} />
          </div>
        )}
      </div>

      {/* Right: Live alerts + End trip */}
      <div className="grid gap-4">
        <LiveAlertsList alerts={liveAlerts} eventCount={cnnEventCount} />

        <motion.button
          type="button"
          onClick={onEndTrip}
          disabled={isBusy}
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.97 }}
          transition={SPRING}
          className="group relative inline-flex w-full items-center justify-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-5 py-3 text-[12px] font-semibold text-rose-200 transition-all duration-500 hover:border-rose-500/50 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 24px -8px rgba(244,63,94,0.30)",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-rose-300">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          </svg>
          Kết thúc chuyến
        </motion.button>
      </div>
    </div>
  );
}
