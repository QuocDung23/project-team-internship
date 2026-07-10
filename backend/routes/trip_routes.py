from typing import Optional

from fastapi import APIRouter, Body, HTTPException, Query
from models.schemas import TripStart
from services.trip_service import (
    end_trip,
    get_active_trips,
    get_trip,
    get_trip_settings,
    get_trips,
    start_trip,
)

router=APIRouter(
    tags=["Trips"]
)


@router.post("/trips/start")
def create_trip(
    trip: Optional[TripStart]=Body(default=None),
    driver_id: Optional[str]=Query(default=None),
):
    resolved_driver_id = trip.driver_id if trip else driver_id
    vehicle_plate = trip.vehicle_plate if trip else None
    if not resolved_driver_id:
        raise HTTPException(status_code=422, detail="driver_id is required")

    trip_id=start_trip(resolved_driver_id, vehicle_plate=vehicle_plate)

    return {
        "success":True,
        "trip_id":trip_id
    }


@router.put("/trips/{trip_id}/end")
def finish_trip(trip_id:str):
    return end_trip(trip_id)


@router.get("/trips")
def list_trips():
    return {"trips": get_trips()}


@router.get("/trips/active")
def list_active_trips():
    return {"trips": get_active_trips()}


@router.get("/trips/{trip_id}")
def read_trip(trip_id:str):
    trip=get_trip(trip_id)
    if trip is None:
        raise HTTPException(status_code=404, detail="trip not found")
    return trip


@router.get("/trips/{trip_id}/settings")
def read_trip_settings(trip_id:str):
    settings=get_trip_settings(trip_id)
    if settings is None:
        raise HTTPException(status_code=404, detail="trip settings not found")
    return settings
