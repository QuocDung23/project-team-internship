from __future__ import annotations

import logging
import threading
import time
from typing import Any

import cv2

from detector_backend import post_monitoring_frame, post_monitoring_snapshot


LOGGER = logging.getLogger(__name__)
WARN_INTERVAL_SECONDS = 5.0


class AsyncMonitoringPublisher:
    def __init__(
        self,
        backend_url: str,
        *,
        interval_seconds: float | None = None,
        frame_fps: float = 10.0,
        jpeg_quality: int = 70,
        snapshot_timeout: float = 0.5,
        frame_timeout: float = 0.25,
    ) -> None:
        self.backend_url = backend_url
        if interval_seconds is not None:
            frame_fps = 1.0 / max(0.05, float(interval_seconds))
        self.frame_interval_seconds = 1.0 / max(1.0, float(frame_fps))
        self.snapshot_interval_seconds = max(0.2, self.frame_interval_seconds)
        self.jpeg_quality = max(1, min(100, int(jpeg_quality)))
        self.snapshot_timeout = snapshot_timeout
        self.frame_timeout = frame_timeout
        self._frame_failures = 0
        self._snapshot_failures = 0
        self._last_frame_warning_at = 0.0
        self._last_snapshot_warning_at = 0.0
        self._frame_condition = threading.Condition()
        self._snapshot_condition = threading.Condition()
        self._snapshot: dict[str, Any] | None = None
        self._frame = None
        self._closed = False
        self._closed_event = threading.Event()
        self._frame_thread = threading.Thread(target=self._run_frames, name="monitoring-frame-publisher", daemon=True)
        self._snapshot_thread = threading.Thread(
            target=self._run_snapshots,
            name="monitoring-snapshot-publisher",
            daemon=True,
        )
        self._frame_thread.start()
        self._snapshot_thread.start()

    def _warn_publish_failure(
        self,
        *,
        kind: str,
        exc: Exception,
        timeout: float,
        failures: int,
        now: float,
    ) -> bool:
        last_warning_at = self._last_frame_warning_at if kind == "frame" else self._last_snapshot_warning_at
        if now - last_warning_at < WARN_INTERVAL_SECONDS:
            return False

        if kind == "frame":
            self._last_frame_warning_at = now
        else:
            self._last_snapshot_warning_at = now

        LOGGER.warning(
            "Monitoring %s publish failed: backend_url=%s timeout=%.2fs failures=%d error=%s",
            kind,
            self.backend_url,
            timeout,
            failures,
            exc,
        )
        return True

    def publish(self, snapshot: dict[str, Any], frame: Any) -> None:
        with self._frame_condition:
            self._frame = frame.copy()
            self._frame_condition.notify()
        with self._snapshot_condition:
            self._snapshot = dict(snapshot)
            self._snapshot_condition.notify()

    def close(self, timeout: float = 1.0) -> None:
        self._closed_event.set()
        with self._frame_condition:
            self._closed = True
            self._frame_condition.notify()
        with self._snapshot_condition:
            self._snapshot_condition.notify()
        join_timeout = max(0.0, timeout)
        self._frame_thread.join(timeout=join_timeout)
        self._snapshot_thread.join(timeout=join_timeout)

    def _sleep_interval(self, started_at: float, interval_seconds: float) -> None:
        remaining = interval_seconds - (time.monotonic() - started_at)
        if remaining > 0:
            self._closed_event.wait(timeout=remaining)

    def _run_frames(self) -> None:
        while True:
            with self._frame_condition:
                self._frame_condition.wait_for(
                    lambda: self._closed or self._frame is not None,
                    timeout=1.0,
                )
                if self._closed:
                    return
                frame = self._frame
                self._frame = None

            if frame is None:
                continue

            started_at = time.monotonic()
            try:
                ok, encoded = cv2.imencode(
                    ".jpg",
                    frame,
                    [int(cv2.IMWRITE_JPEG_QUALITY), self.jpeg_quality],
                )
                if ok:
                    post_monitoring_frame(
                        self.backend_url,
                        encoded.tobytes(),
                        timeout=self.frame_timeout,
                    )
                    self._frame_failures = 0
            except Exception as exc:
                self._frame_failures += 1
                self._warn_publish_failure(
                    kind="frame",
                    exc=exc,
                    timeout=self.frame_timeout,
                    failures=self._frame_failures,
                    now=time.monotonic(),
                )
            self._sleep_interval(started_at, self.frame_interval_seconds)

    def _run_snapshots(self) -> None:
        while True:
            with self._snapshot_condition:
                self._snapshot_condition.wait_for(
                    lambda: self._closed or self._snapshot is not None,
                    timeout=1.0,
                )
                if self._closed:
                    return
                snapshot = self._snapshot
                self._snapshot = None

            if snapshot is None:
                continue

            started_at = time.monotonic()
            try:
                post_monitoring_snapshot(
                    self.backend_url,
                    snapshot,
                    timeout=self.snapshot_timeout,
                )
                self._snapshot_failures = 0
            except Exception as exc:
                self._snapshot_failures += 1
                self._warn_publish_failure(
                    kind="snapshot",
                    exc=exc,
                    timeout=self.snapshot_timeout,
                    failures=self._snapshot_failures,
                    now=time.monotonic(),
                )
            self._sleep_interval(started_at, self.snapshot_interval_seconds)
