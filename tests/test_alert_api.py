import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from backend.app import app
from backend.auth.dependencies import get_current_user


class AlertApiTest(unittest.TestCase):
    def setUp(self):
        app.dependency_overrides[get_current_user] = lambda: {
            "user_id": "admin-1",
            "full_name": "Admin User",
            "email": "admin@example.com",
            "role": "admin",
            "status": "active",
        }
        self.client = TestClient(app)

    def tearDown(self):
        app.dependency_overrides.clear()

    def test_authenticated_user_can_acknowledge_alert(self):
        acknowledged = {
            "alert_id": "alert-1",
            "trip_id": "trip-1",
            "driver_id": "driver-1",
            "alert_type": "drowsiness",
            "severity": "warning",
            "detection_method": "cnn_classifier",
            "acknowledged": True,
            "acknowledged_at": "2026-07-05T10:21:35Z",
            "occurred_at": "2026-07-05T10:21:30Z",
            "created_at": "2026-07-05T10:21:31Z",
        }

        with patch("backend.routes.alert_routes.acknowledge_alert", return_value=acknowledged, create=True) as mocked:
            response = self.client.patch("/api/v1/alerts/alert-1/acknowledge")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["acknowledged"])
        mocked.assert_called_once()
        self.assertEqual(mocked.call_args.args[0], "alert-1")
        self.assertEqual(mocked.call_args.kwargs["current_user"]["user_id"], "admin-1")


if __name__ == "__main__":
    unittest.main()
