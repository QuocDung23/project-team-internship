import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import type * as TF from "@tensorflow/tfjs";

declare const tf: typeof TF;

const MEDIAPIPE_WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const FACE_LANDMARKER_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const CNN_MODEL_URL = "/models/drowsiness_cnn/model.json";

let landmarker: FaceLandmarker | null = null;
let cnnModel: TF.GraphModel | null = null;
let preloadPromise: Promise<DetectorResources> | null = null;
let warmupPromise: Promise<void> | null = null;

export interface DetectorResources {
  landmarker: FaceLandmarker;
  cnnModel: TF.GraphModel | null;
}

function disposeTensorOutput(output: TF.Tensor | TF.Tensor[] | TF.NamedTensorMap): void {
  if (Array.isArray(output)) {
    output.forEach((tensor) => tensor.dispose());
    return;
  }
  if ("dispose" in output) {
    output.dispose();
    return;
  }
  Object.values(output).forEach((tensor) => tensor.dispose());
}

export async function preloadDetectorResources(): Promise<DetectorResources> {
  if (preloadPromise) return preloadPromise;

  preloadPromise = (async () => {
    if (!landmarker) {
      const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL);
      landmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: FACE_LANDMARKER_MODEL_URL,
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numFaces: 1,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
      });
    }

    if (!cnnModel) {
      try {
        cnnModel = await tf.loadGraphModel(CNN_MODEL_URL);
      } catch (err) {
        console.warn("[browserDetectorResources] CNN model not available:", err);
      }
    }

    try {
      await warmUpDetectorResources();
    } catch (err) {
      console.warn("[browserDetectorResources] CNN warm-up failed:", err);
    }

    return { landmarker, cnnModel };
  })().catch((err) => {
    preloadPromise = null;
    throw err;
  });

  return preloadPromise;
}

export async function warmUpDetectorResources(): Promise<void> {
  if (warmupPromise) return warmupPromise;

  warmupPromise = (async () => {
    if (!cnnModel) return;

    const input = tf.zeros([1, 64, 64, 1]);
    try {
      const output = cnnModel.predict(input) as TF.Tensor | TF.Tensor[] | TF.NamedTensorMap;
      await Promise.all(
        (Array.isArray(output)
          ? output
          : "dispose" in output
            ? [output]
            : Object.values(output)
        ).map((tensor) => tensor.data()),
      );
      disposeTensorOutput(output);
    } finally {
      input.dispose();
    }
  })().catch((err) => {
    warmupPromise = null;
    throw err;
  });

  return warmupPromise;
}
