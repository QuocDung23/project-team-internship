from __future__ import annotations

import logging
import threading
import time
from typing import Any

import cv2

from detector_backend import post_monitoring_frame, post_monitoring_snapshot


LOGGER = logging.getLogger(__name__)


class AsyncMonitoringPublisher:
    def __init__(
        self,
        backend_url: str,
        *,
        interval_seconds: float = 0.2,
        snapshot_timeout: float = 0.5,
        frame_timeout: float = 0.25,
    ) -> None:
        self.backend_url = backend_url
        self.interval_seconds = max(0.05, float(interval_seconds))
        self.snapshot_timeout = snapshot_timeout
        self.frame_timeout = frame_timeout
        self._condition = threading.Condition()
        self._snapshot: dict[str, Any] | None = None
        self._frame = None
        self._closed = False
        self._last_publish_at = 0.0
        self._thread = threading.Thread(target=self._run, name="monitoring-publisher", daemon=True)
        self._thread.start()

    def publish(self, snapshot: dict[str, Any], frame: Any) -> None:
        now = time.monotonic()
        if now - self._last_publish_at < self.interval_seconds:
            return
        self._last_publish_at = now

        with self._condition:
            self._snapshot = dict(snapshot)
            self._frame = frame.copy()
            self._condition.notify()

    def close(self, timeout: float = 1.0) -> None:
        with self._condition:
            self._closed = True
            self._condition.notify()
        self._thread.join(timeout=max(0.0, timeout))

    def _run(self) -> None:
        while True:
            with self._condition:
                self._condition.wait_for(
                    lambda: self._closed or self._snapshot is not None,
                    timeout=1.0,
                )
                if self._closed:
                    return
                snapshot = self._snapshot
                frame = self._frame
                self._snapshot = None
                self._frame = None

            if snapshot is None or frame is None:
                continue

            try:
                post_monitoring_snapshot(
                    self.backend_url,
                    snapshot,
                    timeout=self.snapshot_timeout,
                )
                ok, encoded = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 75])
                if ok:
                    post_monitoring_frame(
                        self.backend_url,
                        encoded.tobytes(),
                        timeout=self.frame_timeout,
                    )
            except Exception as exc:
                LOGGER.debug("Monitoring publish failed: %s", exc)
