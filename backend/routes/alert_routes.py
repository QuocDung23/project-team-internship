from typing import Optional

from fastapi import APIRouter
from services.alert_service import *
from models.schemas import AlertCreate

router = APIRouter(
    tags=["Alerts"]
)


@router.post("/alerts")
def save_alert(
    alert: AlertCreate
):

    event = create_alert(
        alert.trip_id,
        alert.alert_type,
        alert.method,
        alert.severity,
        alert.ear_value,
        alert.consecutive_frame_count,
        alert.cnn_confidence,
        alert.cnn_label
    )

    return {
        "event_id": event
    }


@router.get("/trips/{trip_id}/alerts")
def get_alerts(
    trip_id: str
):

    return get_trip_alerts(
        trip_id
    )


@router.get("/alerts")
def list_alerts(
    driver_id: Optional[str] = None,
    alert_type: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = 100
):

    return get_all_alerts(
        driver_id,
        alert_type,
        severity,
        limit
    )
