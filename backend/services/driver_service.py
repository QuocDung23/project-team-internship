from typing import Any

from sqlalchemy.exc import IntegrityError

from backend.auth.roles import UserRole
from backend.models.driver import DriverCreate, DriverStatus, DriverUpdate
from backend.repositories.driver_repository import DriverRepository


class DriverNotFoundError(Exception):
    """Raised when a driver profile cannot be found."""


class DriverAccessDeniedError(Exception):
    """Raised when a user cannot access a driver profile."""


class DriverConflictError(Exception):
    """Raised when a driver write conflicts with existing data."""


class ActiveDriverSessionError(Exception):
    """Raised when check-in would create a duplicate active session."""


class NoActiveDriverSessionError(Exception):
    """Raised when check-out has no active session to end."""


class InvalidDriverStatusTransitionError(Exception):
    """Raised when a requested driver status change is not allowed."""


ALLOWED_DRIVER_STATUS_TRANSITIONS: dict[DriverStatus, set[DriverStatus]] = {
    DriverStatus.ACTIVE: {DriverStatus.INACTIVE, DriverStatus.SUSPENDED},
    DriverStatus.INACTIVE: {DriverStatus.ACTIVE, DriverStatus.SUSPENDED},
    DriverStatus.SUSPENDED: {DriverStatus.INACTIVE},
}


class DriverService:
    def __init__(self, driver_repository: DriverRepository | None = None):
        self.driver_repository = driver_repository or DriverRepository()

    def list_drivers(self, *, status: DriverStatus | None = None) -> list[dict[str, Any]]:
        return self.driver_repository.list_drivers(status=status)

    def create_driver(self, payload: DriverCreate) -> dict[str, Any]:
        try:
            return self.driver_repository.create_driver(
                full_name=payload.full_name,
                license_number=payload.license_number,
                phone=payload.phone,
                email=payload.email,
                status=payload.status,
                baseline_ear=payload.baseline_ear,
            )
        except IntegrityError as exc:
            raise DriverConflictError("Driver license number already exists.") from exc

    def get_driver(self, driver_id: str, *, current_user: dict[str, Any]) -> dict[str, Any]:
        driver = self.driver_repository.find_by_id(driver_id)
        if driver is None:
            raise DriverNotFoundError("Driver not found.")
        self._ensure_can_read_driver(driver, current_user=current_user)
        return driver

    def get_my_driver_profile(self, *, current_user: dict[str, Any]) -> dict[str, Any]:
        driver = self.driver_repository.find_by_email(current_user["email"])
        if driver is None:
            raise DriverNotFoundError("No driver profile is linked to this user.")
        self._ensure_can_read_driver(driver, current_user=current_user)
        return driver

    def update_driver(self, driver_id: str, payload: DriverUpdate) -> dict[str, Any]:
        current = self.driver_repository.find_by_id(driver_id)
        if current is None:
            raise DriverNotFoundError("Driver not found.")

        changes = payload.model_dump(exclude_unset=True)
        requested_status = changes.get("status")
        if requested_status is not None:
            self._validate_status_transition(current["status"], requested_status)

        try:
            updated = self.driver_repository.update_driver(driver_id, changes)
        except IntegrityError as exc:
            raise DriverConflictError("Driver license number already exists.") from exc
        if updated is None:
            raise DriverNotFoundError("Driver not found.")
        return updated

    def delete_driver(self, driver_id: str) -> None:
        try:
            deleted = self.driver_repository.delete_driver(driver_id)
        except IntegrityError as exc:
            raise DriverConflictError("Driver has related records and cannot be deleted.") from exc
        if not deleted:
            raise DriverNotFoundError("Driver not found.")

    def check_in(
        self,
        *,
        driver_id: str,
        device_label: str | None,
        notes: str | None,
        current_user: dict[str, Any],
    ) -> dict[str, Any]:
        driver = self.driver_repository.find_by_id(driver_id)
        if driver is None:
            raise DriverNotFoundError("Driver not found.")
        self._ensure_can_operate_session(driver, current_user=current_user)
        if driver["status"] != DriverStatus.ACTIVE:
            raise InvalidDriverStatusTransitionError("Only active drivers can check in.")
        if self.driver_repository.find_active_session(driver_id) is not None:
            raise ActiveDriverSessionError("Driver already has an active session.")
        try:
            return self.driver_repository.create_session(
                driver_id=driver_id,
                device_label=device_label,
                notes=notes,
            )
        except IntegrityError as exc:
            raise ActiveDriverSessionError("Driver already has an active session.") from exc

    def check_out(
        self,
        *,
        driver_id: str,
        notes: str | None,
        current_user: dict[str, Any],
    ) -> dict[str, Any]:
        driver = self.driver_repository.find_by_id(driver_id)
        if driver is None:
            raise DriverNotFoundError("Driver not found.")
        self._ensure_can_operate_session(driver, current_user=current_user)
        session = self.driver_repository.end_active_session(driver_id=driver_id, notes=notes)
        if session is None:
            raise NoActiveDriverSessionError("Driver has no active session.")
        return session

    def list_sessions(
        self,
        *,
        driver_id: str,
        current_user: dict[str, Any],
    ) -> list[dict[str, Any]]:
        driver = self.driver_repository.find_by_id(driver_id)
        if driver is None:
            raise DriverNotFoundError("Driver not found.")
        self._ensure_can_read_driver(driver, current_user=current_user)
        return self.driver_repository.list_sessions(driver_id)

    def _validate_status_transition(self, current: DriverStatus, requested: DriverStatus) -> None:
        if current == requested:
            return
        if requested not in ALLOWED_DRIVER_STATUS_TRANSITIONS[current]:
            raise InvalidDriverStatusTransitionError(
                f"Cannot change driver status from {current.value} to {requested.value}."
            )

    def _ensure_can_read_driver(
        self,
        driver: dict[str, Any],
        *,
        current_user: dict[str, Any],
    ) -> None:
        role = current_user["role"]
        if role == UserRole.ADMIN:
            return
        if role == UserRole.DRIVER and self._is_linked_driver(driver, current_user):
            return
        raise DriverAccessDeniedError("Insufficient permissions for this driver.")

    def _ensure_can_operate_session(
        self,
        driver: dict[str, Any],
        *,
        current_user: dict[str, Any],
    ) -> None:
        role = current_user["role"]
        if role == UserRole.ADMIN:
            return
        if role == UserRole.DRIVER and self._is_linked_driver(driver, current_user):
            return
        raise DriverAccessDeniedError("Insufficient permissions for this driver.")

    def _is_linked_driver(self, driver: dict[str, Any], current_user: dict[str, Any]) -> bool:
        driver_email = (driver.get("email") or "").strip().lower()
        user_email = (current_user.get("email") or "").strip().lower()
        return bool(driver_email and user_email and driver_email == user_email)
