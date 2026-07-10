import unittest
from datetime import datetime, timezone

from backend.auth.roles import UserRole
from backend.models.driver import DriverStatus
from backend.models.trip import (
    AssignmentStatus,
    TripAssignRequest,
    TripCreate,
    TripStatus,
)
from backend.models.vehicle import VehicleStatus
from backend.services.trip_lifecycle_service import (
    InvalidTripStateTransitionError,
    TripAccessDeniedError,
    TripConflictError,
    TripLifecycleService,
)


NOW = datetime.now(timezone.utc)


def assignment(**overrides):
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


def trip(**overrides):
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


class FakeTripRepository:
    def __init__(self):
        self.trip = trip()
        self.assignment = None
        self.driver = {
            "driver_id": "driver-1",
            "email": "driver@example.com",
            "status": DriverStatus.ACTIVE,
        }
        self.vehicle = {
            "vehicle_id": "vehicle-1",
            "status": VehicleStatus.AVAILABLE,
        }
        self.driver_active_session = False
        self.driver_active_assignment = False
        self.vehicle_active_assignment = False

    def create_trip(self, **kwargs):
        self.trip = trip(**kwargs, trip_id="trip-2", created_at=NOW, updated_at=NOW)
        return self.trip

    def list_trips(self, status=None):
        if status and self.trip["status"] != status:
            return []
        return [self.trip]

    def list_trips_for_driver_email(self, driver_email, status=None):
        if driver_email.lower() != self.driver["email"]:
            return []
        return self.list_trips(status=status)

    def find_by_id(self, trip_id):
        return self.trip if trip_id == self.trip["trip_id"] else None

    def find_driver_by_id(self, driver_id):
        return self.driver if driver_id == self.driver["driver_id"] else None

    def find_vehicle_by_id(self, vehicle_id):
        return self.vehicle if vehicle_id == self.vehicle["vehicle_id"] else None

    def driver_has_active_session(self, driver_id):
        return driver_id == self.driver["driver_id"] and self.driver_active_session

    def find_active_assignment_for_trip(self, trip_id):
        if (
            trip_id == self.trip["trip_id"]
            and self.assignment is not None
            and self.assignment["status"] in {AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS}
        ):
            return self.assignment
        return None

    def driver_has_active_assignment(self, driver_id):
        return driver_id == self.driver["driver_id"] and self.driver_active_assignment

    def vehicle_has_active_assignment(self, vehicle_id):
        return vehicle_id == self.vehicle["vehicle_id"] and self.vehicle_active_assignment

    def driver_email_has_trip_assignment(self, trip_id, driver_email):
        return (
            trip_id == self.trip["trip_id"]
            and self.assignment is not None
            and driver_email.lower() == self.driver["email"]
        )

    def update_trip_status(self, trip_id, status, cancelled_reason=None, aborted_reason=None):
        if trip_id != self.trip["trip_id"]:
            return None
        self.trip["status"] = status
        self.trip["cancelled_reason"] = cancelled_reason
        self.trip["aborted_reason"] = aborted_reason
        return self.trip

    def assign_trip(self, trip_id, driver_id, vehicle_id):
        if trip_id != self.trip["trip_id"]:
            return None
        self.assignment = assignment(trip_id=trip_id, driver_id=driver_id, vehicle_id=vehicle_id)
        self.trip["status"] = TripStatus.ASSIGNED
        self.trip["assignment"] = self.assignment
        self.vehicle["status"] = VehicleStatus.ASSIGNED
        return self.trip

    def start_trip(self, trip_id):
        self.trip["status"] = TripStatus.IN_PROGRESS
        self.assignment["status"] = AssignmentStatus.IN_PROGRESS
        self.trip["assignment"] = self.assignment
        return self.trip

    def complete_trip(self, trip_id):
        self.trip["status"] = TripStatus.COMPLETED
        self.assignment["status"] = AssignmentStatus.COMPLETED
        self.assignment["unassigned_at"] = NOW
        self.trip["assignment"] = self.assignment
        self.vehicle["status"] = VehicleStatus.AVAILABLE
        return self.trip

    def cancel_trip(self, trip_id, reason):
        self.trip["status"] = TripStatus.CANCELLED
        self.trip["cancelled_reason"] = reason
        if self.assignment:
            self.assignment["status"] = AssignmentStatus.CANCELLED
            self.assignment["unassigned_at"] = NOW
            self.trip["assignment"] = self.assignment
        return self.trip

    def abort_trip(self, trip_id, reason):
        self.trip["status"] = TripStatus.ABORTED
        self.trip["aborted_reason"] = reason
        self.assignment["status"] = AssignmentStatus.RELEASED
        self.assignment["unassigned_at"] = NOW
        self.trip["assignment"] = self.assignment
        return self.trip


class TripLifecycleServiceTest(unittest.TestCase):
    def setUp(self):
        self.repository = FakeTripRepository()
        self.service = TripLifecycleService(self.repository)
        self.admin = {"user_id": "user-1", "role": UserRole.ADMIN, "email": "admin@example.com"}
        self.driver_user = {"role": UserRole.DRIVER, "email": "driver@example.com"}
        self.other_driver = {"role": UserRole.DRIVER, "email": "other@example.com"}

    def test_create_trip_allows_draft_or_scheduled_only(self):
        payload = TripCreate(code=" TRIP-002 ", status=TripStatus.SCHEDULED)

        created = self.service.create_trip(payload, current_user=self.admin)

        self.assertEqual(created["code"], "TRIP-002")
        self.assertEqual(created["status"], TripStatus.SCHEDULED)

    def test_assign_validates_state_driver_vehicle_and_active_assignments(self):
        assigned = self.service.assign_trip(
            "trip-1",
            TripAssignRequest(driver_id="driver-1", vehicle_id="vehicle-1"),
        )

        self.assertEqual(assigned["status"], TripStatus.ASSIGNED)
        self.assertEqual(assigned["assignment"]["driver_id"], "driver-1")

        self.repository.trip = trip(status=TripStatus.DRAFT)
        with self.assertRaises(InvalidTripStateTransitionError):
            self.service.assign_trip(
                "trip-1",
                TripAssignRequest(driver_id="driver-1", vehicle_id="vehicle-1"),
            )

    def test_assign_rejects_unavailable_vehicle_or_busy_driver(self):
        self.repository.vehicle["status"] = VehicleStatus.MAINTENANCE
        with self.assertRaises(TripConflictError):
            self.service.assign_trip(
                "trip-1",
                TripAssignRequest(driver_id="driver-1", vehicle_id="vehicle-1"),
            )

        self.repository.vehicle["status"] = VehicleStatus.AVAILABLE
        self.repository.driver_active_assignment = True
        with self.assertRaises(TripConflictError):
            self.service.assign_trip(
                "trip-1",
                TripAssignRequest(driver_id="driver-1", vehicle_id="vehicle-1"),
            )

    def test_start_requires_assignment_and_active_driver_session(self):
        self.service.assign_trip(
            "trip-1",
            TripAssignRequest(driver_id="driver-1", vehicle_id="vehicle-1"),
        )

        with self.assertRaises(TripConflictError):
            self.service.start_trip("trip-1", current_user=self.admin)

        self.repository.driver_active_session = True
        started = self.service.start_trip("trip-1", current_user=self.admin)

        self.assertEqual(started["status"], TripStatus.IN_PROGRESS)
        self.assertEqual(started["assignment"]["status"], AssignmentStatus.IN_PROGRESS)

    def test_complete_cancel_and_abort_release_assignments(self):
        self.service.assign_trip(
            "trip-1",
            TripAssignRequest(driver_id="driver-1", vehicle_id="vehicle-1"),
        )
        self.repository.driver_active_session = True
        self.service.start_trip("trip-1", current_user=self.admin)

        completed = self.service.complete_trip("trip-1", current_user=self.admin)

        self.assertEqual(completed["status"], TripStatus.COMPLETED)
        self.assertEqual(completed["assignment"]["status"], AssignmentStatus.COMPLETED)
        self.assertEqual(self.repository.vehicle["status"], VehicleStatus.AVAILABLE)

    def test_driver_can_read_start_and_complete_only_own_trip(self):
        self.service.assign_trip(
            "trip-1",
            TripAssignRequest(driver_id="driver-1", vehicle_id="vehicle-1"),
        )
        self.repository.driver_active_session = True

        own = self.service.get_trip("trip-1", current_user=self.driver_user)
        self.assertEqual(own["trip_id"], "trip-1")

        with self.assertRaises(TripAccessDeniedError):
            self.service.get_trip("trip-1", current_user=self.other_driver)

        started = self.service.start_trip("trip-1", current_user=self.driver_user)
        self.assertEqual(started["status"], TripStatus.IN_PROGRESS)
        completed = self.service.complete_trip("trip-1", current_user=self.driver_user)
        self.assertEqual(completed["status"], TripStatus.COMPLETED)

    def test_driver_cannot_operate_trip_with_different_active_assignment(self):
        self.service.assign_trip(
            "trip-1",
            TripAssignRequest(driver_id="driver-1", vehicle_id="vehicle-1"),
        )
        self.repository.assignment["driver_id"] = "driver-2"
        self.repository.driver_active_session = True

        with self.assertRaises(TripAccessDeniedError):
            self.service.start_trip("trip-1", current_user=self.driver_user)

    def test_cancel_and_abort_validate_allowed_states(self):
        cancelled = self.service.cancel_trip("trip-1", reason="weather")
        self.assertEqual(cancelled["status"], TripStatus.CANCELLED)

        self.repository.trip = trip(status=TripStatus.SCHEDULED)
        with self.assertRaises(InvalidTripStateTransitionError):
            self.service.abort_trip("trip-1", reason="incident")


if __name__ == "__main__":
    unittest.main()
