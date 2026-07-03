from fastapi import APIRouter
from services.trip_service import *

router=APIRouter(
    tags=["Trips"]
)


@router.post("/trips/start")
def create_trip(driver_id:str):

    trip=start_trip(driver_id)

    return {
        "success":True,
        "trip_id":trip
    }


@router.put("/trips/{trip_id}/end")
def finish_trip(trip_id:str):

    return end_trip(trip_id)