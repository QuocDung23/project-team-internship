import unittest
from datetime import datetime, timezone

from fastapi.testclient import TestClient

from backend.api.routes.safety_events import get_safety_event_service
from backend.app import app
from backend.auth.dependencies import get_current_user
from backend.auth.roles import UserRole


NOW = datetime.now(timezone.utc)


def request_payload(**overrides):
    data = {
        "event_id": "event-1",
        "event_type": "drowsiness_detected",
        "severity": "high",
        "source": "ai_camera",
        "occurred_at": NOW.isoformat(),
        "trip_id": None,
        "driver_id": None,
        "vehicle_id": None,
        "confidence": 0.91,
        "duration_ms": 1000,
        "details": {"detection_method": "ear_dlib"},
    }
    data.update(overrides)
    return data


class FakeSafetyEventService:
    def __init__(self):
        self.payloads = []

    def ingest(self, payload):
        self.payloads.append(payload)
        return {
            **payload.model_dump(mode="json"),
            "safety_event_id": "safety-event-1",
            "alert_id": "alert-1" if payload.severity.value == "high" else None,
            "created_at": NOW,
        }


class SafetyEventApiTest(unittest.TestCase):
    def setUp(self):
        self.service = FakeSafetyEventService()
        app.dependency_overrides[get_safety_event_service] = lambda: self.service
        self.client = TestClient(app)

    def tearDown(self):
        app.dependency_overrides.clear()

    def authenticate_as(self, role):
        app.dependency_overrides[get_current_user] = lambda: {
            "user_id": "user-1",
            "full_name": "Test User",
            "email": "test@example.com",
            "role": role,
            "status": "active",
            "created_at": NOW,
            "updated_at": NOW,
        }

    def test_ingest_requires_authentication(self):
        response = self.client.post("/api/v1/safety-events/ingest", json=request_payload())

        self.assertEqual(response.status_code, 401)

    def test_admin_and_dispatcher_can_ingest(self):
        for role in (UserRole.ADMIN, UserRole.DISPATCHER):
            with self.subTest(role=role):
                self.authenticate_as(role)

                response = self.client.post(
                    "/api/v1/safety-events/ingest",
                    json=request_payload(event_id=f"event-{role.value}"),
                )

                self.assertEqual(response.status_code, 201)
                self.assertEqual(response.json()["safety_event_id"], "safety-event-1")

    def test_driver_cannot_ingest(self):
        self.authenticate_as(UserRole.DRIVER)

        response = self.client.post("/api/v1/safety-events/ingest", json=request_payload())

        self.assertEqual(response.status_code, 403)

    def test_invalid_payload_returns_422(self):
        self.authenticate_as(UserRole.ADMIN)

        response = self.client.post(
            "/api/v1/safety-events/ingest",
            json=request_payload(confidence=-0.1),
        )

        self.assertEqual(response.status_code, 422)


if __name__ == "__main__":
    unittest.main()
