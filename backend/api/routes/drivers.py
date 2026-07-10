from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from backend.auth.dependencies import get_current_user, require_roles
from backend.auth.roles import UserRole
from backend.models.driver import (
    DriverCheckInRequest,
    DriverCheckOutRequest,
    DriverCreate,
    DriverListResponse,
    DriverResponse,
    DriverSessionListResponse,
    DriverSessionResponse,
    DriverStatus,
    DriverUpdate,
)
from backend.services.driver_service import (
    ActiveDriverSessionError,
    DriverAccessDeniedError,
    DriverConflictError,
    DriverNotFoundError,
    DriverService,
    InvalidDriverStatusTransitionError,
    NoActiveDriverSessionError,
)


router = APIRouter(prefix="/drivers", tags=["drivers"])


def get_driver_service() -> DriverService:
    return DriverService()


def _not_found(exc: Exception) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


def _forbidden(exc: Exception) -> HTTPException:
    return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))


def _conflict(exc: Exception) -> HTTPException:
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))


@router.post(
    "",
    response_model=DriverResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_driver(
    payload: DriverCreate,
    _current_user: dict = Depends(require_roles(UserRole.ADMIN, UserRole.DISPATCHER)),
    service: DriverService = Depends(get_driver_service),
) -> DriverResponse:
    try:
        return DriverResponse(**service.create_driver(payload))
    except DriverConflictError as exc:
        raise _conflict(exc) from None


@router.get("", response_model=DriverListResponse)
def list_drivers(
    status_filter: DriverStatus | None = Query(default=None, alias="status"),
    _current_user: dict = Depends(require_roles(UserRole.ADMIN, UserRole.DISPATCHER)),
    service: DriverService = Depends(get_driver_service),
) -> DriverListResponse:
    return DriverListResponse(drivers=service.list_drivers(status=status_filter))


@router.get("/me", response_model=DriverResponse)
def read_my_driver_profile(
    current_user: dict = Depends(get_current_user),
    service: DriverService = Depends(get_driver_service),
) -> DriverResponse:
    try:
        return DriverResponse(**service.get_my_driver_profile(current_user=current_user))
    except DriverNotFoundError as exc:
        raise _not_found(exc) from None
    except DriverAccessDeniedError as exc:
        raise _forbidden(exc) from None


@router.get("/{driver_id}", response_model=DriverResponse)
def read_driver(
    driver_id: str,
    current_user: dict = Depends(get_current_user),
    service: DriverService = Depends(get_driver_service),
) -> DriverResponse:
    try:
        return DriverResponse(**service.get_driver(driver_id, current_user=current_user))
    except DriverNotFoundError as exc:
        raise _not_found(exc) from None
    except DriverAccessDeniedError as exc:
        raise _forbidden(exc) from None


@router.patch("/{driver_id}", response_model=DriverResponse)
def update_driver(
    driver_id: str,
    payload: DriverUpdate,
    _current_user: dict = Depends(require_roles(UserRole.ADMIN, UserRole.DISPATCHER)),
    service: DriverService = Depends(get_driver_service),
) -> DriverResponse:
    try:
        return DriverResponse(**service.update_driver(driver_id, payload))
    except DriverNotFoundError as exc:
        raise _not_found(exc) from None
    except (DriverConflictError, InvalidDriverStatusTransitionError) as exc:
        raise _conflict(exc) from None


@router.delete("/{driver_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_driver(
    driver_id: str,
    _current_user: dict = Depends(require_roles(UserRole.ADMIN, UserRole.DISPATCHER)),
    service: DriverService = Depends(get_driver_service),
) -> Response:
    try:
        service.delete_driver(driver_id)
    except DriverNotFoundError as exc:
        raise _not_found(exc) from None
    except DriverConflictError as exc:
        raise _conflict(exc) from None
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{driver_id}/check-in", response_model=DriverSessionResponse)
def check_in_driver(
    driver_id: str,
    payload: DriverCheckInRequest,
    current_user: dict = Depends(get_current_user),
    service: DriverService = Depends(get_driver_service),
) -> DriverSessionResponse:
    try:
        return DriverSessionResponse(
            **service.check_in(
                driver_id=driver_id,
                device_label=payload.device_label,
                notes=payload.notes,
                current_user=current_user,
            )
        )
    except DriverNotFoundError as exc:
        raise _not_found(exc) from None
    except DriverAccessDeniedError as exc:
        raise _forbidden(exc) from None
    except (ActiveDriverSessionError, InvalidDriverStatusTransitionError) as exc:
        raise _conflict(exc) from None


@router.post("/{driver_id}/check-out", response_model=DriverSessionResponse)
def check_out_driver(
    driver_id: str,
    payload: DriverCheckOutRequest | None = None,
    current_user: dict = Depends(get_current_user),
    service: DriverService = Depends(get_driver_service),
) -> DriverSessionResponse:
    try:
        return DriverSessionResponse(
            **service.check_out(
                driver_id=driver_id,
                notes=payload.notes if payload else None,
                current_user=current_user,
            )
        )
    except DriverNotFoundError as exc:
        raise _not_found(exc) from None
    except DriverAccessDeniedError as exc:
        raise _forbidden(exc) from None
    except NoActiveDriverSessionError as exc:
        raise _conflict(exc) from None


@router.get("/{driver_id}/sessions", response_model=DriverSessionListResponse)
def list_driver_sessions(
    driver_id: str,
    current_user: dict = Depends(get_current_user),
    service: DriverService = Depends(get_driver_service),
) -> DriverSessionListResponse:
    try:
        return DriverSessionListResponse(
            sessions=service.list_sessions(driver_id=driver_id, current_user=current_user)
        )
    except DriverNotFoundError as exc:
        raise _not_found(exc) from None
    except DriverAccessDeniedError as exc:
        raise _forbidden(exc) from None
