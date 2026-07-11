from __future__ import annotations

import json
import logging
import queue
import threading
import time
import urllib.error
import urllib.request
from abc import ABC, abstractmethod
from pathlib import Path


class EventPublisher(ABC):
    @abstractmethod
    def publish(self, event: dict) -> None:
        raise NotImplementedError


class ConsoleJsonPublisher(EventPublisher):
    def publish(self, event: dict) -> None:
        print(json.dumps(event, ensure_ascii=False, sort_keys=True))


class LocalJsonlPublisher(EventPublisher):
    def __init__(self, path: Path):
        self._path = Path(path)
        self._path.parent.mkdir(parents=True, exist_ok=True)

    def publish(self, event: dict) -> None:
        with self._path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(event, ensure_ascii=False, sort_keys=True) + "\n")


class CompositePublisher(EventPublisher):
    def __init__(self, publishers: list[EventPublisher]):
        self._publishers = publishers

    def publish(self, event: dict) -> None:
        for publisher in self._publishers:
            publisher.publish(event)


class AsyncEventPublisher(EventPublisher):
    def __init__(self, publisher: EventPublisher, max_queue_size: int = 100):
        self._publisher = publisher
        self._queue: queue.Queue[dict | None] = queue.Queue(maxsize=max_queue_size)
        self._thread = threading.Thread(target=self._run, name="SafetyEventPublisher", daemon=True)
        self._thread.start()

    def publish(self, event: dict) -> None:
        try:
            self._queue.put_nowait(event)
        except queue.Full:
            # Keep camera capture real-time; dropping local integration events is preferable to blocking frames.
            pass

    def close(self, timeout: float = 1.0) -> None:
        try:
            self._queue.put_nowait(None)
        except queue.Full:
            return
        self._thread.join(timeout=timeout)

    def _run(self) -> None:
        while True:
            event = self._queue.get()
            try:
                if event is None:
                    return
                self._publisher.publish(event)
            finally:
                self._queue.task_done()


class BackendApiPublisher(EventPublisher):
    def __init__(
        self,
        base_url: str,
        auth_token: str = "",
        timeout: float = 2.0,
        warn_interval_sec: float = 60.0,
        logger: logging.Logger | None = None,
    ):
        self._endpoint = self._build_endpoint(base_url)
        self._auth_token = auth_token
        self._timeout = timeout
        self._warn_interval_sec = warn_interval_sec
        self._last_warning_at = 0.0
        self._logger = logger or logging.getLogger(__name__)

    def publish(self, event: dict) -> None:
        body = json.dumps(event, ensure_ascii=False).encode("utf-8")
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        if self._auth_token:
            headers["Authorization"] = f"Bearer {self._auth_token}"

        request = urllib.request.Request(self._endpoint, data=body, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(request, timeout=self._timeout) as response:
                response.read()
        except urllib.error.HTTPError as exc:
            self._warn_once(f"HTTP {exc.code}")
        except Exception as exc:
            self._warn_once(exc.__class__.__name__)

    @staticmethod
    def _build_endpoint(base_url: str) -> str:
        cleaned = base_url.strip().rstrip("/")
        if not cleaned:
            raise ValueError("base_url is required")
        if cleaned.endswith("/safety-events/ingest"):
            return cleaned
        if cleaned.endswith("/api/v1"):
            return f"{cleaned}/safety-events/ingest"
        return f"{cleaned}/api/v1/safety-events/ingest"

    def _warn_once(self, reason: str) -> None:
        now = time.monotonic()
        if now - self._last_warning_at < self._warn_interval_sec:
            return
        self._last_warning_at = now
        self._logger.warning("SafetyEvent backend publish failed: %s", reason)
