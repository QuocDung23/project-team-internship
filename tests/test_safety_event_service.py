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
        self.active_drowsiness_warning = None
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
                linked_event_ids = [candidate["event_id"] for candidate in candidates[:2]]
                self.alerts.append({
                    "kind": aggregation_kind,
                    "severity": severity,
                    "status": "open",
                    "linked_event_ids": linked_event_ids,
                })
                alert_id = f"alert-{len(self.alerts)}"
                if aggregation_kind == "drowsiness":
                    self.active_drowsiness_warning = self.alerts[-1]
                del candidates[:2]
            if aggregation_kind == "drowsiness" and alert_id is None and self.active_drowsiness_warning:
                linked_events = [
                    ingested
                    for ingested, _, _ in self.ingested
                    if ingested["event_id"] in self.active_drowsiness_warning["linked_event_ids"]
                ]
                if linked_events:
                    first_occurred_at = min(self._occurred_at(linked_event) for linked_event in linked_events)
                    if (occurred_at - first_occurred_at).total_seconds() <= 60:
                        self.active_drowsiness_warning["status"] = "ignored"
                        linked_event_ids = [*self.active_drowsiness_warning["linked_event_ids"], data["event_id"]]
                        self.alerts.append({
                            "kind": aggregation_kind,
                            "severity": "critical",
                            "status": "open",
                            "linked_event_ids": linked_event_ids,
                        })
                        alert_id = f"alert-{len(self.alerts)}"
                        candidates.clear()
                    self.active_drowsiness_warning = None
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

    def test_third_drowsiness_event_supersedes_warning_with_critical(self):
        times = [
            NOW,
            NOW + timedelta(seconds=10),
            NOW + timedelta(seconds=30),
        ]

        results = [
            self.service.ingest(
                SafetyEventIngestRequest(**payload(event_id=f"event-{index}", occurred_at=occurred_at))
            )
            for index, occurred_at in enumerate(times)
        ]

        self.assertEqual(results[1]["alert_id"], "alert-1")
        self.assertEqual(results[2]["alert_id"], "alert-2")
        self.assertEqual([alert["severity"] for alert in self.repository.alerts], ["warning", "critical"])
        self.assertEqual([alert["status"] for alert in self.repository.alerts], ["ignored", "open"])
        self.assertEqual(self.repository.alerts[1]["linked_event_ids"], ["event-0", "event-1", "event-2"])

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

    def test_yawns_are_stored_without_backend_alert_aggregation(self):
        times = [
            NOW,
            NOW + timedelta(seconds=10),
            NOW + timedelta(seconds=20),
            NOW + timedelta(seconds=25),
        ]

        results = [
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
            for index, occurred_at in enumerate(times)
        ]

        self.assertEqual([result["alert_id"] for result in results], [None, None, None, None])
        self.assertEqual(self.repository.alerts, [])
        self.assertTrue(all(kind is None for _data, kind, _window in self.repository.ingested))

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
