from fastapi import APIRouter, Depends, HTTPException, status

from backend.auth.dependencies import get_current_user
from backend.auth.roles import UserRole
from backend.models.safety_event import SafetyEventIngestRequest, SafetyEventIngestResponse
from backend.services.safety_event_service import (
    SafetyEventDuplicateError,
    SafetyEventReferenceError,
    SafetyEventService,
)


router = APIRouter(prefix="/safety-events", tags=["safety-events"])


def get_safety_event_service() -> SafetyEventService:
    return SafetyEventService()


@router.post(
    "/ingest",
    response_model=SafetyEventIngestResponse,
    status_code=status.HTTP_201_CREATED,
)
def ingest_safety_event(
    payload: SafetyEventIngestRequest,
    current_user: dict = Depends(get_current_user),
    service: SafetyEventService = Depends(get_safety_event_service),
) -> SafetyEventIngestResponse:
    if current_user["role"] not in {UserRole.ADMIN, UserRole.DRIVER}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions.")
    try:
        return SafetyEventIngestResponse(**service.ingest(payload, current_user=current_user))
    except SafetyEventDuplicateError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from None
    except SafetyEventReferenceError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from None
