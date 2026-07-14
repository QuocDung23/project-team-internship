import json
import tempfile
import threading
import unittest
from contextlib import redirect_stdout
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from io import StringIO
from pathlib import Path

from ai_runtime.events import build_safety_event
from ai_runtime.publishers import (
    AsyncEventPublisher,
    BackendApiPublisher,
    ConsoleJsonPublisher,
    LocalJsonlPublisher,
)


class RecordingHandler(BaseHTTPRequestHandler):
    requests = []
    status_code = 201

    def do_POST(self):
        body = self.rfile.read(int(self.headers.get("Content-Length", "0")))
        self.__class__.requests.append(
            {
                "path": self.path,
                "authorization": self.headers.get("Authorization"),
                "payload": json.loads(body.decode("utf-8")),
            }
        )
        self.send_response(self.__class__.status_code)
        self.end_headers()
        self.wfile.write(b"{}")

    def log_message(self, format, *args):
        return


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

    def test_backend_api_publisher_posts_to_ingest_endpoint_with_bearer_token(self):
        RecordingHandler.requests = []
        RecordingHandler.status_code = 201
        server = ThreadingHTTPServer(("127.0.0.1", 0), RecordingHandler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        self.addCleanup(server.server_close)
        self.addCleanup(server.shutdown)

        event = build_safety_event("drowsiness_detected", "high", 0.9)
        publisher = BackendApiPublisher(
            f"http://127.0.0.1:{server.server_port}",
            auth_token="unit-token",
        )

        publisher.publish(event)

        self.assertEqual(len(RecordingHandler.requests), 1)
        self.assertEqual(RecordingHandler.requests[0]["path"], "/api/v1/safety-events/ingest")
        self.assertEqual(RecordingHandler.requests[0]["authorization"], "Bearer unit-token")
        self.assertEqual(RecordingHandler.requests[0]["payload"]["event_id"], event["event_id"])

    def test_backend_api_publisher_swallows_backend_failures(self):
        RecordingHandler.requests = []
        RecordingHandler.status_code = 500
        server = ThreadingHTTPServer(("127.0.0.1", 0), RecordingHandler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        self.addCleanup(server.server_close)
        self.addCleanup(server.shutdown)

        event = build_safety_event("drowsiness_detected", "high", 0.9)
        publisher = BackendApiPublisher(
            f"http://127.0.0.1:{server.server_port}/api/v1",
            warn_interval_sec=0.0,
        )

        with self.assertLogs("ai_runtime.publishers", level="WARNING") as logs:
            publisher.publish(event)

        self.assertEqual(len(RecordingHandler.requests), 1)
        self.assertEqual(RecordingHandler.requests[0]["path"], "/api/v1/safety-events/ingest")
        self.assertIn("SafetyEvent backend publish failed: HTTP 500", logs.output[0])


if __name__ == "__main__":
    unittest.main()
