import { useRef, useState, useCallback, type RefObject } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import type * as TF from "@tensorflow/tfjs";

// tf is loaded as IIFE via /tf.min.js script tag in index.html
declare const tf: typeof TF;
import type { DriverSnapshot, ClientSafetyEvent } from "../types/monitoring";

// Detection constants
const EAR_THRESHOLD = 0.28;
const MAR_THRESHOLD = 0.55;
const EAR_CONSEC_FRAMES = 3;
const MAR_CONSEC_FRAMES = 15;
const POSE_CONSEC_FRAMES = 10;
const PITCH_THRESHOLD = 15;

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

function computeDwsScore(ear: number, mar: number, pitch: number): number {
  const earScore = Math.max(0, Math.min(100, ((EAR_THRESHOLD - ear) / EAR_THRESHOLD) * 100));
  const marScore = Math.max(0, Math.min(100, ((mar - MAR_THRESHOLD) / MAR_THRESHOLD) * 100));
  const pitchScore = Math.max(0, Math.min(100, (Math.abs(pitch) / PITCH_THRESHOLD) * 100));
  return Math.round(earScore * 0.5 + marScore * 0.3 + pitchScore * 0.2);
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

  // Frame counters
  const earCounterRef = useRef(0);
  const marCounterRef = useRef(0);
  const poseCounterRef = useRef(0);

  // Event dedup flags
  const inEarEventRef = useRef(false);
  const inMarEventRef = useRef(false);
  const inPoseEventRef = useRef(false);

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
      earCounterRef.current = 0;
      marCounterRef.current = 0;
      poseCounterRef.current = 0;
      inEarEventRef.current = false;
      inMarEventRef.current = false;
      inPoseEventRef.current = false;

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
            pitch = (noseTip.y - chin.y) * 100;

            // CNN
            if (modelRef.current) {
              try {
                cnnResult = await runCNN(video, lm, modelRef.current);
              } catch (err) {
                console.warn("[useBrowserCNN] CNN frame error:", err);
              }
            }

            // EAR consecutive counter
            if (ear < EAR_THRESHOLD) {
              earCounterRef.current += 1;
            } else {
              earCounterRef.current = 0;
              inEarEventRef.current = false;
            }

            // MAR consecutive counter
            if (mar > MAR_THRESHOLD) {
              marCounterRef.current += 1;
            } else {
              marCounterRef.current = 0;
              inMarEventRef.current = false;
            }

            // Pose consecutive counter
            if (Math.abs(pitch) > PITCH_THRESHOLD) {
              poseCounterRef.current += 1;
            } else {
              poseCounterRef.current = 0;
              inPoseEventRef.current = false;
            }

            earAlert = earCounterRef.current >= EAR_CONSEC_FRAMES;
            marAlert = marCounterRef.current >= MAR_CONSEC_FRAMES;
            poseAlert = poseCounterRef.current >= POSE_CONSEC_FRAMES;

            // Emit events (edge-triggered, not level-triggered)
            if (earAlert && !inEarEventRef.current) {
              inEarEventRef.current = true;
              const conf = cnnResult?.confidence ?? 0.9;
              const event: ClientSafetyEvent = {
                event_id: crypto.randomUUID(),
                event_type: "drowsiness_detected",
                severity: "high",
                occurred_at: new Date().toISOString(),
                confidence: conf,
                duration_ms: Math.floor(earCounterRef.current * (1000 / 15)),
                details: {
                  ear_value: ear,
                  mar_value: mar,
                  pitch_value: pitch,
                  cnn_label: cnnResult?.label,
                  consecutive_frame_count: earCounterRef.current,
                },
              };
              pushEvent(event);
            }

            if (marAlert && !inMarEventRef.current) {
              inMarEventRef.current = true;
              const event: ClientSafetyEvent = {
                event_id: crypto.randomUUID(),
                event_type: "yawning_detected",
                severity: "medium",
                occurred_at: new Date().toISOString(),
                confidence: cnnResult?.confidence ?? 0.8,
                duration_ms: Math.floor(marCounterRef.current * (1000 / 15)),
                details: {
                  ear_value: ear,
                  mar_value: mar,
                  pitch_value: pitch,
                  cnn_label: cnnResult?.label,
                  consecutive_frame_count: marCounterRef.current,
                },
              };
              pushEvent(event);
            }

            if (poseAlert && !inPoseEventRef.current) {
              inPoseEventRef.current = true;
              const event: ClientSafetyEvent = {
                event_id: crypto.randomUUID(),
                event_type: "head_nodding_detected",
                severity: "medium",
                occurred_at: new Date().toISOString(),
                confidence: cnnResult?.confidence ?? 0.75,
                duration_ms: Math.floor(poseCounterRef.current * (1000 / 15)),
                details: {
                  ear_value: ear,
                  mar_value: mar,
                  pitch_value: pitch,
                  cnn_label: cnnResult?.label,
                  consecutive_frame_count: poseCounterRef.current,
                },
              };
              pushEvent(event);
            }
          } else {
            // No face — reset counters
            earCounterRef.current = 0;
            marCounterRef.current = 0;
            poseCounterRef.current = 0;
            inEarEventRef.current = false;
            inMarEventRef.current = false;
            inPoseEventRef.current = false;
          }

          const dwsScore = computeDwsScore(ear, mar, pitch);
          const status =
            earAlert || marAlert || poseAlert || !faceDetected
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
            eyesOpen: ear >= EAR_THRESHOLD,
            mouthClosed: mar <= MAR_THRESHOLD,
            faceDetected: !!faceDetected,
            earAlert,
            marAlert,
            poseAlert,
            alarmOn: earAlert || marAlert || poseAlert,
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
            prev.poseAlert !== newMetrics.poseAlert;

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
