from backend.auth.roles import UserRole
from backend.models.safety_event import SafetyEventIngestRequest
from backend.repositories.safety_event_repository import (
    DuplicateSafetyEventError,
    SafetyEventRepository,
)
from backend.services.safety_policy import aggregation_kind, pair_window_seconds


class SafetyEventDuplicateError(Exception):
    pass


class SafetyEventReferenceError(Exception):
    pass


class SafetyEventService:
    def __init__(self, repository: SafetyEventRepository | None = None):
        self.repository = repository or SafetyEventRepository()

    def ingest(self, payload: SafetyEventIngestRequest, *, current_user: dict | None = None) -> dict:
        self._validate_references(payload, current_user=current_user)
        kind = aggregation_kind(payload.event_type)

        try:
            return self.repository.ingest_event(
                payload.model_dump(mode="json"),
                aggregation_kind=kind,
                aggregation_window_seconds=pair_window_seconds(kind) if kind else None,
            )
        except DuplicateSafetyEventError as exc:
            raise SafetyEventDuplicateError(f"event_id already ingested: {payload.event_id}") from exc

    def _validate_references(
        self,
        payload: SafetyEventIngestRequest,
        *,
        current_user: dict | None = None,
    ) -> None:
        if payload.trip_id is None:
            raise SafetyEventReferenceError("trip_id is required")
        if not self.repository.trip_exists(payload.trip_id):
            raise SafetyEventReferenceError("trip_id not found")
        if not self.repository.active_trip_exists(payload.trip_id):
            raise SafetyEventReferenceError("trip is not active")
        if payload.monitoring_session_id is not None and not self.repository.monitoring_session_belongs_to_trip(
            monitoring_session_id=payload.monitoring_session_id,
            trip_id=payload.trip_id,
        ):
            raise SafetyEventReferenceError("monitoring_session_id does not belong to active trip")
        if current_user is not None and current_user["role"] == UserRole.DRIVER:
            if not self.repository.driver_owns_active_trip(
                trip_id=payload.trip_id,
                user_id=str(current_user.get("user_id") or ""),
                driver_email=(current_user.get("email") or "").strip(),
            ):
                raise SafetyEventReferenceError("driver cannot ingest for this trip")
        if payload.driver_id is not None and not self.repository.driver_exists(payload.driver_id):
            raise SafetyEventReferenceError("driver_id not found")
        if payload.vehicle_id is not None and not self.repository.vehicle_exists(payload.vehicle_id):
            raise SafetyEventReferenceError("vehicle_id not found")
