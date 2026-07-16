import threading
import time
import unittest
from unittest.mock import patch

from ai_runtime.monitoring_publisher import AsyncMonitoringPublisher
from backend.routes.monitoring_routes import (
    read_monitoring_snapshot,
    stream_monitoring_events,
    stream_monitoring_frame,
)
from backend.services import monitoring_service


class EncodedFrame:
    def __init__(self, payload: bytes):
        self._payload = payload

    def tobytes(self) -> bytes:
        return self._payload


class FakeFrame:
    def __init__(self, payload: bytes):
        self.payload = payload

    def copy(self):
        return FakeFrame(self.payload)


class DisconnectedRequest:
    async def is_disconnected(self):
        return True


def fake_imencode(_ext, frame, _params):
    return True, EncodedFrame(frame.payload)


class AsyncMonitoringPublisherTest(unittest.TestCase):
    def test_slow_snapshot_publish_does_not_block_frame_publish(self):
        snapshot_started = threading.Event()
        release_snapshot = threading.Event()
        frame_posted = threading.Event()
        posted_frames = []

        def post_snapshot(_backend_url, _snapshot, timeout):
            snapshot_started.set()
            release_snapshot.wait(timeout=1.0)

        def post_frame(_backend_url, frame_jpeg, timeout):
            posted_frames.append(frame_jpeg)
            frame_posted.set()

        with (
            patch("ai_runtime.monitoring_publisher.cv2.imencode", side_effect=fake_imencode),
            patch("ai_runtime.monitoring_publisher.post_monitoring_snapshot", side_effect=post_snapshot),
            patch("ai_runtime.monitoring_publisher.post_monitoring_frame", side_effect=post_frame),
        ):
            publisher = AsyncMonitoringPublisher("http://backend", frame_fps=1000, jpeg_quality=70)
            try:
                publisher.publish({"timestamp": 1.0}, FakeFrame(b"latest-frame"))

                self.assertTrue(snapshot_started.wait(timeout=0.5))
                self.assertTrue(frame_posted.wait(timeout=0.5))
                self.assertEqual(posted_frames, [b"latest-frame"])
            finally:
                release_snapshot.set()
                publisher.close(timeout=1.0)

    def test_rapid_publishes_keep_latest_frame(self):
        newest_posted = threading.Event()
        posted_frames = []

        def post_frame(_backend_url, frame_jpeg, timeout):
            posted_frames.append(frame_jpeg)
            if frame_jpeg == b"frame-9":
                newest_posted.set()
            time.sleep(0.02)

        with (
            patch("ai_runtime.monitoring_publisher.cv2.imencode", side_effect=fake_imencode),
            patch("ai_runtime.monitoring_publisher.post_monitoring_snapshot", return_value={}),
            patch("ai_runtime.monitoring_publisher.post_monitoring_frame", side_effect=post_frame),
        ):
            publisher = AsyncMonitoringPublisher("http://backend", frame_fps=1000, jpeg_quality=70)
            try:
                for index in range(10):
                    publisher.publish({"timestamp": float(index)}, FakeFrame(f"frame-{index}".encode("ascii")))

                self.assertTrue(newest_posted.wait(timeout=1.0))
                self.assertLess(len(posted_frames), 10)
                self.assertEqual(posted_frames[-1], b"frame-9")
            finally:
                publisher.close(timeout=1.0)

    def test_close_stops_workers(self):
        with (
            patch("ai_runtime.monitoring_publisher.cv2.imencode", side_effect=fake_imencode),
            patch("ai_runtime.monitoring_publisher.post_monitoring_snapshot", return_value={}),
            patch("ai_runtime.monitoring_publisher.post_monitoring_frame", return_value={}),
        ):
            publisher = AsyncMonitoringPublisher("http://backend")
            publisher.close(timeout=1.0)

        self.assertFalse(publisher._frame_thread.is_alive())
        self.assertFalse(publisher._snapshot_thread.is_alive())

    def test_frame_publish_failures_warn_with_throttle(self):
        post_count = 0
        first_posted = threading.Event()
        second_posted = threading.Event()

        def post_frame(_backend_url, _frame_jpeg, timeout):
            nonlocal post_count
            post_count += 1
            if post_count == 1:
                first_posted.set()
            if post_count == 2:
                second_posted.set()
            raise TimeoutError("frame timeout")

        with (
            patch("ai_runtime.monitoring_publisher.cv2.imencode", side_effect=fake_imencode),
            patch("ai_runtime.monitoring_publisher.post_monitoring_snapshot", return_value={}),
            patch("ai_runtime.monitoring_publisher.post_monitoring_frame", side_effect=post_frame),
            self.assertLogs("ai_runtime.monitoring_publisher", level="WARNING") as logs,
        ):
            publisher = AsyncMonitoringPublisher("http://backend", frame_fps=1000, frame_timeout=0.25)
            try:
                publisher.publish({"timestamp": 1.0}, FakeFrame(b"frame-1"))
                self.assertTrue(first_posted.wait(timeout=1.0))
                publisher.publish({"timestamp": 2.0}, FakeFrame(b"frame-2"))
                self.assertTrue(second_posted.wait(timeout=1.0))
            finally:
                publisher.close(timeout=1.0)

        self.assertEqual(len(logs.output), 1)
        self.assertIn("Monitoring frame publish failed", logs.output[0])
        self.assertIn("backend_url=http://backend", logs.output[0])
        self.assertIn("timeout=0.25s", logs.output[0])
        self.assertIn("failures=1", logs.output[0])


class MonitoringStreamTest(unittest.TestCase):
    def setUp(self):
        with monitoring_service._condition:
            monitoring_service._latest_snapshot = None
            monitoring_service._latest_frame = None
            monitoring_service._latest_frame_content_type = "image/jpeg"
            monitoring_service._frame_seq = 0
            monitoring_service._snapshot_seq = 0
            monitoring_service._snapshot_received_at = None
            monitoring_service._frame_received_at = None

    def test_frame_updates_replace_previous_bytes(self):
        first = monitoring_service.update_monitoring_frame(b"first")
        second = monitoring_service.update_monitoring_frame(b"second")

        self.assertEqual(first["frame_seq"], 1)
        self.assertEqual(second["frame_seq"], 2)
        self.assertEqual(monitoring_service.get_latest_frame(), b"second")

    def test_snapshot_includes_fresh_frame_metadata(self):
        with patch("backend.services.monitoring_service.time.time", side_effect=[100.0, 101.0]):
            frame_result = monitoring_service.update_monitoring_frame(b"first")
            snapshot = monitoring_service.update_monitoring_snapshot(
                {
                    "timestamp": 101.0,
                    "ear": 0.3,
                    "mar": 0.4,
                    "pitch": 1.0,
                    "dws_score": 0,
                    "eyes_open": True,
                    "mouth_closed": True,
                    "face_detected": True,
                    "cnn_enabled": False,
                }
            )

        self.assertEqual(frame_result["frame_seq"], 1)
        self.assertTrue(snapshot["frame_available"])
        self.assertEqual(snapshot["frame_timestamp"], 1)
        self.assertEqual(snapshot["snapshot_received_at"], 101.0)
        self.assertEqual(snapshot["snapshot_seq"], 1)
        self.assertEqual(snapshot["frame_received_at"], 100.0)
        self.assertEqual(snapshot["snapshot_age_seconds"], 0.0)
        self.assertEqual(snapshot["age_seconds"], 0.0)
        self.assertEqual(snapshot["frame_age_seconds"], 1.0)
        self.assertEqual(snapshot["health"], "online")
        self.assertFalse(snapshot["stale"])

    def test_snapshot_marks_stale_when_frame_is_old(self):
        with patch("backend.services.monitoring_service.time.time", side_effect=[100.0, 101.0]):
            monitoring_service.update_monitoring_frame(b"first")
            monitoring_service.update_monitoring_snapshot(
                {
                    "timestamp": 101.0,
                    "ear": 0.3,
                    "mar": 0.4,
                    "pitch": 1.0,
                    "dws_score": 0,
                    "eyes_open": True,
                    "mouth_closed": True,
                    "face_detected": True,
                    "cnn_enabled": False,
                }
            )

        with patch("backend.services.monitoring_service.time.time", return_value=105.0):
            snapshot = monitoring_service.get_monitoring_snapshot()

        self.assertIsNotNone(snapshot)
        self.assertEqual(snapshot["frame_age_seconds"], 5.0)
        self.assertTrue(snapshot["stale"])
        self.assertEqual(snapshot["health"], "stale")

    def test_mjpeg_stream_emits_newest_frame_sequence(self):
        monitoring_service.update_monitoring_frame(b"first")
        stream = monitoring_service.iter_mjpeg_stream(target_fps=1000)

        first_chunk = next(stream)
        monitoring_service.update_monitoring_frame(b"second")
        monitoring_service.update_monitoring_frame(b"third")
        second_chunk = next(stream)

        self.assertIn(b"first", first_chunk)
        self.assertIn(b"third", second_chunk)
        self.assertNotIn(b"second", second_chunk)

    def test_stream_response_has_no_cache_headers(self):
        response = stream_monitoring_frame()

        self.assertEqual(response.headers["cache-control"], "no-store, no-cache, must-revalidate, max-age=0")
        self.assertEqual(response.headers["pragma"], "no-cache")
        self.assertEqual(response.headers["expires"], "0")

    def test_event_stream_response_has_no_cache_headers(self):
        response = stream_monitoring_events(DisconnectedRequest())

        self.assertEqual(response.media_type, "text/event-stream")
        self.assertEqual(response.headers["cache-control"], "no-store, no-cache, must-revalidate, max-age=0")
        self.assertEqual(response.headers["pragma"], "no-cache")
        self.assertEqual(response.headers["expires"], "0")

    def test_snapshot_route_reports_offline_when_detector_has_not_published(self):
        snapshot = read_monitoring_snapshot()

        self.assertFalse(snapshot["available"])
        self.assertTrue(snapshot["stale"])
        self.assertEqual(snapshot["health"], "offline")
        self.assertIsNone(snapshot["age_seconds"])

    def test_snapshot_event_stream_emits_latest_snapshot(self):
        stream = monitoring_service.iter_monitoring_snapshots()
        monitoring_service.update_monitoring_snapshot(
            {
                "timestamp": 101.0,
                "ear": 0.3,
                "mar": 0.4,
                "pitch": 1.0,
                "dws_score": 0,
                "eyes_open": True,
                "mouth_closed": True,
                "face_detected": True,
                "cnn_enabled": False,
            }
        )

        snapshot = next(stream)

        self.assertTrue(snapshot["available"])
        self.assertEqual(snapshot["snapshot_seq"], 1)
        self.assertEqual(snapshot["dws_score"], 0)

    def test_snapshot_event_stream_does_not_yield_while_lock_is_held(self):
        stream = monitoring_service.iter_monitoring_snapshots()
        monitoring_service.update_monitoring_snapshot(
            {
                "timestamp": 101.0,
                "ear": 0.3,
                "mar": 0.4,
                "pitch": 1.0,
                "dws_score": 0,
                "eyes_open": True,
                "mouth_closed": True,
                "face_detected": True,
                "cnn_enabled": False,
            }
        )

        next(stream)

        self.assertTrue(monitoring_service._condition.acquire(blocking=False))
        monitoring_service._condition.release()


if __name__ == "__main__":
    unittest.main()
