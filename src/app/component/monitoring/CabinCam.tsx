import { useEffect, useMemo, useRef, useState } from "react";
import {
  VideoCamera,
  VideoCameraSlash,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import { getFaceLandmarks, getFaceMeshGroups } from "../../utils/faceMesh";
import { formatTime } from "../../hook/useTicker";
import {
  DriverSilhouette,
  FaceMeshOverlay,
  CornerMarkers,
  StatusPip,
} from "./CabinCam.presentational";

interface CabinCamProps {
  eyesOpen: boolean;
  mouthClosed: boolean;
  onPhone: boolean;
  seatbelt: boolean;
}

const FRAME_W = 1280;
const FRAME_H = 720;
const CX_FACE = 0.5;
const CY_FACE = 0.42;

export function CabinCam({
  eyesOpen,
  mouthClosed,
  onPhone,
  seatbelt,
}: CabinCamProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [useRealCam, setUseRealCam] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [now, setNow] = useState<number>(() => Date.now());

  const landmarks = useMemo(() => getFaceLandmarks(), []);
  const groups = useMemo(() => getFaceMeshGroups(), []);

  // Subtle head jitter so the mesh "lives" between camera frames.
  useEffect(() => {
    if (useRealCam) return;
    const id = window.setInterval(() => {
      setTick((t) => (t + 1) % 100000);
      setNow(Date.now());
    }, 1500);
    return () => window.clearInterval(id);
  }, [useRealCam]);

  // Wire up / tear down the live camera when toggled.
  useEffect(() => {
    if (!useRealCam) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;
      return;
    }

    let cancelled = false;
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, facingMode: "user" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setCamError(null);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Không thể truy cập camera";
        setCamError(msg);
        setUseRealCam(false);
      }
    };
    start();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [useRealCam]);

  const jitterX = Math.sin(tick * 0.4) * 6;
  const jitterY = Math.cos(tick * 0.31) * 4;

  return (
    <section className="panel relative overflow-hidden">
      {/* Top bar: title + timestamp + camera toggle */}
      <header className="absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-4">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-md bg-rose-500/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-rose-300 ring-1 ring-rose-400/30">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" />
            Live
          </span>
          <h2 className="text-[13px] font-semibold tracking-tight text-zinc-100">
            Cabin Cam
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden text-[11px] font-mono-num text-zinc-400 sm:inline">
            {new Date(now).toLocaleString("vi-VN")}
          </span>
          <button
            type="button"
            onClick={() => setUseRealCam((v) => !v)}
            className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900/70 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-zinc-200 backdrop-blur transition hover:border-zinc-500 hover:text-white"
            aria-pressed={useRealCam}
          >
            {useRealCam ? (
              <>
                <VideoCameraSlash size={12} weight="bold" />
                Mock
              </>
            ) : (
              <>
                <VideoCamera size={12} weight="bold" />
                Use Camera
              </>
            )}
          </button>
        </div>
      </header>

      {/* Camera surface */}
      <div className="relative aspect-video w-full bg-[radial-gradient(ellipse_at_center,#1a2230_0%,#0a0e14_75%)]">
        {useRealCam ? (
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover transform-[scaleX(-1)]"
            playsInline
            muted
          />
        ) : (
          <DriverSilhouette jitterX={jitterX} jitterY={jitterY} />
        )}

        {/* Face mesh overlay (always on top, mock only). */}
        {!useRealCam && (
          <FaceMeshOverlay
            landmarks={landmarks}
            groups={groups}
            jitterX={jitterX}
            jitterY={jitterY}
            FRAME_W={FRAME_W}
            FRAME_H={FRAME_H}
            CX_FACE={CX_FACE}
            CY_FACE={CY_FACE}
          />
        )}

        {/* Scanline overlay for cinematic CCTV feel */}
        <div
          className="pointer-events-none absolute inset-0 opacity-30 mix-blend-overlay"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent 0px, transparent 3px, rgba(255,255,255,0.04) 3px, rgba(255,255,255,0.04) 4px)",
          }}
          aria-hidden
        />

        {/* Corner frame markers */}
        <CornerMarkers />

        {/* Camera error banner */}
        {camError && (
          <div className="absolute inset-x-4 top-16 z-30 rounded-md border border-rose-500/40 bg-rose-950/80 px-3 py-2 text-xs text-rose-200 backdrop-blur">
            {camError}
          </div>
        )}
      </div>

      {/* Bottom status strip */}
      <div className="flex items-center justify-between gap-3 border-t border-zinc-800 bg-zinc-950/60 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <StatusPip
            label="Eyes"
            active={eyesOpen}
            okLabel="Open"
            badLabel="Closed"
          />
          <StatusPip
            label="Mouth"
            active={mouthClosed}
            okLabel="Closed"
            badLabel="Open"
          />
          <StatusPip
            label="Phone"
            active={!onPhone}
            okLabel="Idle"
            badLabel="Detected"
          />
          <StatusPip
            label="Seatbelt"
            active={seatbelt}
            okLabel="On"
            badLabel="Off"
          />
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono-num text-zinc-500">
          <ArrowsClockwise size={11} />
          {formatTime(now)}
        </div>
      </div>
    </section>
  );
}
