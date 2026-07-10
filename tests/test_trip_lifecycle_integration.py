import unittest
from datetime import datetime, timezone

from fastapi.testclient import TestClient

from backend.api.routes.drivers import get_driver_service
from backend.api.routes.trips import get_trip_lifecycle_service
from backend.api.routes.vehicles import get_vehicle_service
from backend.app import app
from backend.auth.dependencies import get_current_user
from backend.auth.roles import UserRole
from backend.models.driver import DriverSessionStatus, DriverStatus
from backend.models.trip import AssignmentStatus, TripStatus
from backend.models.vehicle import VehicleStatus
from backend.services.trip_lifecycle_service import TripLifecycleService


NOW = datetime.now(timezone.utc)


class WorkflowState:
    def __init__(self):
        self.driver = None
        self.driver_session_active = False
        self.vehicle = None
        self.trip = None
        self.assignment = None


class WorkflowDriverService:
    def __init__(self, state):
        self.state = state

    def create_driver(self, payload):
        self.state.driver = {
            "driver_id": "driver-1",
            "full_name": payload.full_name,
            "license_number": payload.license_number,
            "phone": payload.phone,
            "email": payload.email,
            "status": payload.status,
            "baseline_ear": payload.baseline_ear,
            "created_at": NOW,
            "updated_at": NOW,
        }
        return self.state.driver

    def list_drivers(self, status=None):
        return [self.state.driver] if self.state.driver else []

    def get_my_driver_profile(self, current_user):
        return self.state.driver

    def get_driver(self, driver_id, current_user):
        return self.state.driver

    def update_driver(self, driver_id, payload):
        self.state.driver.update(payload.model_dump(exclude_unset=True))
        return self.state.driver

    def delete_driver(self, driver_id):
        self.state.driver = None

    def check_in(self, driver_id, device_label, notes, current_user):
        self.state.driver_session_active = True
        return {
            "driver_session_id": "session-1",
            "driver_id": driver_id,
            "status": DriverSessionStatus.ACTIVE,
            "started_at": NOW,
            "ended_at": None,
            "device_label": device_label,
            "notes": notes,
            "created_at": NOW,
        }

    def check_out(self, driver_id, notes, current_user):
        self.state.driver_session_active = False
        return {
            "driver_session_id": "session-1",
            "driver_id": driver_id,
            "status": DriverSessionStatus.ENDED,
            "started_at": NOW,
            "ended_at": NOW,
            "device_label": None,
            "notes": notes,
            "created_at": NOW,
        }

    def list_sessions(self, driver_id, current_user):
        return []


class WorkflowVehicleService:
    def __init__(self, state):
        self.state = state

    def create_vehicle(self, payload):
        self.state.vehicle = {
            "vehicle_id": "vehicle-1",
            "plate_number": payload.plate_number,
            "vehicle_type": payload.vehicle_type,
            "status": payload.status,
            "created_at": NOW,
            "updated_at": NOW,
        }
        return self.state.vehicle

    def list_vehicles(self, status=None):
        return [self.state.vehicle] if self.state.vehicle else []

    def get_vehicle(self, vehicle_id, current_user):
        return self.state.vehicle

    def update_vehicle(self, vehicle_id, payload):
        self.state.vehicle.update(payload.model_dump(exclude_unset=True))
        return self.state.vehicle

    def update_availability(self, vehicle_id, status):
        self.state.vehicle["status"] = status
        return self.state.vehicle

    def delete_vehicle(self, vehicle_id):
        self.state.vehicle = None


class WorkflowTripRepository:
    def __init__(self, state):
        self.state = state

    def create_trip(self, **kwargs):
        self.state.trip = {
            "trip_id": "trip-1",
            "code": kwargs["code"],
            "status": kwargs["status"],
            "planned_start_at": kwargs["planned_start_at"],
            "planned_end_at": kwargs["planned_end_at"],
            "actual_start_at": None,
            "actual_end_at": None,
            "origin": kwargs["origin"],
            "destination": kwargs["destination"],
            "cancelled_reason": None,
            "aborted_reason": None,
            "created_by": kwargs["created_by"],
            "created_at": NOW,
            "updated_at": NOW,
            "assignment": None,
        }
        return self.state.trip

    def list_trips(self, status=None):
        return [self.state.trip] if self.state.trip else []

    def list_trips_for_driver_email(self, driver_email, status=None):
        return []

    def find_by_id(self, trip_id):
        return self.state.trip if self.state.trip and trip_id == self.state.trip["trip_id"] else None

    def find_driver_by_id(self, driver_id):
        if self.state.driver and driver_id == self.state.driver["driver_id"]:
            return {
                "driver_id": driver_id,
                "email": self.state.driver["email"],
                "status": self.state.driver["status"],
            }
        return None

    def find_vehicle_by_id(self, vehicle_id):
        return self.state.vehicle if self.state.vehicle and vehicle_id == self.state.vehicle["vehicle_id"] else None

    def driver_has_active_session(self, driver_id):
        return self.state.driver_session_active

    def find_active_assignment_for_trip(self, trip_id):
        if (
            self.state.assignment
            and self.state.assignment["trip_id"] == trip_id
            and self.state.assignment["status"] in {AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS}
        ):
            return self.state.assignment
        return None

    def driver_has_active_assignment(self, driver_id):
        return self.state.assignment is not None and self.state.assignment["status"] in {
            AssignmentStatus.ASSIGNED,
            AssignmentStatus.IN_PROGRESS,
        }

    def vehicle_has_active_assignment(self, vehicle_id):
        return self.driver_has_active_assignment(vehicle_id)

    def driver_email_has_trip_assignment(self, trip_id, driver_email):
        return False

    def update_trip_status(self, trip_id, status, cancelled_reason=None, aborted_reason=None):
        self.state.trip["status"] = status
        return self.state.trip

    def assign_trip(self, trip_id, driver_id, vehicle_id):
        self.state.assignment = {
            "trip_assignment_id": "assignment-1",
            "trip_id": trip_id,
            "driver_id": driver_id,
            "vehicle_id": vehicle_id,
            "status": AssignmentStatus.ASSIGNED,
            "assigned_at": NOW,
            "unassigned_at": None,
            "created_at": NOW,
        }
        self.state.trip["status"] = TripStatus.ASSIGNED
        self.state.trip["assignment"] = self.state.assignment
        self.state.vehicle["status"] = VehicleStatus.ASSIGNED
        return self.state.trip

    def start_trip(self, trip_id):
        self.state.trip["status"] = TripStatus.IN_PROGRESS
        self.state.trip["actual_start_at"] = NOW
        self.state.assignment["status"] = AssignmentStatus.IN_PROGRESS
        return self.state.trip

    def complete_trip(self, trip_id):
        self.state.trip["status"] = TripStatus.COMPLETED
        self.state.trip["actual_end_at"] = NOW
        self.state.assignment["status"] = AssignmentStatus.COMPLETED
        self.state.assignment["unassigned_at"] = NOW
        self.state.vehicle["status"] = VehicleStatus.AVAILABLE
        return self.state.trip

    def cancel_trip(self, trip_id, reason):
        self.state.trip["status"] = TripStatus.CANCELLED
        self.state.trip["cancelled_reason"] = reason
        return self.state.trip

    def abort_trip(self, trip_id, reason):
        self.state.trip["status"] = TripStatus.ABORTED
        self.state.trip["aborted_reason"] = reason
        return self.state.trip


class TripLifecycleIntegrationTest(unittest.TestCase):
    def setUp(self):
        self.state = WorkflowState()
        app.dependency_overrides[get_current_user] = lambda: {
            "user_id": "user-1",
            "full_name": "Admin User",
            "email": "admin@example.com",
            "role": UserRole.ADMIN,
            "status": "active",
            "created_at": NOW,
            "updated_at": NOW,
        }
        app.dependency_overrides[get_driver_service] = lambda: WorkflowDriverService(self.state)
        app.dependency_overrides[get_vehicle_service] = lambda: WorkflowVehicleService(self.state)
        app.dependency_overrides[get_trip_lifecycle_service] = lambda: TripLifecycleService(
            WorkflowTripRepository(self.state)
        )
        self.client = TestClient(app)

    def tearDown(self):
        app.dependency_overrides.clear()

    def test_admin_workflow_create_driver_check_in_vehicle_trip_assign_start_complete(self):
        driver = self.client.post(
            "/api/v1/drivers",
            json={
                "full_name": "Dana Driver",
                "license_number": "LIC-001",
                "email": "driver@example.com",
            },
        )
        check_in = self.client.post(
            "/api/v1/drivers/driver-1/check-in",
            json={"device_label": "cab tablet"},
        )
        vehicle = self.client.post(
            "/api/v1/vehicles",
            json={"plate_number": "51A-12345", "vehicle_type": "van"},
        )
        trip = self.client.post(
            "/api/v1/trips",
            json={"code": "TRIP-001", "status": "scheduled"},
        )
        assigned = self.client.post(
            "/api/v1/trips/trip-1/assign",
            json={"driver_id": "driver-1", "vehicle_id": "vehicle-1"},
        )
        started = self.client.post("/api/v1/trips/trip-1/start")
        completed = self.client.post("/api/v1/trips/trip-1/complete")

        self.assertEqual(driver.status_code, 201)
        self.assertEqual(check_in.status_code, 200)
        self.assertEqual(vehicle.status_code, 201)
        self.assertEqual(trip.status_code, 201)
        self.assertEqual(assigned.status_code, 200)
        self.assertEqual(assigned.json()["status"], "assigned")
        self.assertEqual(started.status_code, 200)
        self.assertEqual(started.json()["status"], "in_progress")
        self.assertEqual(completed.status_code, 200)
        self.assertEqual(completed.json()["status"], "completed")
        self.assertEqual(completed.json()["assignment"]["status"], "completed")
        self.assertEqual(self.state.vehicle["status"], VehicleStatus.AVAILABLE)


if __name__ == "__main__":
    unittest.main()
