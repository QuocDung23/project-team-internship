import unittest
from unittest.mock import patch

from backend.services.monitoring_risk_service import MonitoringRiskPersistenceService


class FakeRiskRepository:
    def __init__(self, *, active=True):
        self.active = active
        self.events = []

    def active_trip_exists(self, trip_id):
        return self.active and trip_id == "trip-1"

    def ingest_event(
        self,
        payload,
        *,
        aggregation_kind=None,
        aggregation_window_seconds=None,
        create_immediate_alert=False,
    ):
        event = {
            **payload,
            "safety_event_id": f"se-{len(self.events) + 1}",
            "aggregation_kind": aggregation_kind,
            "aggregation_window_seconds": aggregation_window_seconds,
            "alert_id": "alert-1" if create_immediate_alert else None,
        }
        self.events.append(event)
        return event


def snapshot(**overrides):
    data = {
        "trip_id": "trip-1",
        "timestamp": 1_700_000_000.0,
        "fps": 20.0,
        "ear": 0.2,
        "mar": 0.4,
        "pitch": 3.0,
        "dws_score": 20,
        "eyes_open": False,
        "mouth_closed": True,
        "face_detected": True,
        "ear_alert": False,
        "mar_alert": False,
        "pose_alert": False,
        "alarm_on": False,
        "ear_counter": 4,
        "mar_counter": 0,
        "pose_counter": 0,
        "cnn_enabled": False,
    }
    data.update(overrides)
    return data


class MonitoringRiskPersistenceServiceTest(unittest.TestCase):
    def test_active_trip_ear_alert_creates_safety_event(self):
        repository = FakeRiskRepository()
        service = MonitoringRiskPersistenceService(repository)

        events = service.persist_snapshot_risks(snapshot(ear_alert=True))

        self.assertEqual(len(events), 1)
        self.assertEqual(repository.events[0]["event_type"], "eyes_closed")
        self.assertEqual(repository.events[0]["severity"], "medium")
        self.assertEqual(repository.events[0]["trip_id"], "trip-1")
        self.assertEqual(repository.events[0]["aggregation_kind"], "drowsiness")
        self.assertEqual(repository.events[0]["duration_ms"], 200)
        self.assertEqual(repository.events[0]["details"]["ear"], 0.2)

    def test_cooldown_blocks_duplicate_risk_snapshots(self):
        repository = FakeRiskRepository()
        service = MonitoringRiskPersistenceService(repository)

        with patch("backend.services.monitoring_risk_service.time.time", side_effect=[100.0, 101.0]):
            first = service.persist_snapshot_risks(snapshot(ear_alert=True))
            second = service.persist_snapshot_risks(snapshot(ear_alert=True, timestamp=1_700_000_001.0))

        self.assertEqual(len(first), 1)
        self.assertEqual(second, [])
        self.assertEqual(len(repository.events), 1)

    def test_inactive_or_missing_trip_does_not_persist(self):
        inactive_repository = FakeRiskRepository(active=False)
        inactive_service = MonitoringRiskPersistenceService(inactive_repository)
        missing_trip_repository = FakeRiskRepository()
        missing_trip_service = MonitoringRiskPersistenceService(missing_trip_repository)

        self.assertEqual(inactive_service.persist_snapshot_risks(snapshot(ear_alert=True)), [])
        self.assertEqual(missing_trip_service.persist_snapshot_risks(snapshot(trip_id=None, ear_alert=True)), [])
        self.assertEqual(inactive_repository.events, [])
        self.assertEqual(missing_trip_repository.events, [])

    def test_head_nod_creates_immediate_alert_link(self):
        repository = FakeRiskRepository()
        service = MonitoringRiskPersistenceService(repository)

        events = service.persist_snapshot_risks(snapshot(pose_alert=True, pose_counter=5))

        self.assertEqual(len(events), 1)
        self.assertEqual(events[0]["event_type"], "head_nodding_detected")
        self.assertEqual(events[0]["alert_id"], "alert-1")
        self.assertEqual(repository.events[0]["duration_ms"], 250)

    def test_no_face_requires_minimum_duration(self):
        repository = FakeRiskRepository()
        service = MonitoringRiskPersistenceService(repository)

        with patch("backend.services.monitoring_risk_service.time.time", side_effect=[100.0, 102.0, 103.1]):
            first = service.persist_snapshot_risks(snapshot(face_detected=False))
            second = service.persist_snapshot_risks(snapshot(face_detected=False, timestamp=1_700_000_002.0))
            third = service.persist_snapshot_risks(snapshot(face_detected=False, timestamp=1_700_000_003.1))

        self.assertEqual(first, [])
        self.assertEqual(second, [])
        self.assertEqual(len(third), 1)
        self.assertEqual(third[0]["event_type"], "no_face_detected")
        self.assertEqual(third[0]["alert_id"], "alert-1")


if __name__ == "__main__":
    unittest.main()
