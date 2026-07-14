import { useRef, useState, useCallback, type RefObject } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import type * as TF from "@tensorflow/tfjs";
import {
  EAR_THRESHOLD,
  MAR_THRESHOLD,
  createBrowserDetectionState,
  processDetectionSample,
  resetBrowserDetectionState,
} from "./browserDetectionLogic";

// tf is loaded as IIFE via /tf.min.js script tag in index.html
declare const tf: typeof TF;
import type { DriverSnapshot, ClientSafetyEvent } from "../types/monitoring";

// Landmark indices
const LEFT_EYE_IDX = [362, 385, 387, 263, 373, 380];
const RIGHT_EYE_IDX = [33, 160, 158, 133, 153, 144];
const MOUTH_IDX = [61, 291, 0, 17, 39, 269, 405, 181];

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

async function runCNN(
  video: HTMLVideoElement,
  landmarks: Point3D[],
  model: TF.LayersModel,
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

  const output = model.predict(tensor) as TF.Tensor;
  const probs = await output.data();
  tensor.dispose();
  output.dispose();

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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [metrics, setMetrics] = useState<DriverSnapshot | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [eventCount, setEventCount] = useState(0);
  const [events, setEvents] = useState<ClientSafetyEvent[]>([]);

  // Mutable refs — not state
  const runningRef = useRef(false);
  const animFrameRef = useRef<number | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const modelRef = useRef<TF.LayersModel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const eventsRef = useRef<ClientSafetyEvent[]>([]);
  const tripIdRef = useRef<string>("");
  const detectionStateRef = useRef(createBrowserDetectionState());

  // FPS tracking
  const lastFrameTsRef = useRef<number>(0);
  const fpsRef = useRef<number | null>(null);

  // Last metrics for change detection
  const lastMetricsRef = useRef<DriverSnapshot | null>(null);

  const pushEvent = useCallback((event: ClientSafetyEvent) => {
    eventsRef.current.push(event);
    setEventCount(eventsRef.current.length);
    setEvents(eventsRef.current.slice());
  }, []);

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

      // Camera
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      } catch (err) {
        console.error("[useBrowserCNN] Camera access denied:", err);
        throw new Error("Camera access denied. Please allow camera access to run live detection.", {
          cause: err,
        });
      }

      if (!videoRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play().catch((err) =>
        console.error("[useBrowserCNN] Video play error:", err),
      );

      // Load MediaPipe landmarker (lazy)
      if (!landmarkerRef.current) {
        try {
          const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm",
          );
          landmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
              delegate: "GPU",
            },
            runningMode: "VIDEO",
            numFaces: 1,
            outputFaceBlendshapes: false,
            outputFacialTransformationMatrixes: false,
          });
        } catch (err) {
          console.error("[useBrowserCNN] Failed to load FaceLandmarker:", err);
          stop();
          return;
        }
      }

      // Load TF.js model (lazy, non-fatal)
      if (!modelRef.current) {
        try {
          modelRef.current = await tf.loadLayersModel("/models/drowsiness_cnn/model.json");
        } catch (err) {
          console.warn("[useBrowserCNN] CNN model not available, running without it:", err);
          // modelRef.current stays null — CNN inference skipped
        }
      }

      runningRef.current = true;
      setIsRunning(true);

      const loop = async () => {
        if (!runningRef.current) return;

        try {
          const video = videoRef.current;
          const landmarker = landmarkerRef.current;

          if (!video || !landmarker || video.readyState < 2) {
            animFrameRef.current = requestAnimationFrame(loop);
            return;
          }

          // FPS
          const now = performance.now();
          if (lastFrameTsRef.current > 0) {
            fpsRef.current = Math.round(1000 / (now - lastFrameTsRef.current));
          }
          lastFrameTsRef.current = now;

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
            if (modelRef.current) {
              try {
                cnnResult = await runCNN(video, lm, modelRef.current);
              } catch (err) {
                console.warn("[useBrowserCNN] CNN frame error:", err);
              }
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
          };

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
            prev.yawnWarningActive !== newMetrics.yawnWarningActive;

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
    [pushEvent, stop],
  );

  return { videoRef, metrics, isRunning, eventCount, events, start, stop };
}
