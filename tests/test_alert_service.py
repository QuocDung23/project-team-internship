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
        self.fetchone_results = []
        self.fetchall_results = []

    def execute(self, sql, params=None):
        self._last_sql = sql
        self.calls.append((sql, params))

    def fetchone(self):
        if self.fetchone_results:
            return self.fetchone_results.pop(0)
        if "FROM trips" in self._last_sql:
            return ("driver-1", "vehicle-1")
        return ("alert-1",)

    def fetchall(self):
        return self.fetchall_results


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

    def test_create_alert_rejects_yawning_alert_type(self):
        with self.assertRaises(ValueError):
            alert_service.create_alert(
                trip_id="trip-1",
                alert_type="yawning_detected",
                detection_method="mar_dlib",
            )

    def test_acknowledge_alert_marks_alert_acknowledged(self):
        conn = FakeConnection()
        conn.cursor_obj.fetchone_results = [
            ("alert-1",),
            (
                "alert-1",
                "trip-1",
                "driver-1",
                "drowsiness",
                "warning",
                "cnn_classifier",
                0.2,
                None,
                0.7,
                "yawn",
                None,
                None,
                None,
                False,
                None,
                True,
                "2026-07-05T10:21:35Z",
                "2026-07-05T10:21:30Z",
                "2026-07-05T10:21:31Z",
            ),
        ]

        with patch.object(alert_service, "get_connection", return_value=conn):
            alert = alert_service.acknowledge_alert(
                "alert-1",
                current_user={"user_id": "admin-1", "role": "admin", "email": "admin@example.com"},
            )

        update_sql, update_params = conn.cursor_obj.calls[0]
        select_sql, select_params = conn.cursor_obj.calls[1]

        self.assertEqual(alert["alert_id"], "alert-1")
        self.assertTrue(alert["acknowledged"])
        self.assertTrue(conn.committed)
        self.assertIn("UPDATE alerts", update_sql)
        self.assertIn("acknowledged_at", update_sql)
        self.assertEqual(update_params, ("admin-1", "alert-1"))
        self.assertIn("FROM alerts a", select_sql)
        self.assertEqual(select_params, ("alert-1",))

    def test_get_alerts_driver_filter_includes_trip_owned_alerts(self):
        conn = FakeConnection()

        with patch.object(alert_service, "get_connection", return_value=conn):
            alerts = alert_service.get_alerts(
                driver_id="driver-1",
                current_user={"user_id": "admin-1", "role": "admin", "email": "admin@example.com"},
            )

        select_sql, select_params = conn.cursor_obj.calls[0]

        self.assertEqual(alerts, [])
        self.assertIn("a.driver_id=%s", select_sql)
        self.assertIn("trip_assignments", select_sql)
        self.assertIn("created_by", select_sql)
        self.assertIn("users", select_sql)
        self.assertIn("drivers", select_sql)
        self.assertIn("driver-1", select_params)

    def test_get_alerts_includes_resolved_driver_identity(self):
        conn = FakeConnection()
        conn.cursor_obj.fetchall_results = [
            (
                "alert-1",
                "trip-1",
                None,
                "drowsiness",
                "warning",
                "cnn_classifier",
                0.2,
                None,
                0.7,
                "closed",
                None,
                None,
                None,
                False,
                None,
                False,
                None,
                "2026-07-05T10:21:30Z",
                "2026-07-05T10:21:31Z",
                "Driver One",
                "driver@example.com",
                "LIC-001",
            ),
        ]

        with patch.object(alert_service, "get_connection", return_value=conn):
            alerts = alert_service.get_alerts(
                trip_id="trip-1",
                current_user={"user_id": "admin-1", "role": "admin", "email": "admin@example.com"},
            )

        select_sql, _select_params = conn.cursor_obj.calls[0]

        self.assertIn("driver_identity", select_sql)
        self.assertEqual(alerts[0]["driver_name"], "Driver One")
        self.assertEqual(alerts[0]["driver_email"], "driver@example.com")
        self.assertEqual(alerts[0]["license_number"], "LIC-001")


if __name__ == "__main__":
    unittest.main()
