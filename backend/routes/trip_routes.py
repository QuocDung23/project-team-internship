from typing import Optional

from fastapi import APIRouter
from services.trip_service import *
from models.schemas import TripStart

router = APIRouter(
    tags=["Trips"]
)


@router.post("/trips/start")
def create_trip(trip: TripStart):

    trip_id = start_trip(trip.driver_id, trip.vehicle_plate)

    return {
        "success": True,
        "trip_id": trip_id
    }


@router.put("/trips/{trip_id}/end")
def finish_trip(trip_id: str):

    return end_trip(trip_id)


@router.get("/trips/{trip_id}")
def trip_detail(trip_id: str):

    return get_trip(trip_id)


@router.get("/trips")
def list_trips(
    driver_id: Optional[str] = None,
    status: Optional[str] = None
):

    return get_trips(driver_id, status)
