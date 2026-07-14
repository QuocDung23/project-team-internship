from __future__ import annotations

import argparse
import os
import time

import cv2


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


def run_camera(index: int, args: argparse.Namespace) -> bool:
    cap, actual_index, actual_backend = open_first_available_camera(index, args.backend)
    configure_camera(cap, args.width, args.height, args.fps, args.buffer_size)
    if not cap.isOpened():
        print(f"camera {index}: could not open backend={args.backend}")
        return False

    actual_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    actual_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    actual_fps = cap.get(cv2.CAP_PROP_FPS)
    print(
        f"camera {index}: opened actual_index={actual_index} backend={actual_backend} "
        f"resolution={actual_w}x{actual_h} reported_fps={actual_fps:.1f} buffer={args.buffer_size}"
    )

    frames = 0
    total_frames = 0
    started = time.perf_counter()
    window_started = started
    try:
        while True:
            ok, frame = cap.read()
            now = time.perf_counter()
            if not ok or frame is None:
                print(f"camera {index}: frame read failed")
                break

            frames += 1
            total_frames += 1
            if not args.no_display:
                cv2.imshow(f"raw camera {index}", frame)
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    break

            if now - window_started >= args.report_interval:
                fps = frames / max(1e-6, now - window_started)
                print(f"camera {index}: raw/display FPS={fps:.1f} frames={total_frames}")
                frames = 0
                window_started = now

            if args.duration > 0 and now - started >= args.duration:
                break
    finally:
        cap.release()
        if not args.no_display:
            cv2.destroyWindow(f"raw camera {index}")

    elapsed = time.perf_counter() - started
    print(f"camera {index}: average FPS={total_frames / max(1e-6, elapsed):.1f} over {elapsed:.1f}s")
    return True


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Raw OpenCV camera latency/FPS test without AI.")
    parser.add_argument("--camera", type=int, default=None, help="Camera index. When omitted, tests 0 and 1.")
    parser.add_argument("--backend", choices=["any", "dshow", "msmf"], default=("dshow" if os.name == "nt" else "any"))
    parser.add_argument("--width", type=int, default=640)
    parser.add_argument("--height", type=int, default=480)
    parser.add_argument("--fps", type=float, default=30.0, help="Requested camera FPS hint; 0 leaves default.")
    parser.add_argument("--buffer-size", type=int, default=1)
    parser.add_argument("--duration", type=float, default=20.0, help="Seconds to run; 0 means until Q/Ctrl+C.")
    parser.add_argument("--report-interval", type=float, default=5.0)
    parser.add_argument("--no-display", action="store_true", help="Measure capture only without cv2.imshow.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    indexes = [args.camera] if args.camera is not None else [0, 1]
    any_opened = False
    for index in indexes:
        any_opened = run_camera(int(index), args) or any_opened
    return 0 if any_opened else 1


if __name__ == "__main__":
    raise SystemExit(main())
