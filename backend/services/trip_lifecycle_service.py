from typing import Any

from sqlalchemy.exc import IntegrityError

from backend.auth.roles import UserRole
from backend.models.driver import DriverStatus
from backend.models.trip import StartMyTripRequest, TripAssignRequest, TripCreate, TripStatus
from backend.models.vehicle import VehicleStatus
from backend.repositories.trip_repository import TripRepository
from backend.services.safety_service import calculate_safety_score, safety_grade


class TripNotFoundError(Exception):
    """Raised when a trip cannot be found."""


class TripAccessDeniedError(Exception):
    """Raised when a user cannot access or operate a trip."""


class TripConflictError(Exception):
    """Raised when trip data conflicts with existing active records."""


class InvalidTripStateTransitionError(Exception):
    """Raised when a trip state transition is not allowed."""


ALLOWED_TRANSITIONS: dict[TripStatus, set[TripStatus]] = {
    TripStatus.DRAFT: {TripStatus.SCHEDULED, TripStatus.CANCELLED},
    TripStatus.SCHEDULED: {TripStatus.ASSIGNED, TripStatus.CANCELLED},
    TripStatus.ASSIGNED: {TripStatus.IN_PROGRESS, TripStatus.CANCELLED},
    TripStatus.IN_PROGRESS: {TripStatus.COMPLETED, TripStatus.ABORTED},
    TripStatus.COMPLETED: set(),
    TripStatus.CANCELLED: set(),
    TripStatus.ABORTED: set(),
}


class TripLifecycleService:
    def __init__(self, trip_repository: TripRepository | None = None):
        self.trip_repository = trip_repository or TripRepository()

    def create_trip(self, payload: TripCreate, *, current_user: dict[str, Any]) -> dict[str, Any]:
        try:
            return self.trip_repository.create_trip(
                code=payload.code,
                status=payload.status,
                planned_start_at=payload.planned_start_at,
                planned_end_at=payload.planned_end_at,
                origin=payload.origin,
                destination=payload.destination,
                created_by=current_user.get("user_id"),
            )
        except IntegrityError as exc:
            raise TripConflictError("Trip code already exists.") from exc

    def list_trips(
        self,
        *,
        status: TripStatus | None = None,
        current_user: dict[str, Any],
    ) -> list[dict[str, Any]]:
        role = current_user["role"]
        if role == UserRole.ADMIN:
            return self.trip_repository.list_trips(status=status)
        if role == UserRole.DRIVER:
            email = (current_user.get("email") or "").strip()
            if not email:
                return []
            user_id = str(current_user.get("user_id") or "")
            return self.trip_repository.list_trips_for_user(
                user_id=user_id,
                driver_email=email,
                status=status,
            )
        raise TripAccessDeniedError("Insufficient permissions for trips.")

    def start_my_trip(
        self,
        payload: StartMyTripRequest,
        *,
        current_user: dict[str, Any],
    ) -> dict[str, Any]:
        if current_user["role"] != UserRole.DRIVER:
            raise TripAccessDeniedError("Only drivers can start their own trip.")
        user_id = str(current_user.get("user_id") or "")
        email = (current_user.get("email") or "").strip()
        if not user_id or not email:
            raise TripAccessDeniedError("Driver identity is incomplete.")
        if self.trip_repository.find_active_trip_for_user(user_id=user_id, driver_email=email):
            raise TripConflictError("Driver already has an active trip.")
        try:
            trip = self.trip_repository.create_active_trip_for_user(
                code=payload.code,
                origin=payload.origin,
                destination=payload.destination,
                created_by=user_id,
            )
            trip["monitoring_session"] = self.trip_repository.ensure_active_monitoring_session(
                trip["trip_id"]
            )
            return trip
        except IntegrityError as exc:
            raise TripConflictError("Trip code already exists.") from exc

    def active_trip(self, *, current_user: dict[str, Any]) -> dict[str, Any] | None:
        role = current_user["role"]
        if role == UserRole.ADMIN:
            trips = self.trip_repository.list_trips(status=TripStatus.IN_PROGRESS)
            return trips[0] if trips else None
        if role == UserRole.DRIVER:
            trip = self.trip_repository.find_active_trip_for_user(
                user_id=str(current_user.get("user_id") or ""),
                driver_email=(current_user.get("email") or "").strip(),
            )
            if trip is not None:
                trip["monitoring_session"] = self.trip_repository.ensure_active_monitoring_session(
                    trip["trip_id"]
                )
            return trip
        raise TripAccessDeniedError("Insufficient permissions for trips.")

    def list_my_trips(self, *, current_user: dict[str, Any]) -> list[dict[str, Any]]:
        if current_user["role"] != UserRole.DRIVER:
            raise TripAccessDeniedError("Only drivers can list their own trips.")
        return self.trip_repository.list_trips_for_user(
            user_id=str(current_user.get("user_id") or ""),
            driver_email=(current_user.get("email") or "").strip(),
        )

    def get_trip(self, trip_id: str, *, current_user: dict[str, Any]) -> dict[str, Any]:
        trip = self._get_trip_or_raise(trip_id)
        self._ensure_can_read_trip(trip_id, current_user=current_user)
        return trip

    def schedule_trip(self, trip_id: str) -> dict[str, Any]:
        trip = self._get_trip_or_raise(trip_id)
        self._validate_transition(trip["status"], TripStatus.SCHEDULED)
        updated = self.trip_repository.update_trip_status(
            trip_id=trip_id,
            status=TripStatus.SCHEDULED,
        )
        if updated is None:
            raise TripNotFoundError("Trip not found.")
        return updated

    def assign_trip(self, trip_id: str, payload: TripAssignRequest) -> dict[str, Any]:
        trip = self._get_trip_or_raise(trip_id)
        self._validate_transition(trip["status"], TripStatus.ASSIGNED)
        if self.trip_repository.find_active_assignment_for_trip(trip_id) is not None:
            raise TripConflictError("Trip already has an active assignment.")

        driver = self.trip_repository.find_driver_by_id(payload.driver_id)
        if driver is None:
            raise TripConflictError("Driver not found.")
        if driver["status"] != DriverStatus.ACTIVE:
            raise TripConflictError("Driver must be active before assignment.")
        if self.trip_repository.driver_has_active_assignment(payload.driver_id):
            raise TripConflictError("Driver already has an active trip assignment.")

        vehicle = self.trip_repository.find_vehicle_by_id(payload.vehicle_id)
        if vehicle is None:
            raise TripConflictError("Vehicle not found.")
        if vehicle["status"] != VehicleStatus.AVAILABLE:
            raise TripConflictError("Vehicle must be available before assignment.")
        if self.trip_repository.vehicle_has_active_assignment(payload.vehicle_id):
            raise TripConflictError("Vehicle already has an active trip assignment.")

        try:
            assigned = self.trip_repository.assign_trip(
                trip_id=trip_id,
                driver_id=payload.driver_id,
                vehicle_id=payload.vehicle_id,
            )
        except IntegrityError as exc:
            raise TripConflictError("Trip assignment conflicts with an active assignment.") from exc
        if assigned is None:
            raise TripNotFoundError("Trip not found.")
        return assigned

    def start_trip(self, trip_id: str, *, current_user: dict[str, Any]) -> dict[str, Any]:
        trip = self._get_trip_or_raise(trip_id)
        self._validate_transition(trip["status"], TripStatus.IN_PROGRESS)
        assignment = self._active_assignment_or_conflict(trip_id)
        self._ensure_can_operate_active_assignment(assignment, current_user=current_user)
        if not self.trip_repository.driver_has_active_session(assignment["driver_id"]):
            raise TripConflictError("Driver must have an active session before starting a trip.")
        updated = self.trip_repository.start_trip(trip_id)
        if updated is None:
            raise TripNotFoundError("Trip not found.")
        return updated

    def complete_trip(self, trip_id: str, *, current_user: dict[str, Any]) -> dict[str, Any]:
        trip = self._get_trip_or_raise(trip_id)
        if trip["status"] != TripStatus.IN_PROGRESS:
            raise InvalidTripStateTransitionError(
                f"Cannot change trip status from {trip['status'].value} to completed."
            )
        self._ensure_can_operate_trip(trip_id, current_user=current_user)
        updated = self.trip_repository.complete_active_trip(trip_id)
        if updated is None:
            raise TripNotFoundError("Trip not found.")
        updated["safety_score"] = self.calculate_or_get_safety_score(trip_id)
        return updated

    def calculate_or_get_safety_score(self, trip_id: str) -> dict[str, Any]:
        self._get_trip_or_raise(trip_id)
        existing = self.trip_repository.find_safety_score(trip_id)
        if existing is not None:
            return existing
        counts = self.trip_repository.count_trip_safety_inputs(trip_id)
        score = calculate_safety_score(
            counts["alert_count"],
            counts["critical_events"],
        )
        grade = safety_grade(score)
        explanation = {
            "base_score": 100.0,
            "alert_count": counts["alert_count"],
            "total_events": counts["total_events"],
            "critical_events": counts["critical_events"],
            "warning_events": counts["warning_events"],
            "final_score": score,
            "grade": grade,
        }
        return self.trip_repository.create_safety_score(
            trip_id=trip_id,
            score=score,
            grade=grade,
            total_events=counts["total_events"],
            warning_events=counts["warning_events"],
            critical_events=counts["critical_events"],
            alert_count=counts["alert_count"],
            explanation=explanation,
        )

    def cancel_trip(self, trip_id: str, *, reason: str) -> dict[str, Any]:
        trip = self._get_trip_or_raise(trip_id)
        self._validate_transition(trip["status"], TripStatus.CANCELLED)
        updated = self.trip_repository.cancel_trip(trip_id=trip_id, reason=reason)
        if updated is None:
            raise TripNotFoundError("Trip not found.")
        return updated

    def abort_trip(self, trip_id: str, *, reason: str) -> dict[str, Any]:
        trip = self._get_trip_or_raise(trip_id)
        self._validate_transition(trip["status"], TripStatus.ABORTED)
        self._active_assignment_or_conflict(trip_id)
        updated = self.trip_repository.abort_trip(trip_id=trip_id, reason=reason)
        if updated is None:
            raise TripNotFoundError("Trip not found.")
        return updated

    def _get_trip_or_raise(self, trip_id: str) -> dict[str, Any]:
        trip = self.trip_repository.find_by_id(trip_id)
        if trip is None:
            raise TripNotFoundError("Trip not found.")
        return trip

    def _validate_transition(self, current: TripStatus, requested: TripStatus) -> None:
        if requested not in ALLOWED_TRANSITIONS[current]:
            raise InvalidTripStateTransitionError(
                f"Cannot change trip status from {current.value} to {requested.value}."
            )

    def _active_assignment_or_conflict(self, trip_id: str) -> dict[str, Any]:
        assignment = self.trip_repository.find_active_assignment_for_trip(trip_id)
        if assignment is None:
            raise TripConflictError("Trip requires an active driver and vehicle assignment.")
        return assignment

    def _ensure_can_read_trip(self, trip_id: str, *, current_user: dict[str, Any]) -> None:
        role = current_user["role"]
        if role == UserRole.ADMIN:
            return
        if role == UserRole.DRIVER:
            email = (current_user.get("email") or "").strip()
            user_id = str(current_user.get("user_id") or "")
            if email and self.trip_repository.driver_owns_trip(
                trip_id=trip_id,
                user_id=user_id,
                driver_email=email,
            ):
                return
        raise TripAccessDeniedError("Insufficient permissions for this trip.")

    def _ensure_can_operate_trip(self, trip_id: str, *, current_user: dict[str, Any]) -> None:
        role = current_user["role"]
        if role == UserRole.ADMIN:
            return
        if role == UserRole.DRIVER and self.trip_repository.driver_owns_trip(
            trip_id=trip_id,
            user_id=str(current_user.get("user_id") or ""),
            driver_email=(current_user.get("email") or "").strip(),
        ):
            return
        raise TripAccessDeniedError("Insufficient permissions for this trip.")

    def _ensure_can_operate_active_assignment(
        self,
        assignment: dict[str, Any],
        *,
        current_user: dict[str, Any],
    ) -> None:
        role = current_user["role"]
        if role == UserRole.ADMIN:
            return
        if role == UserRole.DRIVER:
            email = (current_user.get("email") or "").strip()
            assigned_driver = self.trip_repository.find_driver_by_id(assignment["driver_id"])
            assigned_driver_email = (assigned_driver or {}).get("email") or ""
            if email and assigned_driver_email.strip().lower() == email.lower():
                return
        raise TripAccessDeniedError("Insufficient permissions for this trip.")
