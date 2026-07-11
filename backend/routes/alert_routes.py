from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from backend.auth.dependencies import get_current_user
from backend.models.schemas import AlertCreate
from backend.services.alert_service import (
    create_alert,
    get_alerts as list_filtered_alerts,
    get_trip_alerts,
)

router=APIRouter(
    tags=["Alerts"]
)


def _validate_trip_id(trip_id: str) -> str:
    try:
        return str(UUID(trip_id))
    except ValueError:
        raise HTTPException(status_code=422, detail="trip_id must be a valid UUID") from None


@router.post("/alerts")
def save_alert(
    alert:AlertCreate
):

    try:
        event=create_alert(
            trip_id=alert.trip_id,
            alert_type=alert.alert_type,
            detection_method=alert.detection_method,
            severity=alert.severity,
            ear_value=alert.ear_value,
            consecutive_frame_count=alert.consecutive_frame_count,
            cnn_confidence=alert.cnn_confidence,
            cnn_label=alert.cnn_label,
            alarm_triggered=alert.alarm_triggered,
            captured_frame_path=alert.captured_frame_path,
            latitude=alert.latitude,
            longitude=alert.longitude,
            alarm_audio_file=alert.alarm_audio_file
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return {
        "alert_id":event
    }


@router.get("/trips/{trip_id}/alerts")
def get_alerts(
    trip_id:str,
    current_user: dict = Depends(get_current_user),
):
    normalized_trip_id = _validate_trip_id(trip_id)
    role = current_user.get("role")
    role_value = getattr(role, "value", role)
    if role_value == "admin":
        return get_trip_alerts(normalized_trip_id)

    return list_filtered_alerts(
        trip_id=normalized_trip_id,
        current_user=current_user,
    )


@router.get("/alerts")
def list_alerts(
    trip_id: str | None = Query(default=None),
    driver_id: str | None = Query(default=None),
    severity: str | None = Query(default=None),
    alert_type: str | None = Query(default=None),
    status: str | None = Query(default=None),
    current_user: dict = Depends(get_current_user),
):
    normalized_trip_id = _validate_trip_id(trip_id) if trip_id else None
    normalized_driver_id = _validate_trip_id(driver_id) if driver_id else None
    return list_filtered_alerts(
        trip_id=normalized_trip_id,
        driver_id=normalized_driver_id,
        severity=severity,
        alert_type=alert_type,
        status=status,
        current_user=current_user,
    )
