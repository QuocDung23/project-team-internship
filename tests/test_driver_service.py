import unittest
from datetime import datetime, timezone

from backend.auth.password import verify_password
from backend.auth.roles import UserRole
from backend.models.driver import DriverCheckInRequest, DriverCreate, DriverStatus, DriverUpdate
from backend.services.driver_service import (
    ActiveDriverSessionError,
    DriverAccessDeniedError,
    DriverConflictError,
    DriverService,
    InvalidDriverStatusTransitionError,
    NoActiveDriverSessionError,
)


NOW = datetime.now(timezone.utc)


def driver(**overrides):
    data = {
        "driver_id": "driver-1",
        "full_name": "Dana Driver",
        "license_number": "LIC-001",
        "phone": None,
        "email": "driver@example.com",
        "status": DriverStatus.ACTIVE,
        "baseline_ear": None,
        "created_at": NOW,
        "updated_at": NOW,
    }
    data.update(overrides)
    return data


def session(**overrides):
    data = {
        "driver_session_id": "session-1",
        "driver_id": "driver-1",
        "status": "active",
        "started_at": NOW,
        "ended_at": None,
        "device_label": None,
        "notes": None,
        "created_at": NOW,
    }
    data.update(overrides)
    return data


class FakeDriverRepository:
    def __init__(self):
        self.driver = driver()
        self.active_session = None
        self.created_sessions = []
        self.deleted = False
        self.created_user = None
        self.email_taken = False

    def list_drivers(self, status=None):
        if status and self.driver["status"] != status:
            return []
        return [self.driver]

    def find_by_id(self, driver_id):
        return self.driver if driver_id == self.driver["driver_id"] else None

    def find_by_email(self, email):
        return self.driver if email.lower() == self.driver["email"] else None

    def create_driver(self, **kwargs):
        self.driver = driver(**kwargs, driver_id="driver-2")
        return self.driver

    def email_is_taken(self, email):
        return self.email_taken

    def create_driver_with_user(self, **kwargs):
        self.created_user = {
            "full_name": kwargs["full_name"],
            "email": kwargs["email"],
            "password_hash": kwargs["password_hash"],
            "role": kwargs["user_role"],
            "status": kwargs["user_status"],
        }
        self.driver = driver(
            full_name=kwargs["full_name"],
            license_number=kwargs["license_number"],
            phone=kwargs["phone"],
            email=kwargs["email"],
            status=kwargs["status"],
            baseline_ear=kwargs["baseline_ear"],
            driver_id="driver-2",
        )
        return self.driver

    def update_driver(self, driver_id, changes):
        if driver_id != self.driver["driver_id"]:
            return None
        self.driver.update(changes)
        return self.driver

    def delete_driver(self, driver_id):
        self.deleted = driver_id == self.driver["driver_id"]
        return self.deleted

    def find_active_session(self, driver_id):
        return self.active_session if driver_id == self.driver["driver_id"] else None

    def create_session(self, **kwargs):
        created = session(driver_id=kwargs["driver_id"], device_label=kwargs["device_label"])
        self.active_session = created
        self.created_sessions.append(created)
        return created

    def end_active_session(self, driver_id, notes):
        if driver_id != self.driver["driver_id"] or self.active_session is None:
            return None
        ended = {**self.active_session, "status": "ended", "ended_at": NOW, "notes": notes}
        self.active_session = None
        return ended

    def list_sessions(self, driver_id):
        return self.created_sessions if driver_id == self.driver["driver_id"] else []


class DriverServiceTest(unittest.TestCase):
    def setUp(self):
        self.repository = FakeDriverRepository()
        self.service = DriverService(self.repository)
        self.admin = {"role": UserRole.ADMIN, "email": "admin@example.com"}
        self.driver_user = {"role": UserRole.DRIVER, "email": "driver@example.com"}
        self.other_driver = {"role": UserRole.DRIVER, "email": "other@example.com"}

    def test_create_driver_passes_validated_payload_to_repository(self):
        payload = DriverCreate(
            full_name=" New Driver ",
            license_number=" LIC-002 ",
            email="NEW@example.com",
            password="StrongPassword123!",
        )

        created = self.service.create_driver(payload)

        self.assertEqual(created["full_name"], "New Driver")
        self.assertEqual(created["license_number"], "LIC-002")
        self.assertEqual(created["email"], "new@example.com")
        self.assertEqual(self.repository.created_user["email"], "new@example.com")
        self.assertEqual(self.repository.created_user["role"], UserRole.DRIVER)
        self.assertEqual(self.repository.created_user["status"], "active")
        self.assertNotEqual(self.repository.created_user["password_hash"], "StrongPassword123!")
        self.assertTrue(verify_password("StrongPassword123!", self.repository.created_user["password_hash"]))

    def test_create_driver_rejects_existing_email(self):
        self.repository.email_taken = True
        payload = DriverCreate(
            full_name="New Driver",
            license_number="LIC-002",
            email="driver@example.com",
            password="StrongPassword123!",
        )

        with self.assertRaisesRegex(DriverConflictError, "email"):
            self.service.create_driver(payload)

        self.assertIsNone(self.repository.created_user)

    def test_driver_can_read_only_linked_profile(self):
        profile = self.service.get_driver("driver-1", current_user=self.driver_user)

        self.assertEqual(profile["driver_id"], "driver-1")
        with self.assertRaises(DriverAccessDeniedError):
            self.service.get_driver("driver-1", current_user=self.other_driver)

    def test_check_in_rejects_duplicate_active_session(self):
        self.service.check_in(
            driver_id="driver-1",
            device_label="kiosk",
            notes=None,
            current_user=self.driver_user,
        )

        with self.assertRaises(ActiveDriverSessionError):
            self.service.check_in(
                driver_id="driver-1",
                device_label=None,
                notes=None,
                current_user=self.driver_user,
            )

    def test_check_out_requires_active_session(self):
        with self.assertRaises(NoActiveDriverSessionError):
            self.service.check_out(driver_id="driver-1", notes=None, current_user=self.admin)

    def test_suspended_driver_cannot_check_in_or_reactivate_directly(self):
        self.repository.driver["status"] = DriverStatus.SUSPENDED

        with self.assertRaises(InvalidDriverStatusTransitionError):
            self.service.check_in(
                driver_id="driver-1",
                device_label=None,
                notes=None,
                current_user=self.admin,
            )
        with self.assertRaises(InvalidDriverStatusTransitionError):
            self.service.update_driver("driver-1", DriverUpdate(status=DriverStatus.ACTIVE))

    def test_check_in_request_strips_blank_notes(self):
        payload = DriverCheckInRequest(device_label="  cab tablet  ", notes="  ")

        self.assertEqual(payload.device_label, "cab tablet")
        self.assertIsNone(payload.notes)


if __name__ == "__main__":
    unittest.main()
