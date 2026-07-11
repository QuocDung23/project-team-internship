import unittest
from datetime import datetime, timezone
from unittest.mock import patch

from fastapi.testclient import TestClient

import backend.routes.alert_routes as alert_routes
from backend.api.routes.safety_events import get_safety_event_service
from backend.api.routes.trips import get_trip_lifecycle_service
from backend.app import app
from backend.auth.dependencies import get_current_user
from backend.auth.roles import UserRole
from backend.services.safety_event_service import SafetyEventDuplicateError
from backend.services.safety_service import calculate_safety_score, safety_grade


NOW = datetime.now(timezone.utc)


class WorkflowState:
    def __init__(self):
        self.events = {}
        self.alerts = []


class WorkflowSafetyEventService:
    def __init__(self, state):
        self.state = state

    def ingest(self, payload, current_user=None):
        if payload.event_id in self.state.events:
            raise SafetyEventDuplicateError(f"event_id already ingested: {payload.event_id}")

        event = {
            **payload.model_dump(mode="json"),
            "safety_event_id": f"safety-event-{len(self.state.events) + 1}",
            "created_at": NOW,
            "alert_id": None,
        }
        self.state.events[payload.event_id] = event

        if payload.severity.value == "high":
            alert_type = self._alert_type(payload.event_type.value)
            alert = {
                "alert_id": f"alert-{len(self.state.alerts) + 1}",
                "trip_id": payload.trip_id,
                "driver_id": payload.driver_id,
                "alert_type": alert_type,
                "severity": "critical",
                "detection_method": payload.details.get("detection_method", "ai_camera"),
                "ear_value": payload.details.get("ear"),
                "consecutive_frame_count": payload.details.get("consecutive_frame_count"),
                "cnn_confidence": payload.confidence,
                "cnn_label": payload.details.get("cnn_label"),
                "alarm_triggered": True,
                "occurred_at": payload.occurred_at.isoformat(),
            }
            self.state.alerts.append(alert)
            event["alert_id"] = alert["alert_id"]

        return event

    @staticmethod
    def _alert_type(event_type):
        if event_type in {"camera_blocked", "no_face_detected"}:
            return "camera_issue"
        if event_type in {"distraction", "head_nod", "head_nodding_detected"}:
            return "driver_inattention"
        return "drowsiness"


class EndToEndWorkflowTest(unittest.TestCase):
    def setUp(self):
        self.state = WorkflowState()
        app.dependency_overrides[get_current_user] = lambda: {
            "user_id": "user-1",
            "full_name": "Admin",
            "email": "admin@example.com",
            "role": UserRole.ADMIN,
            "status": "active",
            "created_at": NOW,
            "updated_at": NOW,
        }
        app.dependency_overrides[get_safety_event_service] = lambda: WorkflowSafetyEventService(
            self.state
        )
        app.dependency_overrides[get_trip_lifecycle_service] = lambda: self
        self.alerts_patch = patch.object(
            alert_routes,
            "get_trip_alerts",
            lambda trip_id: [
                alert for alert in self.state.alerts if alert["trip_id"] == trip_id
            ],
        )
        self.alerts_patch.start()
        self.client = TestClient(app)

    def tearDown(self):
        self.alerts_patch.stop()
        app.dependency_overrides.clear()

    def complete_trip(self, trip_id, current_user):
        trip_alerts = [alert for alert in self.state.alerts if alert["trip_id"] == trip_id]
        critical_count = sum(1 for alert in trip_alerts if alert["severity"] == "critical")
        score = calculate_safety_score(len(trip_alerts), critical_count)
        return {
            "trip_id": trip_id,
            "code": None,
            "status": "completed",
            "planned_start_at": None,
            "planned_end_at": None,
            "actual_start_at": NOW,
            "actual_end_at": NOW,
            "origin": None,
            "destination": None,
            "cancelled_reason": None,
            "aborted_reason": None,
            "created_by": "user-1",
            "created_at": NOW,
            "updated_at": NOW,
            "assignment": None,
            "safety_score": {
                "safety_score_id": "score-1",
                "trip_id": trip_id,
                "score": score,
                "grade": safety_grade(score),
                "total_events": len(self.state.events),
                "warning_events": 0,
                "critical_events": critical_count,
                "alert_count": len(trip_alerts),
                "calculation_version": "v1",
                "explanation": {},
                "calculated_at": NOW,
            },
        }

    def test_ai_event_ingestion_persistence_duplicate_alert_retrieval_and_score(self):
        payload = {
            "event_id": "ai-event-1",
            "event_type": "drowsiness_detected",
            "severity": "high",
            "source": "ai_camera",
            "occurred_at": NOW.isoformat(),
            "trip_id": "trip-1",
            "driver_id": "driver-1",
            "vehicle_id": "vehicle-1",
            "confidence": 0.94,
            "duration_ms": 2400,
            "details": {
                "detection_method": "cnn_classifier",
                "ear": 0.18,
                "consecutive_frame_count": 24,
                "cnn_label": "closed",
            },
        }

        ingested = self.client.post("/api/v1/safety-events/ingest", json=payload)
        duplicate = self.client.post("/api/v1/safety-events/ingest", json=payload)
        alerts = self.client.get("/api/v1/trips/trip-1/alerts")
        score = self.client.post("/api/v1/trips/trip-1/complete")

        self.assertEqual(ingested.status_code, 201)
        self.assertEqual(ingested.json()["event_id"], "ai-event-1")
        self.assertEqual(ingested.json()["alert_id"], "alert-1")
        self.assertIn("ai-event-1", self.state.events)
        self.assertEqual(duplicate.status_code, 409)
        self.assertEqual(alerts.status_code, 200)
        self.assertEqual(alerts.json()[0]["alert_type"], "drowsiness")
        self.assertEqual(alerts.json()[0]["severity"], "critical")
        self.assertEqual(score.status_code, 200)
        self.assertEqual(score.json()["safety_score"]["alert_count"], 1)
        self.assertEqual(score.json()["safety_score"]["critical_events"], 1)
        self.assertEqual(score.json()["safety_score"]["score"], 92.0)
        self.assertEqual(score.json()["safety_score"]["grade"], "A")


if __name__ == "__main__":
    unittest.main()
