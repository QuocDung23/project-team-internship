from uuid import UUID

from fastapi import APIRouter, HTTPException
from backend.models.schemas import AlertCreate
from backend.services.alert_service import create_alert, get_trip_alerts

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
    trip_id:str
):
    normalized_trip_id = _validate_trip_id(trip_id)

    return get_trip_alerts(
        normalized_trip_id
    )
