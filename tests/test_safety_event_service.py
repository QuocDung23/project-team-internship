import unittest
from datetime import datetime, timedelta, timezone

from pydantic import ValidationError

from backend.auth.roles import UserRole
from backend.models.safety_event import SafetyEventIngestRequest
from backend.repositories.safety_event_repository import DuplicateSafetyEventError
from backend.services.safety_event_service import (
    SafetyEventDuplicateError,
    SafetyEventReferenceError,
    SafetyEventService,
)


NOW = datetime.now(timezone.utc)


def payload(**overrides):
    data = {
        "event_id": "event-1",
        "event_type": "drowsiness_detected",
        "severity": "high",
        "source": "ai_camera",
        "occurred_at": NOW,
        "trip_id": "trip-1",
        "driver_id": "driver-1",
        "vehicle_id": "vehicle-1",
        "confidence": 0.93,
        "duration_ms": 1200,
        "details": {"detection_method": "ear_dlib"},
    }
    data.update(overrides)
    return data


class FakeSafetyEventRepository:
    def __init__(self):
        self.trips = {"trip-1"}
        self.drivers = {"driver-1"}
        self.vehicles = {"vehicle-1"}
        self.raise_duplicate = False
        self.ingested = []
        self.unlinked_candidates = {"drowsiness": [], "yawning": []}
        self.last_drowsiness_alert_at = None
        self.alerts = []

    def trip_exists(self, trip_id):
        return trip_id in self.trips

    def active_trip_exists(self, trip_id):
        return trip_id in self.trips

    def monitoring_session_belongs_to_trip(self, monitoring_session_id, trip_id):
        return monitoring_session_id == "monitoring-1" and trip_id in self.trips

    def driver_owns_active_trip(self, trip_id, user_id, driver_email):
        return trip_id in self.trips and user_id == "user-driver"

    def driver_exists(self, driver_id):
        return driver_id in self.drivers

    def vehicle_exists(self, vehicle_id):
        return vehicle_id in self.vehicles

    def _occurred_at(self, data):
        value = data["occurred_at"]
        if isinstance(value, datetime):
            return value
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))

    def ingest_event(self, data, aggregation_kind=None, aggregation_window_seconds=None):
        if self.raise_duplicate:
            raise DuplicateSafetyEventError(data["event_id"])
        self.ingested.append((data, aggregation_kind, aggregation_window_seconds))
        alert_id = None
        if aggregation_kind:
            candidates = self.unlinked_candidates[aggregation_kind]
            candidates.append(data)
            occurred_at = self._occurred_at(data)
            candidates[:] = [
                candidate
                for candidate in candidates
                if (occurred_at - self._occurred_at(candidate)).total_seconds() <= aggregation_window_seconds
            ]
            if len(candidates) >= 2:
                severity = "warning"
                if aggregation_kind == "drowsiness" and self.last_drowsiness_alert_at is not None:
                    if (occurred_at - self.last_drowsiness_alert_at).total_seconds() <= 60:
                        severity = "critical"
                if aggregation_kind == "drowsiness":
                    self.last_drowsiness_alert_at = occurred_at
                self.alerts.append({"kind": aggregation_kind, "severity": severity})
                alert_id = f"alert-{len(self.alerts)}"
                del candidates[:2]
        return {
            **data,
            "safety_event_id": "safety-event-1",
            "alert_id": alert_id,
            "created_at": NOW,
        }


class SafetyEventServiceTest(unittest.TestCase):
    def setUp(self):
        self.repository = FakeSafetyEventRepository()
        self.service = SafetyEventService(self.repository)

    def test_successful_ingestion_stores_candidate_without_immediate_alert(self):
        result = self.service.ingest(SafetyEventIngestRequest(**payload()))

        self.assertEqual(result["safety_event_id"], "safety-event-1")
        self.assertIsNone(result["alert_id"])
        self.assertEqual(self.repository.ingested[0][1], "drowsiness")
        self.assertEqual(self.repository.ingested[0][2], 30)

    def test_duplicate_event_id_prevention(self):
        self.repository.raise_duplicate = True

        with self.assertRaises(SafetyEventDuplicateError):
            self.service.ingest(SafetyEventIngestRequest(**payload()))

    def test_invalid_payload_rejection(self):
        with self.assertRaises(ValidationError):
            SafetyEventIngestRequest(**payload(confidence=1.2))

        with self.assertRaises(ValidationError):
            SafetyEventIngestRequest(**payload(duration_ms=-1))

        with self.assertRaises(ValidationError):
            SafetyEventIngestRequest(**payload(details=[]))

    def test_two_drowsiness_candidates_within_window_create_warning_alert(self):
        first = self.service.ingest(
            SafetyEventIngestRequest(**payload(event_id="event-drowsy-1", occurred_at=NOW))
        )
        second = self.service.ingest(
            SafetyEventIngestRequest(**payload(event_id="event-drowsy-2", occurred_at=NOW + timedelta(seconds=20)))
        )

        self.assertIsNone(first["alert_id"])
        self.assertEqual(second["alert_id"], "alert-1")
        self.assertEqual(self.repository.alerts[0]["severity"], "warning")

    def test_drowsiness_escalates_when_next_alert_is_within_60_seconds(self):
        times = [
            NOW,
            NOW + timedelta(seconds=10),
            NOW + timedelta(seconds=30),
            NOW + timedelta(seconds=40),
        ]

        results = [
            self.service.ingest(
                SafetyEventIngestRequest(**payload(event_id=f"event-{index}", occurred_at=occurred_at))
            )
            for index, occurred_at in enumerate(times)
        ]

        self.assertEqual(results[1]["alert_id"], "alert-1")
        self.assertEqual(results[3]["alert_id"], "alert-2")
        self.assertEqual([alert["severity"] for alert in self.repository.alerts], ["warning", "critical"])

    def test_drowsiness_escalation_resets_after_60_seconds(self):
        times = [
            NOW,
            NOW + timedelta(seconds=10),
            NOW + timedelta(seconds=120),
            NOW + timedelta(seconds=130),
        ]

        for index, occurred_at in enumerate(times):
            self.service.ingest(
                SafetyEventIngestRequest(**payload(event_id=f"event-reset-{index}", occurred_at=occurred_at))
            )

        self.assertEqual([alert["severity"] for alert in self.repository.alerts], ["warning", "warning"])

    def test_two_yawns_create_warning_and_never_critical(self):
        times = [
            NOW,
            NOW + timedelta(seconds=10),
            NOW + timedelta(seconds=20),
            NOW + timedelta(seconds=25),
        ]

        for index, occurred_at in enumerate(times):
            self.service.ingest(
                SafetyEventIngestRequest(
                    **payload(
                        event_id=f"event-yawn-{index}",
                        event_type="yawning_detected",
                        severity="medium",
                        occurred_at=occurred_at,
                    )
                )
            )

        self.assertEqual([alert["kind"] for alert in self.repository.alerts], ["yawning", "yawning"])
        self.assertEqual([alert["severity"] for alert in self.repository.alerts], ["warning", "warning"])

    def test_head_nodding_event_is_stored_without_alert_aggregation(self):
        result = self.service.ingest(
            SafetyEventIngestRequest(
                **payload(event_id="event-head", event_type="head_nodding_detected", severity="medium")
            )
        )

        self.assertIsNone(result["alert_id"])
        self.assertIsNone(self.repository.ingested[0][1])

    def test_missing_references_are_rejected_when_provided(self):
        self.repository.trips.clear()

        with self.assertRaises(SafetyEventReferenceError):
            self.service.ingest(SafetyEventIngestRequest(**payload()))

    def test_missing_trip_is_rejected(self):
        with self.assertRaises(SafetyEventReferenceError):
            self.service.ingest(
            SafetyEventIngestRequest(
                **payload(
                    event_id="demo-event",
                    severity="medium",
                    trip_id=None,
                    driver_id=None,
                    vehicle_id=None,
                )
            )
        )

    def test_driver_must_own_active_trip(self):
        current_user = {
            "user_id": "someone-else",
            "email": "driver@example.com",
            "role": UserRole.DRIVER,
        }

        with self.assertRaises(SafetyEventReferenceError):
            self.service.ingest(SafetyEventIngestRequest(**payload()), current_user=current_user)


if __name__ == "__main__":
    unittest.main()
