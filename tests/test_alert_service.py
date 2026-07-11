import sys
import types
import unittest
from pathlib import Path
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
sys.modules.setdefault("psycopg2", types.SimpleNamespace(connect=lambda **_kwargs: None))

from models.schemas import AlertCreate
from services import alert_service


class FakeCursor:
    def __init__(self):
        self.calls = []
        self._last_sql = ""

    def execute(self, sql, params=None):
        self._last_sql = sql
        self.calls.append((sql, params))

    def fetchone(self):
        if "FROM trips" in self._last_sql:
            return ("driver-1", "vehicle-1")
        return ("alert-1",)


class FakeConnection:
    def __init__(self):
        self.cursor_obj = FakeCursor()
        self.committed = False
        self.closed = False

    def cursor(self):
        return self.cursor_obj

    def commit(self):
        self.committed = True

    def close(self):
        self.closed = True


class AlertServiceTest(unittest.TestCase):
    def test_alert_create_accepts_legacy_method_alias(self):
        payload = AlertCreate(
            trip_id="trip-1",
            alert_type="drowsy_cnn",
            method="cnn_classifier",
        )

        self.assertEqual(payload.detection_method, "cnn_classifier")

    def test_create_alert_derives_driver_and_inserts_schema_alert(self):
        conn = FakeConnection()

        with patch.object(alert_service, "get_connection", return_value=conn):
            alert_id = alert_service.create_alert(
                trip_id="trip-1",
                alert_type="drowsy_cnn",
                detection_method="cnn_classifier",
                severity="critical",
                ear_value=0.21,
                consecutive_frame_count=22,
                cnn_confidence=0.93,
                cnn_label="closed",
                alarm_triggered=True,
                captured_frame_path="alert_frames/alert-1.jpg",
                latitude=10.762622,
                longitude=106.660172,
                alarm_audio_file="alarm.wav",
            )

        self.assertEqual(alert_id, "alert-1")
        self.assertTrue(conn.committed)
        self.assertTrue(conn.closed)

        select_sql, select_params = conn.cursor_obj.calls[0]
        insert_sql, insert_params = conn.cursor_obj.calls[1]

        self.assertIn("FROM trips", select_sql)
        self.assertEqual(select_params, ("trip-1",))
        self.assertIn("INSERT INTO alerts", insert_sql)
        self.assertIn("driver_id", insert_sql)
        self.assertIn("vehicle_id", insert_sql)
        self.assertIn("message", insert_sql)
        self.assertEqual(insert_params[0:5], ("trip-1", "driver-1", "vehicle-1", "critical", "drowsiness"))
        self.assertIn("CNN=closed:0.93", insert_params[-1])


if __name__ == "__main__":
    unittest.main()
