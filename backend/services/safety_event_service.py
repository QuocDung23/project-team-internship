from backend.models.safety_event import (
    SafetyEventIngestRequest,
    SafetyEventSeverity,
)
from backend.repositories.safety_event_repository import (
    DuplicateSafetyEventError,
    SafetyEventRepository,
)


class SafetyEventDuplicateError(Exception):
    pass


class SafetyEventReferenceError(Exception):
    pass


class SafetyEventService:
    def __init__(self, repository: SafetyEventRepository | None = None):
        self.repository = repository or SafetyEventRepository()

    def ingest(self, payload: SafetyEventIngestRequest) -> dict:
        self._validate_references(payload)
        create_alert = payload.severity == SafetyEventSeverity.HIGH

        try:
            return self.repository.ingest_event(
                payload.model_dump(mode="json"),
                create_alert=create_alert,
            )
        except DuplicateSafetyEventError as exc:
            raise SafetyEventDuplicateError(f"event_id already ingested: {payload.event_id}") from exc

    def _validate_references(self, payload: SafetyEventIngestRequest) -> None:
        if payload.trip_id is not None and not self.repository.trip_exists(payload.trip_id):
            raise SafetyEventReferenceError("trip_id not found")
        if payload.driver_id is not None and not self.repository.driver_exists(payload.driver_id):
            raise SafetyEventReferenceError("driver_id not found")
        if payload.vehicle_id is not None and not self.repository.vehicle_exists(payload.vehicle_id):
            raise SafetyEventReferenceError("vehicle_id not found")
