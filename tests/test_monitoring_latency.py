import threading
import time
import unittest
from unittest.mock import patch

from ai_runtime.monitoring_publisher import AsyncMonitoringPublisher
from backend.routes.monitoring_routes import stream_monitoring_frame
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


class MonitoringStreamTest(unittest.TestCase):
    def setUp(self):
        with monitoring_service._condition:
            monitoring_service._latest_snapshot = None
            monitoring_service._latest_frame = None
            monitoring_service._latest_frame_content_type = "image/jpeg"
            monitoring_service._frame_seq = 0

    def test_frame_updates_replace_previous_bytes(self):
        first = monitoring_service.update_monitoring_frame(b"first")
        second = monitoring_service.update_monitoring_frame(b"second")

        self.assertEqual(first["frame_seq"], 1)
        self.assertEqual(second["frame_seq"], 2)
        self.assertEqual(monitoring_service.get_latest_frame(), b"second")

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


if __name__ == "__main__":
    unittest.main()
