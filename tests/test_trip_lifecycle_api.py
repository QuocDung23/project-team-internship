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
    }
    data.update(overrides)
    return data


class FakeTripLifecycleService:
    def create_trip(self, payload, current_user):
        return trip_response(code=payload.code, status=payload.status, created_by=current_user["user_id"])

    def list_trips(self, status, current_user):
        return [trip_response(status=status or TripStatus.SCHEDULED)]

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
        )

    def cancel_trip(self, trip_id, reason):
        return trip_response(trip_id=trip_id, status=TripStatus.CANCELLED, cancelled_reason=reason)

    def abort_trip(self, trip_id, reason):
        return trip_response(trip_id=trip_id, status=TripStatus.ABORTED, aborted_reason=reason)


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

        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.json()["status"], "scheduled")
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(len(listed.json()["trips"]), 1)
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

        self.assertEqual(created.status_code, 403)
        self.assertEqual(assigned.status_code, 403)
        self.assertEqual(read.status_code, 200)
        self.assertEqual(started.status_code, 200)
        self.assertEqual(completed.status_code, 200)
        self.assertEqual(cancelled.status_code, 403)
        self.assertEqual(aborted.status_code, 403)


if __name__ == "__main__":
    unittest.main()
