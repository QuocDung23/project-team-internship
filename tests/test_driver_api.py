import unittest
from datetime import datetime, timezone

from fastapi.testclient import TestClient

from backend.api.routes.drivers import get_driver_service
from backend.app import app
from backend.auth.dependencies import get_current_user
from backend.auth.roles import UserRole
from backend.models.driver import DriverStatus
from backend.services.driver_service import DriverConflictError


NOW = datetime.now(timezone.utc)


def driver_response(**overrides):
    data = {
        "driver_id": "driver-1",
        "driver_code": "DRV-001",
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


def session_response(**overrides):
    data = {
        "driver_session_id": "session-1",
        "driver_id": "driver-1",
        "status": "active",
        "started_at": NOW,
        "ended_at": None,
        "device_label": "cab tablet",
        "notes": None,
        "created_at": NOW,
    }
    data.update(overrides)
    return data


class FakeDriverService:
    def __init__(self):
        self.created_payload = None
        self.raise_create_conflict = False

    def create_driver(self, payload):
        if self.raise_create_conflict:
            raise DriverConflictError("Driver email already exists.")
        self.created_payload = payload
        return driver_response(full_name=payload.full_name, license_number=payload.license_number)

    def list_drivers(self, status=None):
        return [driver_response(status=status or DriverStatus.ACTIVE)]

    def get_my_driver_profile(self, current_user):
        return driver_response(email=current_user["email"])

    def get_driver(self, driver_id, current_user):
        return driver_response(driver_id=driver_id)

    def update_driver(self, driver_id, payload):
        return driver_response(driver_id=driver_id, **payload.model_dump(exclude_unset=True))

    def delete_driver(self, driver_id):
        return None

    def check_in(self, driver_id, device_label, notes, current_user):
        return session_response(driver_id=driver_id, device_label=device_label, notes=notes)

    def check_out(self, driver_id, notes, current_user):
        return session_response(driver_id=driver_id, status="ended", ended_at=NOW, notes=notes)

    def list_sessions(self, driver_id, current_user):
        return [session_response(driver_id=driver_id)]


class DriverApiTest(unittest.TestCase):
    def setUp(self):
        self.service = FakeDriverService()
        app.dependency_overrides[get_driver_service] = lambda: self.service
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

    def test_driver_endpoints_require_authentication(self):
        response = self.client.get("/api/v1/drivers/driver-1")

        self.assertEqual(response.status_code, 401)

    def test_admin_can_create_and_list_drivers(self):
        self.authenticate_as(UserRole.ADMIN)

        created = self.client.post(
            "/api/v1/drivers",
            json={
                "full_name": " Dana Driver ",
                "license_number": " LIC-001 ",
                "email": "driver@example.com",
                "password": "StrongPassword123!",
            },
        )
        listed = self.client.get("/api/v1/drivers")

        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.json()["driver_code"], "DRV-001")
        self.assertEqual(created.json()["full_name"], "Dana Driver")
        self.assertNotIn("password", created.json())
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(len(listed.json()["drivers"]), 1)

    def test_admin_create_driver_requires_usable_password(self):
        self.authenticate_as(UserRole.ADMIN)

        missing = self.client.post(
            "/api/v1/drivers",
            json={
                "full_name": "Dana Driver",
                "license_number": "LIC-001",
                "email": "driver@example.com",
            },
        )
        short = self.client.post(
            "/api/v1/drivers",
            json={
                "full_name": "Dana Driver",
                "license_number": "LIC-001",
                "email": "driver@example.com",
                "password": "short",
            },
        )

        self.assertEqual(missing.status_code, 422)
        self.assertEqual(short.status_code, 422)

    def test_admin_create_driver_conflict_returns_409(self):
        self.authenticate_as(UserRole.ADMIN)
        self.service.raise_create_conflict = True

        created = self.client.post(
            "/api/v1/drivers",
            json={
                "full_name": "Dana Driver",
                "license_number": "LIC-001",
                "email": "driver@example.com",
                "password": "StrongPassword123!",
            },
        )

        self.assertEqual(created.status_code, 409)
        self.assertIn("email", created.json()["detail"])

    def test_driver_cannot_list_or_create_drivers(self):
        self.authenticate_as(UserRole.DRIVER, email="driver@example.com")

        listed = self.client.get("/api/v1/drivers")
        created = self.client.post(
            "/api/v1/drivers",
            json={
                "full_name": "Other",
                "license_number": "LIC-002",
                "email": "other@example.com",
                "password": "StrongPassword123!",
            },
        )

        self.assertEqual(listed.status_code, 403)
        self.assertEqual(created.status_code, 403)

    def test_driver_can_read_own_profile_and_check_in_out(self):
        self.authenticate_as(UserRole.DRIVER, email="driver@example.com")

        me = self.client.get("/api/v1/drivers/me")
        check_in = self.client.post(
            "/api/v1/drivers/driver-1/check-in",
            json={"device_label": "cab tablet"},
        )
        check_out = self.client.post(
            "/api/v1/drivers/driver-1/check-out",
            json={"notes": "done"},
        )
        sessions = self.client.get("/api/v1/drivers/driver-1/sessions")

        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.json()["email"], "driver@example.com")
        self.assertEqual(check_in.status_code, 200)
        self.assertEqual(check_in.json()["status"], "active")
        self.assertEqual(check_out.status_code, 200)
        self.assertEqual(check_out.json()["status"], "ended")
        self.assertEqual(sessions.status_code, 200)
        self.assertEqual(len(sessions.json()["sessions"]), 1)


if __name__ == "__main__":
    unittest.main()
