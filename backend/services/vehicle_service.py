from typing import Any

from sqlalchemy.exc import IntegrityError

from backend.auth.roles import UserRole
from backend.models.vehicle import VehicleCreate, VehicleStatus, VehicleUpdate
from backend.repositories.vehicle_repository import VehicleRepository


class VehicleNotFoundError(Exception):
    """Raised when a vehicle cannot be found."""


class VehicleAccessDeniedError(Exception):
    """Raised when a user cannot access a vehicle."""


class VehicleConflictError(Exception):
    """Raised when a vehicle write conflicts with existing data."""


class InvalidVehicleStatusError(Exception):
    """Raised when a requested vehicle status is invalid for current state."""


class VehicleService:
    def __init__(self, vehicle_repository: VehicleRepository | None = None):
        self.vehicle_repository = vehicle_repository or VehicleRepository()

    def list_vehicles(self, *, status: VehicleStatus | None = None) -> list[dict[str, Any]]:
        return self.vehicle_repository.list_vehicles(status=status)

    def create_vehicle(self, payload: VehicleCreate) -> dict[str, Any]:
        self._ensure_plate_number_is_unique(payload.plate_number)
        try:
            return self.vehicle_repository.create_vehicle(
                plate_number=payload.plate_number,
                vehicle_type=payload.vehicle_type,
                status=payload.status,
            )
        except IntegrityError as exc:
            raise VehicleConflictError("Vehicle plate number already exists.") from exc

    def get_vehicle(self, vehicle_id: str, *, current_user: dict[str, Any]) -> dict[str, Any]:
        vehicle = self.vehicle_repository.find_by_id(vehicle_id)
        if vehicle is None:
            raise VehicleNotFoundError("Vehicle not found.")
        self._ensure_can_read_vehicle(vehicle_id, current_user=current_user)
        return vehicle

    def update_vehicle(self, vehicle_id: str, payload: VehicleUpdate) -> dict[str, Any]:
        current = self.vehicle_repository.find_by_id(vehicle_id)
        if current is None:
            raise VehicleNotFoundError("Vehicle not found.")

        changes = payload.model_dump(exclude_unset=True)
        requested_plate = changes.get("plate_number")
        if requested_plate is not None and requested_plate != current["plate_number"]:
            self._ensure_plate_number_is_unique(requested_plate, vehicle_id=vehicle_id)

        requested_status = changes.get("status")
        if requested_status is not None:
            self._validate_status_change(vehicle_id, requested_status)

        try:
            updated = self.vehicle_repository.update_vehicle(vehicle_id, changes)
        except IntegrityError as exc:
            raise VehicleConflictError("Vehicle plate number already exists.") from exc
        if updated is None:
            raise VehicleNotFoundError("Vehicle not found.")
        return updated

    def update_availability(self, vehicle_id: str, status: VehicleStatus) -> dict[str, Any]:
        current = self.vehicle_repository.find_by_id(vehicle_id)
        if current is None:
            raise VehicleNotFoundError("Vehicle not found.")
        self._validate_status_change(vehicle_id, status)
        updated = self.vehicle_repository.update_vehicle(vehicle_id, {"status": status})
        if updated is None:
            raise VehicleNotFoundError("Vehicle not found.")
        return updated

    def delete_vehicle(self, vehicle_id: str) -> None:
        if self.vehicle_repository.find_by_id(vehicle_id) is None:
            raise VehicleNotFoundError("Vehicle not found.")
        if self.vehicle_repository.has_active_assignment(vehicle_id):
            raise VehicleConflictError("Vehicle has an active assignment and cannot be deleted.")
        try:
            deleted = self.vehicle_repository.delete_vehicle(vehicle_id)
        except IntegrityError as exc:
            raise VehicleConflictError("Vehicle has related records and cannot be deleted.") from exc
        if not deleted:
            raise VehicleNotFoundError("Vehicle not found.")

    def _ensure_plate_number_is_unique(
        self,
        plate_number: str,
        *,
        vehicle_id: str | None = None,
    ) -> None:
        existing = self.vehicle_repository.find_by_plate_number(plate_number)
        if existing is not None and existing["vehicle_id"] != vehicle_id:
            raise VehicleConflictError("Vehicle plate number already exists.")

    def _validate_status_change(self, vehicle_id: str, requested_status: VehicleStatus) -> None:
        if (
            requested_status == VehicleStatus.AVAILABLE
            and self.vehicle_repository.has_active_assignment(vehicle_id)
        ):
            raise InvalidVehicleStatusError(
                "Vehicle has an active assignment and cannot be marked available."
            )

    def _ensure_can_read_vehicle(
        self,
        vehicle_id: str,
        *,
        current_user: dict[str, Any],
    ) -> None:
        role = current_user["role"]
        if role in {UserRole.ADMIN, UserRole.DISPATCHER}:
            return
        if role == UserRole.DRIVER:
            email = (current_user.get("email") or "").strip()
            if email and self.vehicle_repository.driver_has_active_assignment(
                vehicle_id=vehicle_id,
                driver_email=email,
            ):
                return
        raise VehicleAccessDeniedError("Insufficient permissions for this vehicle.")
