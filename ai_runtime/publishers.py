from __future__ import annotations

import json
import queue
import threading
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
    """Future integration boundary. Intentionally unused in the standalone runtime."""

    def publish(self, event: dict) -> None:
        raise RuntimeError("Backend publishing is not enabled for the standalone AI runtime.")
