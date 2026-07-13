import unittest
from datetime import datetime, timedelta, timezone
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
TRIP_ID = "11111111-1111-4111-8111-111111111111"


class WorkflowState:
    def __init__(self):
        self.events = {}
        self.alerts = []
        self.unlinked_drowsiness_events = []
        self.active_drowsiness_warning = None


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

        if payload.event_type.value in {"drowsiness_detected", "eyes_closed"}:
            self.state.unlinked_drowsiness_events.append(event)
            occurred_at = payload.occurred_at
            self.state.unlinked_drowsiness_events = [
                candidate
                for candidate in self.state.unlinked_drowsiness_events
                if (
                    occurred_at
                    - datetime.fromisoformat(candidate["occurred_at"].replace("Z", "+00:00"))
                ).total_seconds()
                <= 30
            ]
            if self.state.active_drowsiness_warning is not None:
                linked_events = [
                    self.state.events[event_id]
                    for event_id in self.state.active_drowsiness_warning["linked_event_ids"]
                ]
                first_occurred_at = min(
                    datetime.fromisoformat(event["occurred_at"].replace("Z", "+00:00"))
                    for event in linked_events
                )
                if (payload.occurred_at - first_occurred_at).total_seconds() <= 60:
                    self.state.active_drowsiness_warning["status"] = "ignored"
                    alert = {
                        "alert_id": f"alert-{len(self.state.alerts) + 1}",
                        "trip_id": payload.trip_id,
                        "driver_id": payload.driver_id,
                        "alert_type": "drowsiness",
                        "severity": "critical",
                        "status": "open",
                        "linked_event_ids": [
                            *self.state.active_drowsiness_warning["linked_event_ids"],
                            payload.event_id,
                        ],
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
                    self.state.unlinked_drowsiness_events.clear()
                self.state.active_drowsiness_warning = None
            if event["alert_id"] is None and len(self.state.unlinked_drowsiness_events) >= 2:
                linked_event_ids = [
                    candidate["event_id"]
                    for candidate in self.state.unlinked_drowsiness_events[:2]
                ]
                alert = {
                    "alert_id": f"alert-{len(self.state.alerts) + 1}",
                    "trip_id": payload.trip_id,
                    "driver_id": payload.driver_id,
                    "alert_type": "drowsiness",
                    "severity": "warning",
                    "status": "open",
                    "linked_event_ids": linked_event_ids,
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
                self.state.active_drowsiness_warning = alert
                del self.state.unlinked_drowsiness_events[:2]

        return event


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
                alert
                for alert in self.state.alerts
                if alert["trip_id"] == trip_id and alert.get("status") != "ignored"
            ],
        )
        self.alerts_patch.start()
        self.client = TestClient(app)

    def tearDown(self):
        self.alerts_patch.stop()
        app.dependency_overrides.clear()

    def complete_trip(self, trip_id, current_user):
        trip_alerts = [
            alert
            for alert in self.state.alerts
            if alert["trip_id"] == trip_id and alert.get("status") != "ignored"
        ]
        critical_count = sum(1 for alert in trip_alerts if alert["severity"] == "critical")
        warning_count = max(0, len(trip_alerts) - critical_count)
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
                "warning_events": warning_count,
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
            "severity": "medium",
            "source": "ai_camera",
            "occurred_at": NOW.isoformat(),
            "trip_id": TRIP_ID,
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
        second_payload = {
            **payload,
            "event_id": "ai-event-2",
            "occurred_at": (NOW + timedelta(seconds=10)).isoformat(),
        }
        third_payload = {
            **payload,
            "event_id": "ai-event-3",
            "occurred_at": (NOW + timedelta(seconds=30)).isoformat(),
        }

        ingested = self.client.post("/api/v1/safety-events/ingest", json=payload)
        second_ingested = self.client.post("/api/v1/safety-events/ingest", json=second_payload)
        third_ingested = self.client.post("/api/v1/safety-events/ingest", json=third_payload)
        duplicate = self.client.post("/api/v1/safety-events/ingest", json=payload)
        alerts = self.client.get(f"/api/v1/trips/{TRIP_ID}/alerts")
        invalid_alerts = self.client.get("/api/v1/trips/trip-1/alerts")
        score = self.client.post(f"/api/v1/trips/{TRIP_ID}/complete")

        self.assertEqual(ingested.status_code, 201)
        self.assertEqual(ingested.json()["event_id"], "ai-event-1")
        self.assertIsNone(ingested.json()["alert_id"])
        self.assertEqual(second_ingested.status_code, 201)
        self.assertEqual(second_ingested.json()["alert_id"], "alert-1")
        self.assertEqual(third_ingested.status_code, 201)
        self.assertEqual(third_ingested.json()["alert_id"], "alert-2")
        self.assertIn("ai-event-1", self.state.events)
        self.assertEqual(self.state.alerts[0]["status"], "ignored")
        self.assertEqual(self.state.alerts[1]["linked_event_ids"], ["ai-event-1", "ai-event-2", "ai-event-3"])
        self.assertEqual(duplicate.status_code, 409)
        self.assertEqual(alerts.status_code, 200)
        self.assertEqual(len(alerts.json()), 1)
        self.assertEqual(alerts.json()[0]["alert_type"], "drowsiness")
        self.assertEqual(alerts.json()[0]["severity"], "critical")
        self.assertEqual(invalid_alerts.status_code, 422)
        self.assertEqual(score.status_code, 200)
        self.assertEqual(score.json()["safety_score"]["alert_count"], 1)
        self.assertEqual(score.json()["safety_score"]["warning_events"], 0)
        self.assertEqual(score.json()["safety_score"]["critical_events"], 1)
        self.assertEqual(score.json()["safety_score"]["score"], 90.0)
        self.assertEqual(score.json()["safety_score"]["grade"], "A")

    def test_yawning_events_do_not_create_alert_history_or_score_penalty(self):
        payload = {
            "event_id": "yawn-event-1",
            "event_type": "yawning_detected",
            "severity": "medium",
            "source": "ai_camera",
            "occurred_at": NOW.isoformat(),
            "trip_id": TRIP_ID,
            "driver_id": "driver-1",
            "vehicle_id": "vehicle-1",
            "confidence": 0.84,
            "duration_ms": 800,
            "details": {
                "detection_method": "mar_dlib",
                "mar": 0.86,
            },
        }
        second_payload = {
            **payload,
            "event_id": "yawn-event-2",
            "occurred_at": (NOW + timedelta(seconds=10)).isoformat(),
        }

        first_ingested = self.client.post("/api/v1/safety-events/ingest", json=payload)
        second_ingested = self.client.post("/api/v1/safety-events/ingest", json=second_payload)
        alerts = self.client.get(f"/api/v1/trips/{TRIP_ID}/alerts")
        score = self.client.post(f"/api/v1/trips/{TRIP_ID}/complete")

        self.assertEqual(first_ingested.status_code, 201)
        self.assertIsNone(first_ingested.json()["alert_id"])
        self.assertEqual(second_ingested.status_code, 201)
        self.assertIsNone(second_ingested.json()["alert_id"])
        self.assertEqual(alerts.status_code, 200)
        self.assertEqual(alerts.json(), [])
        self.assertEqual(score.status_code, 200)
        self.assertEqual(score.json()["safety_score"]["alert_count"], 0)
        self.assertEqual(score.json()["safety_score"]["warning_events"], 0)
        self.assertEqual(score.json()["safety_score"]["critical_events"], 0)
        self.assertEqual(score.json()["safety_score"]["score"], 100.0)


if __name__ == "__main__":
    unittest.main()
