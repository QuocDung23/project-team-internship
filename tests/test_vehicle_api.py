import unittest
from datetime import datetime, timezone

from fastapi.testclient import TestClient

from backend.api.routes.vehicles import get_vehicle_service
from backend.app import app
from backend.auth.dependencies import get_current_user
from backend.auth.roles import UserRole
from backend.models.vehicle import VehicleStatus


NOW = datetime.now(timezone.utc)


def vehicle_response(**overrides):
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


class FakeVehicleService:
    def __init__(self):
        self.created_payload = None

    def create_vehicle(self, payload):
        self.created_payload = payload
        return vehicle_response(
            plate_number=payload.plate_number,
            vehicle_type=payload.vehicle_type,
            status=payload.status,
        )

    def list_vehicles(self, status=None):
        return [vehicle_response(status=status or VehicleStatus.AVAILABLE)]

    def get_vehicle(self, vehicle_id, current_user):
        return vehicle_response(vehicle_id=vehicle_id)

    def update_vehicle(self, vehicle_id, payload):
        return vehicle_response(vehicle_id=vehicle_id, **payload.model_dump(exclude_unset=True))

    def update_availability(self, vehicle_id, status):
        return vehicle_response(vehicle_id=vehicle_id, status=status)

    def delete_vehicle(self, vehicle_id):
        return None


class VehicleApiTest(unittest.TestCase):
    def setUp(self):
        self.service = FakeVehicleService()
        app.dependency_overrides[get_vehicle_service] = lambda: self.service
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

    def test_vehicle_endpoints_require_authentication(self):
        response = self.client.get("/api/v1/vehicles/vehicle-1")

        self.assertEqual(response.status_code, 401)

    def test_admin_can_create_list_update_availability_and_delete_vehicles(self):
        self.authenticate_as(UserRole.ADMIN)

        created = self.client.post(
            "/api/v1/vehicles",
            json={"plate_number": " 51a-12345 ", "vehicle_type": " Van "},
        )
        listed = self.client.get("/api/v1/vehicles")
        updated = self.client.patch(
            "/api/v1/vehicles/vehicle-1",
            json={"vehicle_type": "coach"},
        )
        availability = self.client.patch(
            "/api/v1/vehicles/vehicle-1/availability",
            json={"status": "maintenance"},
        )
        deleted = self.client.delete("/api/v1/vehicles/vehicle-1")

        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.json()["plate_number"], "51A-12345")
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(len(listed.json()["vehicles"]), 1)
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.json()["vehicle_type"], "coach")
        self.assertEqual(availability.status_code, 200)
        self.assertEqual(availability.json()["status"], "maintenance")
        self.assertEqual(deleted.status_code, 204)

    def test_driver_cannot_create_list_update_or_delete_vehicles(self):
        self.authenticate_as(UserRole.DRIVER, email="driver@example.com")

        listed = self.client.get("/api/v1/vehicles")
        created = self.client.post("/api/v1/vehicles", json={"plate_number": "51A-22222"})
        updated = self.client.patch("/api/v1/vehicles/vehicle-1", json={"status": "inactive"})
        deleted = self.client.delete("/api/v1/vehicles/vehicle-1")

        self.assertEqual(listed.status_code, 403)
        self.assertEqual(created.status_code, 403)
        self.assertEqual(updated.status_code, 403)
        self.assertEqual(deleted.status_code, 403)

    def test_authenticated_driver_can_call_read_endpoint_for_assignment_context(self):
        self.authenticate_as(UserRole.DRIVER, email="driver@example.com")

        response = self.client.get("/api/v1/vehicles/vehicle-1")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["vehicle_id"], "vehicle-1")


if __name__ == "__main__":
    unittest.main()
