from fastapi import APIRouter, HTTPException
from services.alert_service import *
from models.schemas import AlertCreate

router=APIRouter(
    tags=["Alerts"]
)


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

    return get_trip_alerts(
        trip_id
    )
