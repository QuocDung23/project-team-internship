import { useRef, useState, useCallback, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { FaceLandmarker } from "@mediapipe/tasks-vision";
import type * as TF from "@tensorflow/tfjs";
import { preloadDetectorResources } from "./browserDetectorResources";
import {
  EAR_THRESHOLD,
  MAR_THRESHOLD,
  createBrowserDetectionState,
  processDetectionSample,
  resetBrowserDetectionState,
} from "./browserDetectionLogic";
import {
  postMonitoringFrame,
  postMonitoringSnapshot,
  type BrowserMonitoringSnapshotPayload,
} from "../services/backendApi";

// tf is loaded as IIFE via /tf.min.js script tag in index.html
declare const tf: typeof TF;
import type { DriverSnapshot, ClientSafetyEvent } from "../types/monitoring";

// Landmark indices
const LEFT_EYE_IDX = [362, 385, 387, 263, 373, 380];
const RIGHT_EYE_IDX = [33, 160, 158, 133, 153, 144];
const MOUTH_IDX = [61, 291, 0, 17, 39, 269, 405, 181];
const MONITORING_PUBLISH_INTERVAL_MS = 1000;
const MONITORING_STARTUP_DELAY_MS = 3000;
const MONITORING_FRAME_MAX_WIDTH = 640;
const MONITORING_FRAME_JPEG_QUALITY = 0.72;
const DETECTION_INTERVAL_MS = 1000 / 15;
const CNN_FRAME_INTERVAL = 3;

interface Point2D {
  x: number;
  y: number;
}

interface Point3D extends Point2D {
  z: number;
}

function euclidean(a: Point2D, b: Point2D): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function eyeAspectRatio(pts: Point2D[]): number {
  const A = euclidean(pts[1]!, pts[5]!);
  const B = euclidean(pts[2]!, pts[4]!);
  const C = euclidean(pts[0]!, pts[3]!);
  return (A + B) / (2.0 * C);
}

function mouthAspectRatio(pts: Point2D[]): number {
  const A = euclidean(pts[2]!, pts[7]!);
  const B = euclidean(pts[3]!, pts[6]!);
  const C = euclidean(pts[0]!, pts[1]!);
  return (A + B) / (2.0 * C);
}

function computeDwsScore(ear: number, mar: number): number {
  const earScore = Math.max(0, Math.min(100, ((EAR_THRESHOLD - ear) / EAR_THRESHOLD) * 100));
  const marScore = Math.max(0, Math.min(100, ((mar - MAR_THRESHOLD) / MAR_THRESHOLD) * 100));
  return Math.round(earScore * 0.65 + marScore * 0.35);
}

function encodeMonitoringFrame(video: HTMLVideoElement): Promise<Blob | null> {
  if (video.videoWidth <= 0 || video.videoHeight <= 0) return Promise.resolve(null);
  const scale = Math.min(1, MONITORING_FRAME_MAX_WIDTH / video.videoWidth);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
  canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob),
      "image/jpeg",
      MONITORING_FRAME_JPEG_QUALITY,
    );
  });
}

function waitForVideoMetadata(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= 1 && video.videoWidth > 0 && video.videoHeight > 0) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("error", onError);
    };
    const onLoaded = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("Camera video metadata could not be loaded."));
    };
    video.addEventListener("loadedmetadata", onLoaded, { once: true });
    video.addEventListener("error", onError, { once: true });
  });
}

async function runCNN(
  video: HTMLVideoElement,
  landmarks: Point3D[],
  model: TF.GraphModel,
): Promise<{ label: string; confidence: number }> {
  const xs = landmarks.map((l) => l.x * video.videoWidth) as number[];
  const ys = landmarks.map((l) => l.y * video.videoHeight) as number[];
  const x1 = Math.max(0, Math.min(...xs) - 20);
  const y1 = Math.max(0, Math.min(...ys) - 20);
  const x2 = Math.min(video.videoWidth, Math.max(...xs) + 20);
  const y2 = Math.min(video.videoHeight, Math.max(...ys) + 20);

  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(video, x1, y1, x2 - x1, y2 - y1, 0, 0, 64, 64);
  const imageData = ctx.getImageData(0, 0, 64, 64);

  const tensor = tf.tidy(() => {
    const rgb = tf.browser.fromPixels(imageData);
    const gray = rgb.mean(2).expandDims(2);
    return gray.expandDims(0).div(255.0);
  });

  const rawOutput = model.predict(tensor) as TF.Tensor | TF.Tensor[] | TF.NamedTensorMap;
  const output = Array.isArray(rawOutput)
    ? rawOutput[0]
    : "dispose" in rawOutput
      ? rawOutput
      : rawOutput.output_0 ?? Object.values(rawOutput)[0];
  if (!output) {
    tensor.dispose();
    throw new Error("CNN model did not return an output tensor.");
  }
  const probs = await output.data();
  tensor.dispose();
  if (Array.isArray(rawOutput)) {
    rawOutput.forEach((tensorOutput) => tensorOutput.dispose());
  } else if ("dispose" in rawOutput) {
    rawOutput.dispose();
  } else {
    Object.values(rawOutput).forEach((tensorOutput) => tensorOutput.dispose());
  }

  const labels: ["closed", "open", "yawn"] = ["closed", "open", "yawn"];
  const probsArray = Array.from(probs);
  const maxIdx = probsArray.indexOf(Math.max(...probsArray));
  return { label: labels[maxIdx] ?? "closed", confidence: probsArray[maxIdx] ?? 0 };
}

export interface BrowserCNNReturn {
  videoRef: RefObject<HTMLVideoElement | null>;
  metrics: DriverSnapshot | null;
  isRunning: boolean;
  eventCount: number;
  events: ClientSafetyEvent[];
  start: (tripId: string) => Promise<void>;
  stop: () => ClientSafetyEvent[];
}

export function useBrowserCNN(): BrowserCNNReturn {
  const { t } = useTranslation("trips");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [metrics, setMetrics] = useState<DriverSnapshot | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [eventCount, setEventCount] = useState(0);
  const [events, setEvents] = useState<ClientSafetyEvent[]>([]);

  // Mutable refs — not state
  const runningRef = useRef(false);
  const animFrameRef = useRef<number | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const modelRef = useRef<TF.GraphModel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const eventsRef = useRef<ClientSafetyEvent[]>([]);
  const tripIdRef = useRef<string>("");
  const detectionStateRef = useRef(createBrowserDetectionState());
  const detectionFrameCountRef = useRef(0);
  const monitoringStartedAtRef = useRef(0);
  const lastCnnResultRef = useRef<{ label: string; confidence: number } | null>(null);

  // FPS tracking
  const lastFrameTsRef = useRef<number>(0);
  const fpsRef = useRef<number | null>(null);
  const lastMonitoringPublishTsRef = useRef<number>(0);
  const monitoringPublishInFlightRef = useRef(false);

  // Last metrics for change detection
  const lastMetricsRef = useRef<DriverSnapshot | null>(null);

  const pushEvent = useCallback((event: ClientSafetyEvent) => {
    eventsRef.current.push(event);
    setEventCount(eventsRef.current.length);
    setEvents(eventsRef.current.slice());
  }, []);

  const publishMonitoring = useCallback(
    async (snapshot: BrowserMonitoringSnapshotPayload, video: HTMLVideoElement) => {
      if (monitoringPublishInFlightRef.current) return;
      monitoringPublishInFlightRef.current = true;
      try {
        await postMonitoringSnapshot(snapshot);
        const frame = await encodeMonitoringFrame(video);
        if (frame) await postMonitoringFrame(frame);
      } catch (err) {
        console.warn("[useBrowserCNN] Monitoring publish failed:", err);
      } finally {
        monitoringPublishInFlightRef.current = false;
      }
    },
    [],
  );

  const stop = useCallback((): ClientSafetyEvent[] => {
    runningRef.current = false;
    setIsRunning(false);

    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    // Stop camera tracks — use streamRef directly so stop() works even if srcObject was cleared
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    monitoringPublishInFlightRef.current = false;
    lastMonitoringPublishTsRef.current = 0;
    lastFrameTsRef.current = 0;
    fpsRef.current = null;
    detectionFrameCountRef.current = 0;
    monitoringStartedAtRef.current = 0;
    lastCnnResultRef.current = null;

    return eventsRef.current.slice();
  }, []);

  const start = useCallback(
    async (tripId: string) => {
      if (runningRef.current) return;

      tripIdRef.current = tripId;
      eventsRef.current = [];
      setEventCount(0);
      setEvents([]);
      resetBrowserDetectionState(detectionStateRef.current);
      lastFrameTsRef.current = 0;
      fpsRef.current = null;
      detectionFrameCountRef.current = 0;
      lastCnnResultRef.current = null;

      try {
        const resources = await preloadDetectorResources();
        landmarkerRef.current = resources.landmarker;
        modelRef.current = resources.cnnModel;
      } catch (err) {
        console.error("[useBrowserCNN] Failed to load detector resources:", err);
        throw new Error(t("monitoring.errors.cameraDeniedMessage"), {
          cause: err,
        });
      }

      // Camera
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      } catch (err) {
        console.error("[useBrowserCNN] Camera access denied:", err);
        throw new Error(t("monitoring.errors.cameraDeniedMessage"), {
          cause: err,
        });
      }

      if (!videoRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        throw new Error(t("monitoring.errors.cameraDeniedMessage"));
      }
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      runningRef.current = true;
      monitoringStartedAtRef.current = performance.now();
      setIsRunning(true);

      try {
        await waitForVideoMetadata(videoRef.current);
        await videoRef.current.play();
      } catch (err) {
        console.error("[useBrowserCNN] Video play error:", err);
        stop();
        throw new Error(t("monitoring.errors.cameraDeniedMessage"), {
          cause: err,
        });
      }

      const loop = async () => {
        if (!runningRef.current) return;

        try {
          const video = videoRef.current;
          const landmarker = landmarkerRef.current;

          if (!video || !landmarker || video.readyState < 2) {
            animFrameRef.current = requestAnimationFrame(loop);
            return;
          }

          const now = performance.now();
          if (
            lastFrameTsRef.current > 0 &&
            now - lastFrameTsRef.current < DETECTION_INTERVAL_MS
          ) {
            animFrameRef.current = requestAnimationFrame(loop);
            return;
          }

          // FPS
          if (lastFrameTsRef.current > 0) {
            fpsRef.current = Math.round(1000 / (now - lastFrameTsRef.current));
          }
          lastFrameTsRef.current = now;
          detectionFrameCountRef.current += 1;

          // MediaPipe detection
          const result = landmarker.detectForVideo(video, now);
          const faceDetected = result.faceLandmarks && result.faceLandmarks.length > 0;

          let ear = 0;
          let mar = 0;
          let pitch = 0;
          let earAlert = false;
          let marAlert = false;
          let poseAlert = false;
          let cnnResult: { label: string; confidence: number } | null = null;
          let eyesOpen = true;
          let mouthClosed = true;
          let alarmOn = false;
          let drowsinessWarningActive = false;
          let yawnWarningActive = false;
          let overlay: DriverSnapshot["overlay"] | undefined;

          if (faceDetected) {
            const lm = result.faceLandmarks[0] as Point3D[];

            // EAR
            const leftEyePts = LEFT_EYE_IDX.map((i) => lm[i]!);
            const rightEyePts = RIGHT_EYE_IDX.map((i) => lm[i]!);
            const leftEAR = eyeAspectRatio(leftEyePts);
            const rightEAR = eyeAspectRatio(rightEyePts);
            ear = (leftEAR + rightEAR) / 2.0;

            // MAR
            const mouthPts = MOUTH_IDX.map((i) => lm[i]!);
            mar = mouthAspectRatio(mouthPts);

            // Pitch (simple proxy)
            const noseTip = lm[1]!;
            const chin = lm[152]!;
            const rawPitch = (noseTip.y - chin.y) * 100;

            // CNN
            if (
              modelRef.current &&
              detectionFrameCountRef.current % CNN_FRAME_INTERVAL === 0
            ) {
              try {
                cnnResult = await runCNN(video, lm, modelRef.current);
                lastCnnResultRef.current = cnnResult;
              } catch (err) {
                console.warn("[useBrowserCNN] CNN frame error:", err);
              }
            } else {
              cnnResult = lastCnnResultRef.current;
            }

            const decision = processDetectionSample(detectionStateRef.current, {
              now,
              ear,
              mar,
              rawPitch,
              faceDetected: true,
            });
            pitch = decision.pitch;
            eyesOpen = decision.eyesOpen;
            mouthClosed = decision.mouthClosed;
            earAlert = decision.earAlert;
            marAlert = decision.marAlert;
            poseAlert = decision.poseAlert;
            alarmOn = decision.alarmOn;
            drowsinessWarningActive = decision.drowsinessWarningActive;
            yawnWarningActive = decision.yawnWarningActive;

            for (const aggregateEvent of decision.events) {
              const event: ClientSafetyEvent = {
                event_id: crypto.randomUUID(),
                event_type: aggregateEvent.eventType,
                severity: aggregateEvent.severity,
                occurred_at: new Date().toISOString(),
                confidence: cnnResult?.confidence ?? (aggregateEvent.eventType === "drowsiness_detected" ? 0.9 : 0.8),
                duration_ms: Math.round(aggregateEvent.durationMs),
                details: {
                  ear_value: ear,
                  mar_value: mar,
                  pitch_value: pitch,
                  cnn_label: cnnResult?.label,
                  consecutive_frame_count: aggregateEvent.durationMs > 0
                    ? Math.round(aggregateEvent.durationMs / (1000 / (fpsRef.current || 15)))
                    : undefined,
                },
              };
              pushEvent(event);
            }

            overlay = {
              earCounter: 0,
              marCounter: 0,
              poseCounter: 0,
            };
          } else {
            // No face — reset counters
            processDetectionSample(detectionStateRef.current, {
              now,
              ear,
              mar,
              rawPitch: pitch,
              faceDetected: false,
            });
          }

          const dwsScore = computeDwsScore(ear, mar);
          const status =
            earAlert || marAlert || !faceDetected
              ? "critical"
              : dwsScore >= 30
                ? "warn"
                : "active";

          const newMetrics: DriverSnapshot = {
            ts: now,
            ear,
            mar,
            pitch,
            fps: fpsRef.current,
            dwsScore,
            status,
            eyesOpen,
            mouthClosed,
            faceDetected: !!faceDetected,
            earAlert,
            marAlert,
            poseAlert,
            alarmOn,
            drowsinessWarningActive,
            yawnWarningActive,
            overlay,
          };

          if (
            now - monitoringStartedAtRef.current >= MONITORING_STARTUP_DELAY_MS &&
            now - lastMonitoringPublishTsRef.current >= MONITORING_PUBLISH_INTERVAL_MS
          ) {
            lastMonitoringPublishTsRef.current = now;
            void publishMonitoring(
              {
                trip_id: tripIdRef.current || null,
                timestamp: Date.now() / 1000,
                fps: fpsRef.current,
                ear,
                mar,
                pitch,
                dws_score: dwsScore,
                eyes_open: eyesOpen,
                mouth_closed: mouthClosed,
                face_detected: Boolean(faceDetected),
                ear_alert: earAlert,
                mar_alert: marAlert,
                pose_alert: poseAlert,
                alarm_on: alarmOn,
                ear_counter: 0,
                mar_counter: 0,
                pose_counter: 0,
                cnn_enabled: true,
              },
              video,
            );
          }

          // Only update state when values change meaningfully (avoid every-frame re-renders)
          const prev = lastMetricsRef.current;
          const changed =
            !prev ||
            Math.abs(prev.ear - newMetrics.ear) > 0.005 ||
            Math.abs(prev.mar - newMetrics.mar) > 0.005 ||
            Math.abs(prev.pitch - newMetrics.pitch) > 0.5 ||
            prev.faceDetected !== newMetrics.faceDetected ||
            prev.earAlert !== newMetrics.earAlert ||
            prev.marAlert !== newMetrics.marAlert ||
            prev.poseAlert !== newMetrics.poseAlert ||
            prev.alarmOn !== newMetrics.alarmOn ||
            prev.drowsinessWarningActive !== newMetrics.drowsinessWarningActive ||
            prev.yawnWarningActive !== newMetrics.yawnWarningActive ||
            Boolean(newMetrics.overlay);

          if (changed) {
            lastMetricsRef.current = newMetrics;
            setMetrics(newMetrics);
          }
        } catch (err) {
          console.warn("[useBrowserCNN] Frame error:", err);
        }

        animFrameRef.current = requestAnimationFrame(loop);
      };

      animFrameRef.current = requestAnimationFrame(loop);
    },
    [publishMonitoring, pushEvent, stop, t],
  );

  return { videoRef, metrics, isRunning, eventCount, events, start, stop };
}
