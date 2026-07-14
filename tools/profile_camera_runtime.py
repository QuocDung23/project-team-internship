from __future__ import annotations

import argparse
import json
import os
import statistics
import time
from pathlib import Path

import cv2
import dlib
import numpy as np
from imutils import face_utils
from scipy.spatial import distance

try:
    import tensorflow as tf
except ModuleNotFoundError:
    tf = None


MODEL_POINTS = np.array(
    [
        (0.0, 0.0, 0.0),
        (0.0, -330.0, -65.0),
        (-225.0, 170.0, -135.0),
        (225.0, 170.0, -135.0),
        (-150.0, -150.0, -125.0),
        (150.0, -150.0, -125.0),
    ],
    dtype=np.float64,
)


class TimerStats:
    def __init__(self) -> None:
        self.values: dict[str, list[float]] = {}

    def add(self, name: str, seconds: float) -> None:
        self.values.setdefault(name, []).append(seconds * 1000.0)

    def summary(self) -> dict[str, dict[str, float]]:
        result = {}
        for name, values in self.values.items():
            if not values:
                continue
            result[name] = {
                "count": len(values),
                "avg_ms": statistics.fmean(values),
                "p95_ms": percentile(values, 95),
                "max_ms": max(values),
            }
        return result


def percentile(values: list[float], pct: float) -> float:
    ordered = sorted(values)
    if not ordered:
        return 0.0
    index = min(len(ordered) - 1, int(round((pct / 100.0) * (len(ordered) - 1))))
    return ordered[index]


def timed(stats: TimerStats, name: str, func, *args, **kwargs):
    start = time.perf_counter()
    value = func(*args, **kwargs)
    stats.add(name, time.perf_counter() - start)
    return value


def open_camera(index: int, backend: str) -> cv2.VideoCapture:
    if backend == "dshow":
        cap = cv2.VideoCapture(index, cv2.CAP_DSHOW)
        if not cap.isOpened() and os.name == "nt":
            cap.release()
            cap = cv2.VideoCapture(index, cv2.CAP_MSMF)
        return cap
    if backend == "msmf":
        return cv2.VideoCapture(index, cv2.CAP_MSMF)
    return cv2.VideoCapture(index)


def candidate_indexes(preferred_index: int, limit: int = 5) -> list[int]:
    indexes = [int(preferred_index)]
    indexes.extend(i for i in range(limit + 1) if i != int(preferred_index))
    return indexes


def open_first_available_camera(preferred_index: int, backend: str):
    backend_order = [backend]
    if os.name == "nt":
        for candidate_backend in ("dshow", "msmf", "any"):
            if candidate_backend not in backend_order:
                backend_order.append(candidate_backend)
    elif "any" not in backend_order:
        backend_order.append("any")

    for candidate_backend in backend_order:
        for candidate_index in candidate_indexes(preferred_index):
            cap = open_camera(candidate_index, candidate_backend)
            if cap.isOpened():
                return cap, candidate_index, candidate_backend
            cap.release()
    return open_camera(preferred_index, backend), preferred_index, backend


def configure_camera(cap: cv2.VideoCapture, width: int, height: int, fps: float, buffer_size: int) -> None:
    cap.set(cv2.CAP_PROP_BUFFERSIZE, int(buffer_size))
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, int(width))
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, int(height))
    if fps > 0:
        cap.set(cv2.CAP_PROP_FPS, float(fps))


def eye_aspect_ratio(eye) -> float:
    a = distance.euclidean(eye[1], eye[5])
    b = distance.euclidean(eye[2], eye[4])
    c = distance.euclidean(eye[0], eye[3])
    return float((a + b) / (2.0 * c)) if c else 0.0


def mouth_aspect_ratio(mouth) -> float:
    a = distance.euclidean(mouth[2], mouth[10])
    b = distance.euclidean(mouth[4], mouth[8])
    c = distance.euclidean(mouth[0], mouth[6])
    return float((a + b) / (2.0 * c)) if c else 0.0


def normalize_pitch(pitch_raw: float) -> float:
    pitch = pitch_raw % 360
    if pitch > 180:
        pitch -= 360
    if pitch > 90:
        pitch = 180 - pitch
    elif pitch < -90:
        pitch = -180 - pitch
    return float(pitch)


def get_head_pose(shape, frame_shape):
    h, w = frame_shape[:2]
    focal = float(w)
    cam_matrix = np.array(
        [[focal, 0, w / 2.0], [0, focal, h / 2.0], [0, 0, 1]], dtype=np.float64
    )
    img_points = np.array(
        [shape[30], shape[8], shape[36], shape[45], shape[48], shape[54]],
        dtype=np.float64,
    )
    success, rvec, _ = cv2.solvePnP(
        MODEL_POINTS, img_points, cam_matrix, np.zeros((4, 1)), flags=cv2.SOLVEPNP_ITERATIVE
    )
    if not success:
        return None
    rmat, _ = cv2.Rodrigues(rvec)
    angles, *_ = cv2.RQDecomp3x3(rmat)
    return normalize_pitch(float(angles[0])), float(angles[1]), float(angles[2])


def load_cnn(model_path: Path, class_json: Path):
    if tf is None or not model_path.exists() or not class_json.exists():
        return None, 0
    model = tf.keras.models.load_model(str(model_path))
    with class_json.open(encoding="utf-8") as f:
        idx_to_class = json.load(f)
    closed = [int(k) for k, value in idx_to_class.items() if value == "closed"]
    return model, (closed[0] if closed else 0)


def predict_eye_cnn_batch(model, closed_index: int, gray, eyes) -> float:
    crops = []
    for eye_points in eyes:
        x, y, width, height = cv2.boundingRect(eye_points)
        pad = 6
        crop = gray[
            max(0, y - pad): min(gray.shape[0], y + height + pad),
            max(0, x - pad): min(gray.shape[1], x + width + pad),
        ]
        if crop.size > 0:
            eye = cv2.resize(crop, (64, 64)).astype("float32") / 255.0
            crops.append(eye.reshape(64, 64, 1))
    if not crops:
        return 0.0
    probs = model.predict(np.array(crops), verbose=0)
    return float(np.mean(probs[:, closed_index]))


def print_summary(stats: TimerStats, frames: int, elapsed: float, faces_seen: int) -> None:
    print("\n=== profile summary ===")
    print(f"frames={frames} elapsed_s={elapsed:.2f} average_total_fps={frames / max(1e-6, elapsed):.1f}")
    print(f"frames_with_face={faces_seen}")
    for name, data in stats.summary().items():
        print(
            f"{name}: avg={data['avg_ms']:.2f}ms p95={data['p95_ms']:.2f}ms "
            f"max={data['max_ms']:.2f}ms count={int(data['count'])}"
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Profile camera/runtime stages without modifying integrate_cnn.py.")
    parser.add_argument("--camera", type=int, default=1)
    parser.add_argument("--backend", choices=["any", "dshow", "msmf"], default=("dshow" if os.name == "nt" else "any"))
    parser.add_argument("--width", type=int, default=640)
    parser.add_argument("--height", type=int, default=480)
    parser.add_argument("--fps", type=float, default=30.0)
    parser.add_argument("--buffer-size", type=int, default=1)
    parser.add_argument("--process-width", type=int, default=640)
    parser.add_argument("--duration", type=float, default=20.0)
    parser.add_argument("--report-interval", type=float, default=5.0)
    parser.add_argument("--no-display", action="store_true")
    parser.add_argument("--model", type=Path, default=Path("best_model_v2.h5"))
    parser.add_argument("--class-json", type=Path, default=Path("class_indices_v2.json"))
    parser.add_argument("--landmark-model", type=Path, default=Path("shape_predictor_68_face_landmarks.dat"))
    parser.add_argument("--skip-cnn", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    cap, actual_index, actual_backend = open_first_available_camera(args.camera, args.backend)
    configure_camera(cap, args.width, args.height, args.fps, args.buffer_size)
    if not cap.isOpened():
        print(f"Could not open camera={args.camera} backend={args.backend}")
        return 1

    print(
        f"opened requested_camera={args.camera} actual_index={actual_index} backend={actual_backend} "
        f"resolution={int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))}x{int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))} "
        f"reported_fps={cap.get(cv2.CAP_PROP_FPS):.1f} buffer={args.buffer_size}"
    )
    detector = dlib.get_frontal_face_detector()
    predictor = dlib.shape_predictor(str(args.landmark_model))
    left_start, left_end = face_utils.FACIAL_LANDMARKS_IDXS["left_eye"]
    right_start, right_end = face_utils.FACIAL_LANDMARKS_IDXS["right_eye"]
    mouth_start, mouth_end = 48, 68
    model, closed_index = (None, 0) if args.skip_cnn else load_cnn(args.model, args.class_json)
    print(f"cnn={'enabled' if model is not None else 'disabled'}")

    stats = TimerStats()
    frames = 0
    faces_seen = 0
    started = time.perf_counter()
    window_started = started
    window_frames = 0

    try:
        while True:
            frame_start = time.perf_counter()
            ok, frame = timed(stats, "capture_read", cap.read)
            if not ok or frame is None:
                print("frame read failed")
                break
            frames += 1
            window_frames += 1

            frame = timed(stats, "frame_flip", cv2.flip, frame, 1)
            h, w = frame.shape[:2]
            if w > args.process_width:
                scale = args.process_width / w
                frame = timed(stats, "resize", cv2.resize, frame, (args.process_width, int(h * scale)))
            gray = timed(stats, "bgr_to_gray", cv2.cvtColor, frame, cv2.COLOR_BGR2GRAY)
            faces = timed(stats, "face_detection", detector, gray, 0)

            if len(faces) > 0:
                faces_seen += 1
                face = max(faces, key=lambda rect: rect.width() * rect.height())
                shape = timed(stats, "landmark_detection", lambda: face_utils.shape_to_np(predictor(gray, face)))
                left_eye = shape[left_start:left_end]
                right_eye = shape[right_start:right_end]
                mouth = shape[mouth_start:mouth_end]
                timed(stats, "ear_mar_calculation", lambda: (
                    (eye_aspect_ratio(left_eye) + eye_aspect_ratio(right_eye)) / 2.0,
                    mouth_aspect_ratio(mouth),
                ))
                timed(stats, "head_pose", get_head_pose, shape, frame.shape)
                if model is not None:
                    timed(stats, "cnn_prediction", predict_eye_cnn_batch, model, closed_index, gray, [left_eye, right_eye])

            if not args.no_display:
                cv2.imshow("profile camera runtime", frame)
                key = timed(stats, "wait_key", cv2.waitKey, 1)
                if key & 0xFF == ord("q"):
                    break

            stats.add("total_frame", time.perf_counter() - frame_start)
            now = time.perf_counter()
            if now - window_started >= args.report_interval:
                print(f"window FPS={window_frames / max(1e-6, now - window_started):.1f} frames={frames}")
                window_started = now
                window_frames = 0
            if args.duration > 0 and now - started >= args.duration:
                break
    finally:
        cap.release()
        if not args.no_display:
            cv2.destroyAllWindows()

    print_summary(stats, frames, time.perf_counter() - started, faces_seen)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
