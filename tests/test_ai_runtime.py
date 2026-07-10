import json
import tempfile
import unittest
from contextlib import redirect_stdout
from io import StringIO
from pathlib import Path

from ai_runtime.events import build_safety_event
from ai_runtime.publishers import AsyncEventPublisher, ConsoleJsonPublisher, LocalJsonlPublisher


class AiRuntimeIntegrationBoundaryTest(unittest.TestCase):
    def test_safety_event_uses_backend_friendly_contract(self):
        event = build_safety_event(
            event_type="drowsiness_detected",
            severity="high",
            confidence=0.876,
            duration_ms=2300,
            trip_id=None,
            details={"detection_method": "ear_dlib", "consecutive_frame_count": 20},
        )

        self.assertIn("event_id", event)
        self.assertEqual(event["event_type"], "drowsiness_detected")
        self.assertEqual(event["severity"], "high")
        self.assertEqual(event["source"], "ai_camera")
        self.assertEqual(event["confidence"], 0.88)
        self.assertEqual(event["duration_ms"], 2300)
        self.assertEqual(event["details"]["detection_method"], "ear_dlib")

    def test_local_jsonl_publisher_appends_event(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "events.jsonl"
            event = build_safety_event("yawning_detected", "medium", 1.0)

            LocalJsonlPublisher(path).publish(event)

            rows = [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines()]
            self.assertEqual(rows[0]["event_type"], "yawning_detected")

    def test_async_publisher_does_not_block_caller_on_file_write(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "events.jsonl"
            publisher = AsyncEventPublisher(LocalJsonlPublisher(path))
            event = build_safety_event("drowsiness_detected", "high", 0.9)

            publisher.publish(event)
            publisher.close(timeout=2.0)

            rows = [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines()]
            self.assertEqual(rows[0]["event_type"], "drowsiness_detected")

    def test_console_publisher_prints_json(self):
        event = build_safety_event("head_nodding_detected", "medium", 1.0)
        publisher = ConsoleJsonPublisher()

        # Smoke test: publisher should not require backend dependencies or detector modules.
        with redirect_stdout(StringIO()) as output:
            publisher.publish(event)
        self.assertIn("head_nodding_detected", output.getvalue())


if __name__ == "__main__":
    unittest.main()
