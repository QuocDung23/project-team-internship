import sys
import types
import unittest
from pathlib import Path
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
sys.modules.setdefault("psycopg2", types.SimpleNamespace(connect=lambda **_kwargs: None))

from services import setting_service, trip_service


class FakeCursor:
    def __init__(self):
        self.calls = []
        self._last_sql = ""

    def execute(self, sql, params=None):
        self._last_sql = sql
        self.calls.append((sql, params))

    def fetchone(self):
        if "COUNT(*)" in self._last_sql and "alerts" in self._last_sql:
            return (4, 1)
        if "FROM settings" in self._last_sql:
            return (
                "setting-1",
                "global",
                None,
                0.3,
                15,
                0.8,
                "ear_dlib",
                "alarm.wav",
                10,
                True,
                5,
                0,
                640,
                480,
                3,
                8,
                85,
                60,
                {},
            )
        return ("trip-1",)

    def fetchall(self):
        return []


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


class TripAndSettingsServiceTest(unittest.TestCase):
    def test_end_trip_uses_alerts_and_schema_trip_columns(self):
        conn = FakeConnection()

        with patch.object(trip_service, "get_connection", return_value=conn):
            result = trip_service.end_trip("trip-1")

        sql = "\n".join(call[0] for call in conn.cursor_obj.calls)
        self.assertIn("FROM alerts", sql)
        self.assertIn("UPDATE trips", sql)
        self.assertIn("end_time=NOW()", sql.replace(" ", ""))
        self.assertIn("safety_score", sql)
        self.assertIn("safety_grade", sql)
        self.assertNotIn("detection_events", sql)
        self.assertNotIn("actual_end_time", sql)
        self.assertNotIn("safety_rating", sql)
        self.assertEqual(result["alerts"], 4)
        self.assertEqual(result["critical_alerts"], 1)
        self.assertEqual(result["safety_grade"], "B")
        self.assertTrue(conn.committed)
        self.assertTrue(conn.closed)

    def test_settings_service_reads_and_updates_settings_table(self):
        conn = FakeConnection()

        with patch.object(setting_service, "get_connection", return_value=conn):
            current = setting_service.get_global_settings()
            result = setting_service.update_global_settings({"ear_threshold": 0.25})

        sql = "\n".join(call[0] for call in conn.cursor_obj.calls)
        self.assertIn("FROM settings", sql)
        self.assertIn("UPDATE settings", sql)
        self.assertNotIn("detection_settings", sql)
        self.assertEqual(current["ear_threshold"], 0.3)
        self.assertEqual(result["ear_threshold"], 0.3)
        self.assertTrue(conn.committed)
        self.assertTrue(conn.closed)


if __name__ == "__main__":
    unittest.main()
