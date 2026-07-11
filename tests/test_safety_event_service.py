import unittest
from datetime import datetime, timezone

from pydantic import ValidationError

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

    def trip_exists(self, trip_id):
        return trip_id in self.trips

    def driver_exists(self, driver_id):
        return driver_id in self.drivers

    def vehicle_exists(self, vehicle_id):
        return vehicle_id in self.vehicles

    def ingest_event(self, data, create_alert):
        if self.raise_duplicate:
            raise DuplicateSafetyEventError(data["event_id"])
        self.ingested.append((data, create_alert))
        return {
            **data,
            "safety_event_id": "safety-event-1",
            "alert_id": "alert-1" if create_alert else None,
            "created_at": NOW,
        }


class SafetyEventServiceTest(unittest.TestCase):
    def setUp(self):
        self.repository = FakeSafetyEventRepository()
        self.service = SafetyEventService(self.repository)

    def test_successful_ingestion_creates_alert_for_high_severity(self):
        result = self.service.ingest(SafetyEventIngestRequest(**payload()))

        self.assertEqual(result["safety_event_id"], "safety-event-1")
        self.assertEqual(result["alert_id"], "alert-1")
        self.assertTrue(self.repository.ingested[0][1])

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

    def test_low_and_medium_severity_do_not_create_alert(self):
        low = self.service.ingest(SafetyEventIngestRequest(**payload(event_id="event-low", severity="low")))
        medium = self.service.ingest(
            SafetyEventIngestRequest(**payload(event_id="event-medium", severity="medium"))
        )

        self.assertIsNone(low["alert_id"])
        self.assertIsNone(medium["alert_id"])
        self.assertFalse(self.repository.ingested[0][1])
        self.assertFalse(self.repository.ingested[1][1])

    def test_missing_references_are_rejected_when_provided(self):
        self.repository.trips.clear()

        with self.assertRaises(SafetyEventReferenceError):
            self.service.ingest(SafetyEventIngestRequest(**payload()))

    def test_null_trip_driver_vehicle_demo_event_is_allowed(self):
        result = self.service.ingest(
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

        self.assertEqual(result["event_id"], "demo-event")
        self.assertIsNone(result["trip_id"])
        self.assertIsNone(result["driver_id"])
        self.assertIsNone(result["vehicle_id"])
        self.assertIsNone(result["alert_id"])


if __name__ == "__main__":
    unittest.main()
