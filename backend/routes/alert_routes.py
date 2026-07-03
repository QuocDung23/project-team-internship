from fastapi import APIRouter
from services.alert_service import *
from models.schemas import AlertCreate

router=APIRouter(
    tags=["Alerts"]
)


@router.post("/alerts")
def save_alert(
    alert:AlertCreate
):

    event=create_alert(
        alert.trip_id,
        alert.alert_type,
        alert.method
    )

    return {
        "event_id":event
    }


@router.get("/trips/{trip_id}/alerts")
def get_alerts(
    trip_id:str
):

    return get_trip_alerts(
        trip_id
    )