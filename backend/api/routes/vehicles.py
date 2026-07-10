from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from backend.auth.dependencies import get_current_user, require_roles
from backend.auth.roles import UserRole
from backend.models.vehicle import (
    VehicleAvailabilityUpdate,
    VehicleCreate,
    VehicleListResponse,
    VehicleResponse,
    VehicleStatus,
    VehicleUpdate,
)
from backend.services.vehicle_service import (
    InvalidVehicleStatusError,
    VehicleAccessDeniedError,
    VehicleConflictError,
    VehicleNotFoundError,
    VehicleService,
)


router = APIRouter(prefix="/vehicles", tags=["vehicles"])


def get_vehicle_service() -> VehicleService:
    return VehicleService()


def _not_found(exc: Exception) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


def _forbidden(exc: Exception) -> HTTPException:
    return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))


def _conflict(exc: Exception) -> HTTPException:
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))


@router.post("", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
def create_vehicle(
    payload: VehicleCreate,
    _current_user: dict = Depends(require_roles(UserRole.ADMIN, UserRole.DISPATCHER)),
    service: VehicleService = Depends(get_vehicle_service),
) -> VehicleResponse:
    try:
        return VehicleResponse(**service.create_vehicle(payload))
    except VehicleConflictError as exc:
        raise _conflict(exc) from None


@router.get("", response_model=VehicleListResponse)
def list_vehicles(
    status_filter: VehicleStatus | None = Query(default=None, alias="status"),
    _current_user: dict = Depends(require_roles(UserRole.ADMIN, UserRole.DISPATCHER)),
    service: VehicleService = Depends(get_vehicle_service),
) -> VehicleListResponse:
    return VehicleListResponse(vehicles=service.list_vehicles(status=status_filter))


@router.get("/{vehicle_id}", response_model=VehicleResponse)
def read_vehicle(
    vehicle_id: str,
    current_user: dict = Depends(get_current_user),
    service: VehicleService = Depends(get_vehicle_service),
) -> VehicleResponse:
    try:
        return VehicleResponse(**service.get_vehicle(vehicle_id, current_user=current_user))
    except VehicleNotFoundError as exc:
        raise _not_found(exc) from None
    except VehicleAccessDeniedError as exc:
        raise _forbidden(exc) from None


@router.patch("/{vehicle_id}", response_model=VehicleResponse)
def update_vehicle(
    vehicle_id: str,
    payload: VehicleUpdate,
    _current_user: dict = Depends(require_roles(UserRole.ADMIN, UserRole.DISPATCHER)),
    service: VehicleService = Depends(get_vehicle_service),
) -> VehicleResponse:
    try:
        return VehicleResponse(**service.update_vehicle(vehicle_id, payload))
    except VehicleNotFoundError as exc:
        raise _not_found(exc) from None
    except (VehicleConflictError, InvalidVehicleStatusError) as exc:
        raise _conflict(exc) from None


@router.patch("/{vehicle_id}/availability", response_model=VehicleResponse)
def update_vehicle_availability(
    vehicle_id: str,
    payload: VehicleAvailabilityUpdate,
    _current_user: dict = Depends(require_roles(UserRole.ADMIN, UserRole.DISPATCHER)),
    service: VehicleService = Depends(get_vehicle_service),
) -> VehicleResponse:
    try:
        return VehicleResponse(**service.update_availability(vehicle_id, payload.status))
    except VehicleNotFoundError as exc:
        raise _not_found(exc) from None
    except InvalidVehicleStatusError as exc:
        raise _conflict(exc) from None


@router.delete("/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vehicle(
    vehicle_id: str,
    _current_user: dict = Depends(require_roles(UserRole.ADMIN, UserRole.DISPATCHER)),
    service: VehicleService = Depends(get_vehicle_service),
) -> Response:
    try:
        service.delete_vehicle(vehicle_id)
    except VehicleNotFoundError as exc:
        raise _not_found(exc) from None
    except VehicleConflictError as exc:
        raise _conflict(exc) from None
    return Response(status_code=status.HTTP_204_NO_CONTENT)
