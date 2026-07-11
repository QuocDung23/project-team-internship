import json
import tempfile
import unittest
import urllib.error
from pathlib import Path
from unittest.mock import patch

import detector_backend


class FakeResponse:
    status = 200

    def __init__(self, body=b'{"ok": true}'):
        self._body = body

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def read(self):
        return self._body


class DetectorBackendTest(unittest.TestCase):
    def test_monitoring_posts_use_api_prefix_from_backend_root(self):
        requests = []

        def fake_urlopen(req, timeout):
            requests.append(
                {
                    "url": req.full_url,
                    "data": req.data,
                    "content_type": req.headers.get("Content-type"),
                }
            )
            return FakeResponse()

        with patch.object(detector_backend.urllib.request, "urlopen", side_effect=fake_urlopen):
            detector_backend.post_monitoring_frame(
                "http://127.0.0.1:8000",
                b"jpeg-bytes",
                timeout=0.1,
            )
            detector_backend.post_monitoring_snapshot(
                "http://127.0.0.1:8000",
                {"timestamp": 1.0, "ear": 0.3, "mar": 0.1, "pitch": 0.0, "dws_score": 100},
                timeout=0.1,
            )

        self.assertEqual(requests[0]["url"], "http://127.0.0.1:8000/api/v1/monitoring/frame")
        self.assertEqual(requests[0]["data"], b"jpeg-bytes")
        self.assertEqual(requests[0]["content_type"], "image/jpeg")
        self.assertEqual(requests[1]["url"], "http://127.0.0.1:8000/api/v1/monitoring/snapshot")

    def test_monitoring_posts_do_not_duplicate_existing_api_prefix(self):
        requests = []

        def fake_urlopen(req, timeout):
            requests.append(req.full_url)
            return FakeResponse()

        with patch.object(detector_backend.urllib.request, "urlopen", side_effect=fake_urlopen):
            detector_backend.post_monitoring_frame(
                "http://127.0.0.1:8000/api/v1",
                b"jpeg-bytes",
                timeout=0.1,
            )

        self.assertEqual(requests[0], "http://127.0.0.1:8000/api/v1/monitoring/frame")

    def test_failed_post_appends_jsonl_outbox(self):
        with tempfile.TemporaryDirectory() as tmp:
            outbox = Path(tmp) / "alerts.jsonl"

            with patch.object(
                detector_backend.urllib.request,
                "urlopen",
                side_effect=urllib.error.URLError("offline"),
            ):
                posted = detector_backend.post_alert_or_queue(
                    "http://127.0.0.1:8000",
                    {"trip_id": "trip-1", "alert_type": "drowsy_cnn"},
                    timeout=0.1,
                    outbox_path=str(outbox),
                )

            self.assertFalse(posted)
            rows = [json.loads(line) for line in outbox.read_text(encoding="utf-8").splitlines()]
            self.assertEqual(rows[0]["trip_id"], "trip-1")
            self.assertEqual(rows[0]["alert_type"], "drowsy_cnn")

    def test_successful_post_flushes_existing_outbox_fifo(self):
        with tempfile.TemporaryDirectory() as tmp:
            outbox = Path(tmp) / "alerts.jsonl"
            outbox.write_text(
                json.dumps({"trip_id": "trip-1", "alert_type": "eyes_closed"}) + "\n",
                encoding="utf-8",
            )
            posted_payloads = []

            def fake_urlopen(req, timeout):
                posted_payloads.append(json.loads(req.data.decode("utf-8")))
                return FakeResponse()

            with patch.object(detector_backend.urllib.request, "urlopen", side_effect=fake_urlopen):
                posted = detector_backend.post_alert_or_queue(
                    "http://127.0.0.1:8000",
                    {"trip_id": "trip-1", "alert_type": "head_nod"},
                    timeout=0.1,
                    outbox_path=str(outbox),
                )

            self.assertTrue(posted)
            self.assertEqual([p["alert_type"] for p in posted_payloads], ["head_nod", "eyes_closed"])
            self.assertEqual(outbox.read_text(encoding="utf-8"), "")

    def test_fetch_trip_settings_reads_backend_json(self):
        body = json.dumps({"ear_threshold": 0.26, "ear_consec_frames": 12}).encode("utf-8")

        with patch.object(detector_backend.urllib.request, "urlopen", return_value=FakeResponse(body)):
            settings = detector_backend.fetch_trip_settings(
                "http://127.0.0.1:8000",
                "trip-1",
                timeout=0.1,
            )

        self.assertEqual(settings["ear_threshold"], 0.26)
        self.assertEqual(settings["ear_consec_frames"], 12)


if __name__ == "__main__":
    unittest.main()
