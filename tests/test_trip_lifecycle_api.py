import unittest
from datetime import datetime, timezone

from fastapi.testclient import TestClient

from backend.api.routes.trips import get_trip_lifecycle_service
from backend.app import app
from backend.auth.dependencies import get_current_user
from backend.auth.roles import UserRole
from backend.models.trip import AssignmentStatus, TripStatus


NOW = datetime.now(timezone.utc)


def assignment_response(**overrides):
    data = {
        "trip_assignment_id": "assignment-1",
        "trip_id": "trip-1",
        "driver_id": "driver-1",
        "vehicle_id": "vehicle-1",
        "status": AssignmentStatus.ASSIGNED,
        "assigned_at": NOW,
        "unassigned_at": None,
        "created_at": NOW,
    }
    data.update(overrides)
    return data


def trip_response(**overrides):
    data = {
        "trip_id": "trip-1",
        "code": "TRIP-001",
        "driver_id": None,
        "driver_name": None,
        "driver_email": None,
        "vehicle_plate": None,
        "status": TripStatus.SCHEDULED,
        "planned_start_at": None,
        "planned_end_at": None,
        "actual_start_at": None,
        "actual_end_at": None,
        "origin": "Depot",
        "destination": "Terminal",
        "cancelled_reason": None,
        "aborted_reason": None,
        "created_by": "user-1",
        "created_at": NOW,
        "updated_at": NOW,
        "assignment": None,
        "monitoring_session": None,
        "safety_score": None,
        "total_alerts_count": 0,
        "critical_alerts_count": 0,
    }
    data.update(overrides)
    return data


class FakeTripLifecycleService:
    def create_trip(self, payload, current_user):
        return trip_response(code=payload.code, status=payload.status, created_by=current_user["user_id"])

    def list_trips(self, status, current_user):
        return [
            trip_response(
                status=status or TripStatus.COMPLETED,
                driver_id="driver-1",
                driver_name="Driver One",
                driver_email="driver@example.com",
                vehicle_plate="51A-12345",
                safety_score=self.calculate_or_get_safety_score("trip-1"),
                total_alerts_count=3,
                critical_alerts_count=1,
            )
        ]

    def active_trip(self, current_user):
        return trip_response(status=TripStatus.IN_PROGRESS)

    def list_my_trips(self, current_user):
        return [trip_response(status=TripStatus.IN_PROGRESS)]

    def start_my_trip(self, payload, current_user):
        return trip_response(
            status=TripStatus.IN_PROGRESS,
            created_by=current_user["user_id"],
            monitoring_session={
                "monitoring_session_id": "monitoring-1",
                "trip_id": "trip-1",
                "status": "active",
                "detector_instance_id": "demo-detector",
                "camera_index": None,
                "started_at": NOW,
                "ended_at": None,
                "last_snapshot_at": None,
                "created_at": NOW,
            },
        )

    def get_trip(self, trip_id, current_user):
        return trip_response(trip_id=trip_id)

    def schedule_trip(self, trip_id):
        return trip_response(trip_id=trip_id, status=TripStatus.SCHEDULED)

    def assign_trip(self, trip_id, payload):
        return trip_response(
            trip_id=trip_id,
            status=TripStatus.ASSIGNED,
            assignment=assignment_response(
                trip_id=trip_id,
                driver_id=payload.driver_id,
                vehicle_id=payload.vehicle_id,
            ),
        )

    def start_trip(self, trip_id, current_user):
        return trip_response(
            trip_id=trip_id,
            status=TripStatus.IN_PROGRESS,
            assignment=assignment_response(trip_id=trip_id, status=AssignmentStatus.IN_PROGRESS),
        )

    def complete_trip(self, trip_id, current_user):
        return trip_response(
            trip_id=trip_id,
            status=TripStatus.COMPLETED,
            assignment=assignment_response(
                trip_id=trip_id,
                status=AssignmentStatus.COMPLETED,
                unassigned_at=NOW,
            ),
            safety_score=self.calculate_or_get_safety_score(trip_id),
        )

    def cancel_trip(self, trip_id, reason):
        return trip_response(trip_id=trip_id, status=TripStatus.CANCELLED, cancelled_reason=reason)

    def abort_trip(self, trip_id, reason):
        return trip_response(trip_id=trip_id, status=TripStatus.ABORTED, aborted_reason=reason)

    def calculate_or_get_safety_score(self, trip_id):
        return {
            "safety_score_id": "score-1",
            "trip_id": trip_id,
            "score": 92.0,
            "grade": "A",
            "total_events": 1,
            "warning_events": 0,
            "critical_events": 1,
            "alert_count": 1,
            "calculation_version": "v1",
            "explanation": {},
            "calculated_at": NOW,
        }


class TripLifecycleApiTest(unittest.TestCase):
    def setUp(self):
        self.service = FakeTripLifecycleService()
        app.dependency_overrides[get_trip_lifecycle_service] = lambda: self.service
        self.client = TestClient(app)

    def tearDown(self):
        app.dependency_overrides.clear()

    def authenticate_as(self, role, email="admin@example.com"):
        app.dependency_overrides[get_current_user] = lambda: {
            "user_id": "user-1",
            "full_name": "Test User",
            "email": email,
            "role": role,
            "status": "active",
            "created_at": NOW,
            "updated_at": NOW,
        }

    def test_trip_endpoints_require_authentication(self):
        response = self.client.get("/api/v1/trips/trip-1")

        self.assertEqual(response.status_code, 401)

    def test_admin_can_create_assign_start_complete_cancel_abort_and_list(self):
        self.authenticate_as(UserRole.ADMIN)

        created = self.client.post(
            "/api/v1/trips",
            json={"code": "TRIP-001", "status": "scheduled"},
        )
        listed = self.client.get("/api/v1/trips")
        assigned = self.client.post(
            "/api/v1/trips/trip-1/assign",
            json={"driver_id": "driver-1", "vehicle_id": "vehicle-1"},
        )
        started = self.client.post("/api/v1/trips/trip-1/start")
        completed = self.client.post("/api/v1/trips/trip-1/complete")
        cancelled = self.client.post("/api/v1/trips/trip-1/cancel", json={"reason": "weather"})
        aborted = self.client.post("/api/v1/trips/trip-1/abort", json={"reason": "incident"})
        safety_score = self.client.get("/api/v1/trips/trip-1/safety-score")

        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.json()["status"], "scheduled")
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(len(listed.json()["trips"]), 1)
        self.assertEqual(listed.json()["trips"][0]["driver_id"], "driver-1")
        self.assertEqual(listed.json()["trips"][0]["driver_name"], "Driver One")
        self.assertEqual(listed.json()["trips"][0]["driver_email"], "driver@example.com")
        self.assertEqual(listed.json()["trips"][0]["vehicle_plate"], "51A-12345")
        self.assertEqual(listed.json()["trips"][0]["safety_score"]["score"], 92.0)
        self.assertEqual(listed.json()["trips"][0]["total_alerts_count"], 3)
        self.assertEqual(listed.json()["trips"][0]["critical_alerts_count"], 1)
        self.assertEqual(assigned.status_code, 200)
        self.assertEqual(assigned.json()["assignment"]["driver_id"], "driver-1")
        self.assertEqual(started.status_code, 200)
        self.assertEqual(started.json()["status"], "in_progress")
        self.assertEqual(completed.status_code, 200)
        self.assertEqual(completed.json()["status"], "completed")
        self.assertEqual(cancelled.status_code, 200)
        self.assertEqual(cancelled.json()["cancelled_reason"], "weather")
        self.assertEqual(aborted.status_code, 200)
        self.assertEqual(aborted.json()["aborted_reason"], "incident")
        self.assertEqual(safety_score.status_code, 200)
        self.assertEqual(safety_score.json()["score"], 92.0)

    def test_driver_cannot_create_assign_cancel_or_abort_but_can_read_start_complete(self):
        self.authenticate_as(UserRole.DRIVER, email="driver@example.com")

        created = self.client.post("/api/v1/trips", json={"code": "TRIP-002"})
        assigned = self.client.post(
            "/api/v1/trips/trip-1/assign",
            json={"driver_id": "driver-1", "vehicle_id": "vehicle-1"},
        )
        read = self.client.get("/api/v1/trips/trip-1")
        started = self.client.post("/api/v1/trips/trip-1/start")
        completed = self.client.post("/api/v1/trips/trip-1/complete")
        cancelled = self.client.post("/api/v1/trips/trip-1/cancel", json={"reason": "weather"})
        aborted = self.client.post("/api/v1/trips/trip-1/abort", json={"reason": "incident"})
        own_started = self.client.post("/api/v1/trips/start-my-trip", json={})
        my_trips = self.client.get("/api/v1/trips/my")

        self.assertEqual(created.status_code, 403)
        self.assertEqual(assigned.status_code, 403)
        self.assertEqual(read.status_code, 200)
        self.assertEqual(started.status_code, 200)
        self.assertEqual(completed.status_code, 200)
        self.assertEqual(completed.json()["safety_score"]["score"], 92.0)
        self.assertEqual(cancelled.status_code, 403)
        self.assertEqual(aborted.status_code, 403)
        self.assertEqual(own_started.status_code, 201)
        self.assertEqual(own_started.json()["monitoring_session"]["monitoring_session_id"], "monitoring-1")
        self.assertEqual(my_trips.status_code, 200)


if __name__ == "__main__":
    unittest.main()
