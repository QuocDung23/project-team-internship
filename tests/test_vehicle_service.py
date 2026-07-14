import unittest
from datetime import datetime, timezone

from backend.auth.roles import UserRole
from backend.models.vehicle import VehicleCreate, VehicleStatus, VehicleUpdate
from backend.services.vehicle_service import (
    InvalidVehicleStatusError,
    VehicleAccessDeniedError,
    VehicleConflictError,
    VehicleService,
)


NOW = datetime.now(timezone.utc)


def vehicle(**overrides):
    data = {
        "vehicle_id": "vehicle-1",
        "plate_number": "51A-12345",
        "vehicle_type": "van",
        "status": VehicleStatus.AVAILABLE,
        "created_at": NOW,
        "updated_at": NOW,
    }
    data.update(overrides)
    return data


class FakeVehicleRepository:
    def __init__(self):
        self.vehicle = vehicle()
        self.active_assignment = False
        self.driver_assignment_email = None
        self.deleted = False

    def list_vehicles(self, status=None):
        if status and self.vehicle["status"] != status:
            return []
        return [self.vehicle]

    def find_by_id(self, vehicle_id):
        return self.vehicle if vehicle_id == self.vehicle["vehicle_id"] else None

    def find_by_plate_number(self, plate_number):
        if self.vehicle["plate_number"].upper() == plate_number.upper():
            return self.vehicle
        return None

    def create_vehicle(self, **kwargs):
        self.vehicle = vehicle(**kwargs, vehicle_id="vehicle-2")
        return self.vehicle

    def update_vehicle(self, vehicle_id, changes):
        if vehicle_id != self.vehicle["vehicle_id"]:
            return None
        self.vehicle.update(changes)
        return self.vehicle

    def delete_vehicle(self, vehicle_id):
        self.deleted = vehicle_id == self.vehicle["vehicle_id"]
        return self.deleted

    def has_active_assignment(self, vehicle_id):
        return vehicle_id == self.vehicle["vehicle_id"] and self.active_assignment

    def driver_has_active_assignment(self, vehicle_id, driver_email):
        return (
            vehicle_id == self.vehicle["vehicle_id"]
            and self.driver_assignment_email is not None
            and self.driver_assignment_email.lower() == driver_email.lower()
        )


class VehicleServiceTest(unittest.TestCase):
    def setUp(self):
        self.repository = FakeVehicleRepository()
        self.service = VehicleService(self.repository)
        self.admin = {"role": UserRole.ADMIN, "email": "admin@example.com"}
        self.driver_user = {"role": UserRole.DRIVER, "email": "driver@example.com"}
        self.other_driver = {"role": UserRole.DRIVER, "email": "other@example.com"}

    def test_create_vehicle_normalizes_plate_and_passes_payload(self):
        payload = VehicleCreate(plate_number=" 51a-77777 ", vehicle_type="  Bus ")

        created = self.service.create_vehicle(payload)

        self.assertEqual(created["plate_number"], "51A-77777")
        self.assertEqual(created["vehicle_type"], "Bus")

    def test_duplicate_plate_is_rejected_case_insensitively(self):
        payload = VehicleCreate(plate_number="51a-12345")

        with self.assertRaises(VehicleConflictError):
            self.service.create_vehicle(payload)

    def test_active_assignment_blocks_available_status_and_delete(self):
        self.repository.active_assignment = True

        with self.assertRaises(InvalidVehicleStatusError):
            self.service.update_availability("vehicle-1", VehicleStatus.AVAILABLE)
        with self.assertRaises(VehicleConflictError):
            self.service.delete_vehicle("vehicle-1")

    def test_vehicle_can_be_marked_maintenance_when_assigned(self):
        self.repository.active_assignment = True

        updated = self.service.update_vehicle(
            "vehicle-1",
            VehicleUpdate(status=VehicleStatus.MAINTENANCE),
        )

        self.assertEqual(updated["status"], VehicleStatus.MAINTENANCE)

    def test_driver_can_read_only_active_assignment_vehicle(self):
        self.repository.driver_assignment_email = "driver@example.com"

        read = self.service.get_vehicle("vehicle-1", current_user=self.driver_user)

        self.assertEqual(read["vehicle_id"], "vehicle-1")
        with self.assertRaises(VehicleAccessDeniedError):
            self.service.get_vehicle("vehicle-1", current_user=self.other_driver)


if __name__ == "__main__":
    unittest.main()
