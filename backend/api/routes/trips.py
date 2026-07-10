from fastapi import APIRouter, Depends, HTTPException, Query, status

from backend.auth.dependencies import get_current_user, require_roles
from backend.auth.roles import UserRole
from backend.models.trip import (
    TripAbortRequest,
    TripAssignRequest,
    TripCancelRequest,
    TripCreate,
    TripListResponse,
    TripResponse,
    TripStatus,
)
from backend.services.trip_lifecycle_service import (
    InvalidTripStateTransitionError,
    TripAccessDeniedError,
    TripConflictError,
    TripLifecycleService,
    TripNotFoundError,
)


router = APIRouter(prefix="/trips", tags=["trips"])


def get_trip_lifecycle_service() -> TripLifecycleService:
    return TripLifecycleService()


def _not_found(exc: Exception) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


def _forbidden(exc: Exception) -> HTTPException:
    return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))


def _conflict(exc: Exception) -> HTTPException:
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))


@router.post("", response_model=TripResponse, status_code=status.HTTP_201_CREATED)
def create_trip(
    payload: TripCreate,
    current_user: dict = Depends(require_roles(UserRole.ADMIN, UserRole.DISPATCHER)),
    service: TripLifecycleService = Depends(get_trip_lifecycle_service),
) -> TripResponse:
    try:
        return TripResponse(**service.create_trip(payload, current_user=current_user))
    except TripConflictError as exc:
        raise _conflict(exc) from None


@router.get("", response_model=TripListResponse)
def list_trips(
    status_filter: TripStatus | None = Query(default=None, alias="status"),
    current_user: dict = Depends(get_current_user),
    service: TripLifecycleService = Depends(get_trip_lifecycle_service),
) -> TripListResponse:
    try:
        return TripListResponse(
            trips=service.list_trips(status=status_filter, current_user=current_user)
        )
    except TripAccessDeniedError as exc:
        raise _forbidden(exc) from None


@router.get("/{trip_id}", response_model=TripResponse)
def read_trip(
    trip_id: str,
    current_user: dict = Depends(get_current_user),
    service: TripLifecycleService = Depends(get_trip_lifecycle_service),
) -> TripResponse:
    try:
        return TripResponse(**service.get_trip(trip_id, current_user=current_user))
    except TripNotFoundError as exc:
        raise _not_found(exc) from None
    except TripAccessDeniedError as exc:
        raise _forbidden(exc) from None


@router.post("/{trip_id}/schedule", response_model=TripResponse)
def schedule_trip(
    trip_id: str,
    _current_user: dict = Depends(require_roles(UserRole.ADMIN, UserRole.DISPATCHER)),
    service: TripLifecycleService = Depends(get_trip_lifecycle_service),
) -> TripResponse:
    try:
        return TripResponse(**service.schedule_trip(trip_id))
    except TripNotFoundError as exc:
        raise _not_found(exc) from None
    except InvalidTripStateTransitionError as exc:
        raise _conflict(exc) from None


@router.post("/{trip_id}/assign", response_model=TripResponse)
def assign_trip(
    trip_id: str,
    payload: TripAssignRequest,
    _current_user: dict = Depends(require_roles(UserRole.ADMIN, UserRole.DISPATCHER)),
    service: TripLifecycleService = Depends(get_trip_lifecycle_service),
) -> TripResponse:
    try:
        return TripResponse(**service.assign_trip(trip_id, payload))
    except TripNotFoundError as exc:
        raise _not_found(exc) from None
    except (TripConflictError, InvalidTripStateTransitionError) as exc:
        raise _conflict(exc) from None


@router.post("/{trip_id}/start", response_model=TripResponse)
def start_trip(
    trip_id: str,
    current_user: dict = Depends(get_current_user),
    service: TripLifecycleService = Depends(get_trip_lifecycle_service),
) -> TripResponse:
    try:
        return TripResponse(**service.start_trip(trip_id, current_user=current_user))
    except TripNotFoundError as exc:
        raise _not_found(exc) from None
    except TripAccessDeniedError as exc:
        raise _forbidden(exc) from None
    except (TripConflictError, InvalidTripStateTransitionError) as exc:
        raise _conflict(exc) from None


@router.post("/{trip_id}/complete", response_model=TripResponse)
def complete_trip(
    trip_id: str,
    current_user: dict = Depends(get_current_user),
    service: TripLifecycleService = Depends(get_trip_lifecycle_service),
) -> TripResponse:
    try:
        return TripResponse(**service.complete_trip(trip_id, current_user=current_user))
    except TripNotFoundError as exc:
        raise _not_found(exc) from None
    except TripAccessDeniedError as exc:
        raise _forbidden(exc) from None
    except (TripConflictError, InvalidTripStateTransitionError) as exc:
        raise _conflict(exc) from None


@router.post("/{trip_id}/cancel", response_model=TripResponse)
def cancel_trip(
    trip_id: str,
    payload: TripCancelRequest,
    _current_user: dict = Depends(require_roles(UserRole.ADMIN, UserRole.DISPATCHER)),
    service: TripLifecycleService = Depends(get_trip_lifecycle_service),
) -> TripResponse:
    try:
        return TripResponse(**service.cancel_trip(trip_id, reason=payload.reason))
    except TripNotFoundError as exc:
        raise _not_found(exc) from None
    except InvalidTripStateTransitionError as exc:
        raise _conflict(exc) from None


@router.post("/{trip_id}/abort", response_model=TripResponse)
def abort_trip(
    trip_id: str,
    payload: TripAbortRequest,
    _current_user: dict = Depends(require_roles(UserRole.ADMIN, UserRole.DISPATCHER)),
    service: TripLifecycleService = Depends(get_trip_lifecycle_service),
) -> TripResponse:
    try:
        return TripResponse(**service.abort_trip(trip_id, reason=payload.reason))
    except TripNotFoundError as exc:
        raise _not_found(exc) from None
    except (TripConflictError, InvalidTripStateTransitionError) as exc:
        raise _conflict(exc) from None
